import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { DEMO_CONFIG, SEED_PATIENTS, SEED_PRIORITY, seedEncounters, type PriorityItem } from '../mocks/fixtures';
import { applyFix, claimTotal, evaluate, readinessScore } from '../engine/rules';
import { clock } from '../engine/clock';
import type { Claim, Encounter, Patient, RuleFix, ScenarioId } from './types';
import type { ActiveSession } from './session';

export type SoapTab = 'subjective' | 'objective' | 'assessment' | 'plan';
export type SortKey = 'nearest' | 'latest' | 'name' | 'nphies';

export interface SoapSection {
  fields: Record<string, string>;
  reviewed: boolean;
}

export interface ReviewDraft {
  step: number;
  visited: [boolean, boolean, boolean];
  soap: Record<SoapTab, SoapSection> | null;
  summary: { text: string | null; level: 'simple' | 'detailed'; lang: 'en' | 'ar' };
  payerRejected: boolean;
  submitAttempts: number;
  savedAt: number | null;
  amendments: number;
  readinessAtStart: number | null;
  claimStory: { before: number; after: number; protectedAed: number; ref: string } | null;
  /** Snapshot of the live session the review was built from (drives SOAP + evidence). */
  session: Pick<ActiveSession, 'scenario' | 'complaintDays' | 'firstName' | 'states' | 'elapsedMs'> | null;
  dischargeSuggested: boolean;
}

export interface KpiDelta {
  claims: number;
  firstPass: number;
  recovered: number;
  sla: number;
}

export interface PriorityLive extends PriorityItem {
  deadline: number;
}

interface DemoState {
  patients: Patient[];
  encounters: Encounter[];
  priority: PriorityLive[];
  reviews: Record<string, ReviewDraft>;
  kpiDelta: KpiDelta;
  sort: SortKey;
  complaintDays: number;
  slaThreshold: number;
  scenarioOverride: ScenarioId | null;

  addPatient: (p: Patient) => void;
  createEncounter: (e: Encounter) => void;
  updateEncounter: (id: string, patch: Partial<Encounter>) => void;
  cancelEncounter: (id: string) => void;
  setClaim: (id: string, claim: Claim) => void;
  fixClaim: (id: string, fix: RuleFix) => void;
  resolvePriority: (id: string) => void;
  setSort: (s: SortKey) => void;
  setScenarioOverride: (s: ScenarioId | null) => void;
  saveReview: (id: string, patch: Partial<ReviewDraft>) => void;
  clearEncounter: (id: string, story: ReviewDraft['claimStory']) => void;
  reset: () => void;
}

export const newReview = (): ReviewDraft => ({
  step: 0,
  visited: [true, false, false],
  soap: null,
  summary: { text: null, level: 'simple', lang: 'en' },
  payerRejected: false,
  submitAttempts: 0,
  savedAt: null,
  amendments: 0,
  readinessAtStart: null,
  claimStory: null,
  session: null,
  dischargeSuggested: false,
});

const seed = () => {
  const now = clock.now();
  return {
    patients: SEED_PATIENTS,
    encounters: seedEncounters(new Date(now)),
    priority: SEED_PRIORITY.map((p) => ({ ...p, deadline: now + p.deadlineOffsetMs })),
    reviews: {} as Record<string, ReviewDraft>,
    kpiDelta: { claims: 0, firstPass: 0, recovered: 0, sla: 0 },
    sort: 'nearest' as SortKey,
    complaintDays: 21,
    slaThreshold: DEMO_CONFIG.slaRedThreshold,
    scenarioOverride: null as ScenarioId | null,
  };
};

const withScores = (e: Encounter, patients: Patient[], claim: Claim): Encounter => {
  const payer = patients.find((p) => p.id === e.patientId)?.payer ?? 'SelfPay';
  const results = evaluate(claim, payer, { sessionNo: e.sessionNo });
  return { ...e, claim: { ...claim, totalAed: claimTotal(claim) }, readiness: readinessScore(claim, results) };
};

export const useDemo = create<DemoState>()(
  persist(
    (set, get) => ({
      ...seed(),
      addPatient: (p) => set((s) => ({ patients: [...s.patients.filter((x) => x.id !== p.id), p] })),
      createEncounter: (e) => set((s) => ({ encounters: [e, ...s.encounters] })),
      updateEncounter: (id, patch) =>
        set((s) => ({ encounters: s.encounters.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
      cancelEncounter: (id) => set((s) => ({ encounters: s.encounters.filter((e) => e.id !== id) })),
      setClaim: (id, claim) =>
        set((s) => ({ encounters: s.encounters.map((e) => (e.id === id ? withScores(e, s.patients, claim) : e)) })),
      fixClaim: (id, fix) => {
        const e = get().encounters.find((x) => x.id === id);
        if (e) get().setClaim(id, applyFix(e.claim, fix));
      },
      resolvePriority: (id) => set((s) => ({ priority: s.priority.filter((p) => p.id !== id) })),
      setSort: (sort) => set({ sort }),
      setScenarioOverride: (scenarioOverride) => set({ scenarioOverride }),
      saveReview: (id, patch) =>
        set((s) => ({
          reviews: { ...s.reviews, [id]: { ...(s.reviews[id] ?? newReview()), ...patch, savedAt: Date.now() } },
        })),
      clearEncounter: (id, story) =>
        set((s) => {
          const enc = s.encounters.find((e) => e.id === id);
          return {
            encounters: s.encounters.map((e) =>
              e.id === id ? { ...e, status: 'cleared', nphies: 'cleared', stage: 'submission' } : e,
            ),
            reviews: { ...s.reviews, [id]: { ...(s.reviews[id] ?? newReview()), claimStory: story } },
            kpiDelta: {
              claims: s.kpiDelta.claims + 1,
              firstPass: Math.min(s.kpiDelta.firstPass + 1, 12),
              recovered: s.kpiDelta.recovered + (story?.protectedAed ?? enc?.claim.totalAed ?? 0),
              sla: Math.max(s.kpiDelta.sla - 1, -10),
            },
          };
        }),
      reset: () => set({ ...seed() }),
    }),
    {
      name: 'medexa-demo-v1',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const usePatient = (id?: string) => useDemo((s) => s.patients.find((p) => p.id === id));
export const useEncounter = (id?: string) => useDemo((s) => s.encounters.find((e) => e.id === id));
