/**
 * Active live session (sessionStorage so a refresh can offer Resume/Discard).
 * Visible transcript and suggestions are DERIVED from the scenario + elapsedMs.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { buildScenario, lineFromCode, type ScenarioDef } from '../engine/scenarios';
import type { Claim, ClaimLine, ScenarioId, Suggestion, TranscriptTurn } from './types';

export type SessionStatus = 'pre' | 'recording' | 'paused' | 'stopped';
export type Connection = 'ok' | 'reconnecting' | 'error';

export interface SuggestionState {
  status: 'open' | 'kept' | 'dismissed';
  asked?: boolean;
}

export interface ActiveSession {
  encounterId: string;
  scenario: ScenarioId;
  complaintDays: number;
  firstName: string;
  elapsedMs: number;
  status: SessionStatus;
  consent: boolean;
  connection: Connection;
  connectionSince: number;
  mic: 'unknown' | 'granted' | 'denied' | 'demo';
  states: Record<string, SuggestionState>;
  stillListening: boolean;
  commandFlashAt: number | null;
}

interface SessionStore {
  active: ActiveSession | null;
  begin: (s: Omit<ActiveSession, 'elapsedMs' | 'status' | 'consent' | 'connection' | 'connectionSince' | 'mic' | 'states' | 'stillListening' | 'commandFlashAt'>) => void;
  patch: (p: Partial<ActiveSession>) => void;
  tick: (deltaMs: number) => void;
  setSuggestion: (key: string, st: Partial<SuggestionState>) => void;
  keepAll: (keys: string[]) => void;
  end: () => void;
}

export const useSession = create<SessionStore>()(
  persist(
    (set) => ({
      active: null,
      begin: (s) =>
        set({
          active: {
            ...s,
            elapsedMs: 0,
            status: 'pre',
            consent: false,
            connection: 'ok',
            connectionSince: 0,
            mic: 'unknown',
            states: {},
            stillListening: false,
            commandFlashAt: null,
          },
        }),
      patch: (p) => set((st) => (st.active ? { active: { ...st.active, ...p } } : st)),
      tick: (deltaMs) =>
        set((st) => {
          const a = st.active;
          if (!a || a.status !== 'recording') return st;
          return { active: { ...a, elapsedMs: a.elapsedMs + deltaMs } };
        }),
      setSuggestion: (key, upd) =>
        set((st) => {
          const a = st.active;
          if (!a) return st;
          const prev = a.states[key] ?? { status: 'open' };
          return { active: { ...a, states: { ...a.states, [key]: { ...prev, ...upd } } } };
        }),
      keepAll: (keys) =>
        set((st) => {
          const a = st.active;
          if (!a) return st;
          const states = { ...a.states };
          keys.forEach((k) => (states[k] = { ...(states[k] ?? {}), status: 'kept' }));
          return { active: { ...a, states } };
        }),
      end: () => set({ active: null }),
    }),
    { name: 'medexa-session-v1', storage: createJSONStorage(() => sessionStorage) },
  ),
);

const scenarioCache = new Map<string, ScenarioDef>();
export const scenarioFor = (a: Pick<ActiveSession, 'scenario' | 'complaintDays' | 'firstName'>) => {
  const k = `${a.scenario}:${a.complaintDays}:${a.firstName}`;
  if (!scenarioCache.has(k)) scenarioCache.set(k, buildScenario(a.scenario, a.complaintDays, a.firstName));
  return scenarioCache.get(k)!;
};

export interface DerivedSession {
  scenario: ScenarioDef;
  turns: TranscriptTurn[];
  suggestions: Suggestion[];
  lastTurnAt: number;
}

export function deriveSession(a: ActiveSession): DerivedSession {
  const sc = scenarioFor(a);
  const turns: TranscriptTurn[] = sc.turns
    .filter((t) => t.atMs <= a.elapsedMs)
    .map((t) => ({ id: t.id, speaker: t.speaker, text: t.text, atMs: t.atMs, terms: t.terms }));
  const suggestions: Suggestion[] = sc.suggestions
    .filter((d) => d.atMs <= a.elapsedMs)
    .map((d) => {
      const st = a.states[d.key] ?? { status: 'open' };
      const spoken = (id?: string) => (id ? sc.turns.find((t) => t.id === id && t.atMs <= a.elapsedMs) : undefined);
      const answerTurn = spoken(d.answerTurn);
      // The agent hears the clinician ask the question and marks it asked.
      const asked = !!st.asked || !!spoken(d.askTurn);
      const base = d.line ? lineFromCode(d.line.code) : undefined;
      return {
        id: d.key,
        key: d.key,
        kind: d.kind,
        text: d.text,
        code: d.code,
        description: d.description,
        confidence: d.confidence,
        evidenceTurnIds: d.evidence,
        rule: d.rule,
        status: st.status,
        asked,
        answer: asked && answerTurn ? answerTurn.text : undefined,
        createdAt: d.atMs,
        line: base
          ? { ...base, linkedDxIds: [], match: d.line?.match ?? 'matched', confidence: d.confidence, dxKey: d.line?.dxKey }
          : undefined,
      };
    });
  return { scenario: sc, turns, suggestions, lastTurnAt: turns.length ? turns[turns.length - 1].atMs : 0 };
}

/**
 * Build the claim from suggestions. includeOpen=true gives the live provisional
 * claim (Pulse panel); at Stop only kept items become claim lines.
 */
export function claimFromSession(a: ActiveSession, includeOpen: boolean): Claim {
  const { suggestions, scenario } = deriveSession(a);
  const use = suggestions.filter((s) => s.status === 'kept' || (includeOpen && s.status === 'open'));
  const lines: ClaimLine[] = [];
  for (const s of use) {
    if (!s.line) continue;
    const { dxKey, ...rest } = s.line;
    lines.push({ ...rest, id: s.key, linkedDxIds: dxKey ? [dxKey] : [], evidenceTurnIds: s.evidenceTurnIds });
  }
  const outcome = use.some((s) => scenario.suggestions.find((d) => d.key === s.key)?.documentsOutcome);
  const history = suggestions.some((s) => s.kind === 'protocol' && s.asked && s.answer);
  return {
    lines,
    totalAed: lines.reduce((t, l) => t + l.amountAed, 0),
    preAuth: 'none',
    denialRisk: 0,
    docs: { outcomeMeasure: outcome, history, eligibilityReverified: false },
  };
}
