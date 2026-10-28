/**
 * Pure claim rules. evaluate(claim, payer, ctx) => RuleResult[]
 * No side effects; the Billing card recalculates on every render.
 */
import { PAYER_RULES } from '../mocks/fixtures';
import type { Claim, ClaimLine, Payer, RuleResult } from '../store/types';

export interface RuleContext {
  sessionNo?: number;
  payerRejected?: boolean;
}

export function evaluate(claim: Claim, payer: Payer, ctx: RuleContext = {}): RuleResult[] {
  const rules = PAYER_RULES[payer];
  const out: RuleResult[] = [];
  const dx = claim.lines.filter((l) => l.kind === 'dx');
  const px = claim.lines.filter((l) => l.kind === 'px');
  const dxIds = new Set(dx.map((l) => l.id));

  // 1. Procedure with no supporting diagnosis
  for (const l of px) {
    const linked = l.linkedDxIds.filter((id) => dxIds.has(id));
    if (linked.length === 0) {
      out.push({
        id: `px-no-dx:${l.id}`,
        rule: 'px-no-dx',
        severity: 'error',
        title: `${l.code} has no supporting diagnosis`,
        reason: 'Payers deny procedures that are not linked to a diagnosis on the same claim (medical necessity).',
        evidence: dx.length
          ? `Transcript supports ${dx[0].code} (${dx[0].description}) for this procedure.`
          : 'No diagnosis is coded on this claim yet.',
        fix: dx.length ? { label: `Link to ${dx[0].code}`, type: 'link_dx', lineId: l.id, dxId: dx[0].id } : undefined,
      });
    }
  }

  // 2. No match in code set
  for (const l of claim.lines) {
    if (l.match === 'none') {
      out.push({
        id: `no-match:${l.id}`,
        rule: 'no-match',
        severity: 'error',
        title: `${l.code} has no match in ${l.system}`,
        reason: 'The code could not be matched to the payer code set and will be rejected by NPHIES.',
        evidence: 'Code set lookup returned no result.',
        fix: { label: 'Remove line', type: 'remove_line', lineId: l.id },
      });
    }
  }

  // 3. Duplicates
  const seen = new Map<string, ClaimLine>();
  for (const l of claim.lines) {
    const first = seen.get(l.code);
    if (first) {
      out.push({
        id: `duplicate:${l.id}`,
        rule: 'duplicate',
        severity: 'warning',
        title: `${l.code} is coded twice`,
        reason: 'Duplicate lines are rejected unless units are combined on one line.',
        evidence: `Same code as the line "${first.description}".`,
        fix: { label: 'Remove duplicate', type: 'remove_line', lineId: l.id },
      });
    } else seen.set(l.code, l);
  }

  // 4. Bundling conflicts
  for (const [a, b] of rules.bundling) {
    const la = px.find((l) => l.code === a);
    const lb = px.find((l) => l.code === b);
    if (la && lb) {
      out.push({
        id: `bundling:${a}:${b}`,
        rule: 'bundling',
        severity: 'error',
        title: `${a} and ${b} cannot be billed together`,
        reason: `${b} is bundled into ${a} under this payer's rules.`,
        evidence: 'Both lines are on the same date of service.',
        fix: { label: `Remove ${b}`, type: 'remove_line', lineId: lb.id },
      });
    }
  }

  // 5. Pre-authorisation
  const needsAuth = px.filter((l) => rules.preAuthCodes.includes(l.code));
  if (needsAuth.length && claim.preAuth !== 'approved') {
    out.push({
      id: 'preauth',
      rule: 'preauth',
      severity: 'error',
      title: `Pre-authorisation required for ${needsAuth.map((l) => l.code).join(', ')}`,
      reason: 'This payer requires approval before these procedures are billed.',
      evidence: claim.preAuth === 'requested' ? 'Request sent, awaiting payer.' : 'No approval on file for this encounter.',
      fix: { label: 'Request pre-auth', type: 'request_preauth' },
    });
  }

  // 6. Documentation: functional outcome measure
  const needsOutcome = px.some((l) => rules.requiresOutcomeMeasureFor.includes(l.code));
  if (needsOutcome && !claim.docs.outcomeMeasure) {
    out.push({
      id: 'doc-outcome',
      rule: 'doc-outcome',
      severity: 'warning',
      title: 'Functional outcome measure not documented',
      reason: 'Therapeutic procedures need a standard outcome score (for example ODI) to show progress.',
      evidence: 'Transcript mentions improved lumbar flexion but no scored measure.',
      fix: { label: 'Add ODI score from session', type: 'add_outcome' },
    });
  }

  // 7. Session cap (informational)
  if (ctx.sessionNo && ctx.sessionNo > rules.sessionCap) {
    out.push({
      id: 'cap',
      rule: 'cap',
      severity: 'info',
      title: `Session ${ctx.sessionNo} exceeds the payer cap of ${rules.sessionCap}`,
      reason: 'Sessions above the cap need an extension request.',
      evidence: 'Plan of care count.',
    });
  }

  // 8. Payer-side rejection (from a prior submission)
  if (ctx.payerRejected && !claim.docs.eligibilityReverified) {
    out.push({
      id: 'eligibility',
      rule: 'eligibility',
      severity: 'error',
      title: 'Member eligibility lapsed on the date of service',
      reason: 'The payer rejected the claim: coverage must be re-verified before resubmission.',
      evidence: 'NPHIES response code ELG-104.',
      fix: { label: 'Re-verify eligibility', type: 'reverify' },
    });
  }

  return out;
}

