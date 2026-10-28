import { describe, expect, it } from 'vitest';
import { applyFix, denialItems, dxSupportConfidence, evaluate, readinessScore } from './rules';
import type { Claim, ClaimLine } from '../store/types';

const dx = (id: string, code: string, confidence = 0.95): ClaimLine => ({
  id, kind: 'dx', code, system: 'ICD-10-AM', description: code, amountAed: 0, linkedDxIds: [], match: 'matched', confidence, evidenceTurnIds: [],
});
const px = (id: string, code: string, linked: string[] = [], amount = 300): ClaimLine => ({
  id, kind: 'px', code, system: 'CCHI-BS', description: code, amountAed: amount, linkedDxIds: linked, match: 'matched', confidence: 0.9, evidenceTurnIds: [],
});
const claim = (lines: ClaimLine[], docs: Partial<Claim['docs']> = {}, preAuth: Claim['preAuth'] = 'none'): Claim => ({
  lines, totalAed: 0, denialRisk: 0, preAuth, docs: { outcomeMeasure: false, history: false, eligibilityReverified: false, ...docs },
});

describe('rules engine', () => {
  it('passes a clean, documented claim', () => {
    const c = claim([dx('d1', 'M54.16'), px('p1', '9.3.42', ['d1'])], { outcomeMeasure: true });
    expect(evaluate(c, 'Daman')).toEqual([]);
    expect(readinessScore(c, [])).toBe(100);
  });

  it('flags a procedure with no supporting diagnosis and offers a link fix', () => {
    const c = claim([dx('d1', 'M54.16'), px('p1', '9.7.41')], { outcomeMeasure: true });
    const r = evaluate(c, 'Daman');
    expect(r.map((x) => x.rule)).toContain('px-no-dx');
    const fix = r.find((x) => x.rule === 'px-no-dx')!.fix!;
    expect(fix.type).toBe('link_dx');
    const fixed = applyFix(c, fix);
    expect(evaluate(fixed, 'Daman')).toEqual([]);
  });

  it('missing documentation scenario scores 78.4 with two denial items', () => {
    const c = claim([dx('d1', 'M54.16'), px('p1', '9.3.42', ['d1']), px('p2', '9.7.41')]);
    const r = evaluate(c, 'Daman');
    expect(denialItems(r)).toHaveLength(2);
    expect(readinessScore(c, r)).toBe(78.4);
  });

  it('requires pre-auth for payer-listed codes until approved', () => {
    const c = claim([dx('d1', 'M54.16'), px('p1', '9.5.20', ['d1'])]);
    expect(evaluate(c, 'Daman').some((x) => x.rule === 'preauth')).toBe(true);
    const approved = applyFix(c, { label: '', type: 'request_preauth' });
    expect(evaluate(approved, 'Daman').some((x) => x.rule === 'preauth')).toBe(false);
    expect(evaluate(c, 'SelfPay').some((x) => x.rule === 'preauth')).toBe(false);
  });

  it('detects bundling conflicts and duplicates', () => {
    const c = claim([dx('d1', 'M54.16'), px('p1', '9.3.42', ['d1']), px('p2', '9.3.40', ['d1']), px('p3', '9.3.42', ['d1'])], { outcomeMeasure: true });
    const rules = evaluate(c, 'Daman').map((x) => x.rule);
    expect(rules).toContain('bundling');
    expect(rules).toContain('duplicate');
  });

  it('flags unmatched codes and removes them with the fix', () => {
    const c = claim([dx('d1', 'M54.16'), { ...px('p1', '9.9.99', ['d1']), match: 'none' }]);
    const r = evaluate(c, 'SelfPay');
    const nm = r.find((x) => x.rule === 'no-match')!;
    expect(applyFix(c, nm.fix!).lines).toHaveLength(1);
  });

  it('adds an eligibility item after a payer rejection until re-verified', () => {
    const c = claim([dx('d1', 'M54.16')]);
    expect(evaluate(c, 'NAS', { payerRejected: true }).some((x) => x.rule === 'eligibility')).toBe(true);
    const ok = applyFix(c, { label: '', type: 'reverify' });
    expect(evaluate(ok, 'NAS', { payerRejected: true })).toEqual([]);
  });

  it('session cap is informational and not a denial item', () => {
    const c = claim([dx('d1', 'M54.16')]);
    const r = evaluate(c, 'AlFuttaimTPA', { sessionNo: 9 });
    expect(r.find((x) => x.rule === 'cap')?.severity).toBe('info');
    expect(denialItems(r)).toHaveLength(0);
  });

  it('dx support confidence drops with unlinked procedures', () => {
    const linked = claim([dx('d1', 'M54.16', 0.95), px('p1', '9.3.42', ['d1'])]);
    const unlinked = claim([dx('d1', 'M54.16', 0.95), px('p1', '9.3.42')]);
    expect(dxSupportConfidence(linked, evaluate(linked, 'Daman'))).toBeGreaterThan(dxSupportConfidence(unlinked, evaluate(unlinked, 'Daman')));
  });
});
