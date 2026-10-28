import { beforeEach, describe, expect, it } from 'vitest';
import { useDemo } from './demo';
import { claimFromSession, deriveSession, useSession } from './session';
import { pipelineTotal, usePipeline } from '../engine/pipeline';
import { buildScenario } from '../engine/scenarios';

beforeEach(() => {
  useDemo.getState().reset();
  useSession.getState().end();
  usePipeline.getState().reset();
});

describe('demo store', () => {
  it('seeds 12 patients and 8 encounters with unique Ref IDs, none in the past', () => {
    const { patients, encounters } = useDemo.getState();
    expect(patients).toHaveLength(12);
    expect(encounters).toHaveLength(8);
    expect(new Set(encounters.map((e) => e.refId)).size).toBe(8);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    encounters.forEach((e) => expect(new Date(e.scheduledAt).getTime()).toBeGreaterThanOrEqual(startOfToday.getTime()));
  });

  it('clearEncounter marks cleared and moves KPIs', () => {
    useDemo.getState().clearEncounter('e1', { before: 62, after: 94, protectedAed: 1840, ref: 'CLM-2026-000481' });
    const s = useDemo.getState();
    expect(s.encounters.find((e) => e.id === 'e1')?.status).toBe('cleared');
    expect(s.kpiDelta.recovered).toBe(1840);
    expect(s.kpiDelta.firstPass).toBe(1);
    expect(s.reviews.e1.claimStory?.ref).toBe('CLM-2026-000481');
  });

  it('fixClaim applies a rule fix and recomputes readiness', () => {
    const st = useDemo.getState();
    st.setClaim('e1', {
      lines: [
        { id: 'd', kind: 'dx', code: 'M54.16', system: 'ICD-10-AM', description: '', amountAed: 0, linkedDxIds: [], match: 'matched', confidence: 0.9, evidenceTurnIds: [] },
        { id: 'p', kind: 'px', code: '9.7.41', system: 'CCHI-BS', description: '', amountAed: 280, linkedDxIds: [], match: 'matched', confidence: 0.9, evidenceTurnIds: [] },
      ],
      totalAed: 0,
      denialRisk: 0,
      docs: { outcomeMeasure: true, history: false, eligibilityReverified: false },
    });
    expect(useDemo.getState().encounters.find((e) => e.id === 'e1')!.readiness).toBe(85.4);
    useDemo.getState().fixClaim('e1', { label: '', type: 'link_dx', lineId: 'p', dxId: 'd' });
    const e = useDemo.getState().encounters.find((x) => x.id === 'e1')!;
    expect(e.readiness).toBe(100);
    expect(e.claim.totalAed).toBe(280);
  });
});

describe('session store and playback', () => {
  const begin = () =>
    useSession.getState().begin({ encounterId: 'e1', scenario: 'missing_docs', complaintDays: 21, firstName: 'Samuel' });

  it('reveals transcript and suggestions as time advances (derived from elapsed)', () => {
    begin();
    useSession.getState().patch({ status: 'recording' });
    expect(deriveSession(useSession.getState().active!).turns).toHaveLength(0);
    useSession.getState().tick(30000);
    const d = deriveSession(useSession.getState().active!);
    expect(d.turns.length).toBeGreaterThan(3);
    expect(d.suggestions.some((s) => s.key === 'dx_lbp')).toBe(true);
    expect(d.turns.find((t) => t.id === 't4')?.text).toContain('three weeks');
  });

  it('does not advance while paused', () => {
    begin();
    useSession.getState().patch({ status: 'paused' });
    useSession.getState().tick(10000);
    expect(useSession.getState().active!.elapsedMs).toBe(0);
  });

  it('builds the claim from kept suggestions only; missing docs gives two issues', () => {
    begin();
    useSession.getState().patch({ status: 'recording' });
    useSession.getState().tick(buildScenario('missing_docs').durationMs);
    const keys = deriveSession(useSession.getState().active!).suggestions.filter((s) => s.line).map((s) => s.key);
    useSession.getState().keepAll(keys);
    const claim = claimFromSession(useSession.getState().active!, false);
    expect(claim.lines.map((l) => l.code).sort()).toEqual(['9.3.10', '9.3.42', '9.7.41', 'M54.16', 'M54.5']);
    expect(claim.docs.outcomeMeasure).toBe(false);
    expect(claim.docs.history).toBe(true);
  });

  it('protocol asks are marked asked when the clinician asks and capture the answer', () => {
    begin();
    useSession.getState().patch({ status: 'recording' });
    useSession.getState().tick(100000);
    const ask = deriveSession(useSession.getState().active!).suggestions.find((s) => s.key === 'ask_family')!;
    expect(ask.asked).toBe(true);
    expect(ask.answer).toContain('diabetes');
  });
});

describe('pipeline', () => {
  it('keeps the total constant while stepping', () => {
    const before = pipelineTotal(usePipeline.getState().counts);
    expect(before).toBe(1284);
    for (let i = 0; i < 50; i++) usePipeline.getState().step();
    expect(pipelineTotal(usePipeline.getState().counts)).toBe(before);
  });
});