/** Items that block submission (shown in Active Denial Loop). */
export const denialItems = (results: RuleResult[]) => results.filter((r) => r.severity !== 'info');

/** Claims readiness: 100 minus weighted issues; 2 issues (1 error + 1 warning) = 78.4. */
export function readinessScore(claim: Claim, results: RuleResult[]): number {
  if (claim.lines.length === 0) return 20;
  const errors = results.filter((r) => r.severity === 'error').length;
  const warnings = results.filter((r) => r.severity === 'warning').length;
  const raw = 100 - errors * 14.6 - warnings * 7;
  return Math.max(5, Math.min(100, Math.round(raw * 10) / 10));
}

/** Diagnosis support confidence: mean confidence of diagnosis lines, lowered by unlinked procedures. */
export function dxSupportConfidence(claim: Claim, results: RuleResult[]): number {
  const dx = claim.lines.filter((l) => l.kind === 'dx');
  if (!dx.length) return 0;
  const mean = dx.reduce((s, l) => s + l.confidence, 0) / dx.length;
  const unlinked = results.filter((r) => r.rule === 'px-no-dx').length;
  return Math.max(0, Math.round((mean * 100 - unlinked * 2.1) * 10) / 10);
}

export const claimTotal = (claim: Claim) => claim.lines.reduce((s, l) => s + l.amountAed, 0);

/** Apply a fix to a claim, returning a new claim (pure). */
export function applyFix(claim: Claim, fix: NonNullable<RuleResult['fix']>): Claim {
  switch (fix.type) {
    case 'link_dx':
      return {
        ...claim,
        lines: claim.lines.map((l) =>
          l.id === fix.lineId && fix.dxId ? { ...l, linkedDxIds: [...l.linkedDxIds, fix.dxId], match: 'matched' } : l,
        ),
      };
    case 'remove_line':
      return {
        ...claim,
        lines: claim.lines
          .filter((l) => l.id !== fix.lineId)
          .map((l) => ({ ...l, linkedDxIds: l.linkedDxIds.filter((id) => id !== fix.lineId) })),
      };
    case 'add_outcome':
      return { ...claim, docs: { ...claim.docs, outcomeMeasure: true } };
    case 'request_preauth':
      return { ...claim, preAuth: 'approved' };
    case 'reverify':
      return { ...claim, docs: { ...claim.docs, eligibilityReverified: true } };
  }
}
