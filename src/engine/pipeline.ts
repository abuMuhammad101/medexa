/**
 * Live Agent Pipeline: five stages whose counts drift on the simulation clock.
 * The sum is the "Claims In Flight" KPI.
 */
import { useEffect } from 'react';
import { create } from 'zustand';
import { clock } from './clock';
import type { PipelineStage } from '../store/types';

export interface StageInfo {
  id: PipelineStage;
  label: string;
  agent: string;
  slaHours: number;
}

export const STAGES: StageInfo[] = [
  { id: 'intake', label: 'Intake', agent: 'Scribe agent', slaHours: 2 },
  { id: 'coding', label: 'Coding', agent: 'Coding agent', slaHours: 4 },
  { id: 'eligibility', label: 'Eligibility & Pre-Auth', agent: 'Auth agent', slaHours: 6 },
  { id: 'submission', label: 'Submission', agent: 'Claims agent', slaHours: 8 },
  { id: 'denial', label: 'Denial & Appeal', agent: 'Appeals agent', slaHours: 24 },
];

const INITIAL: Record<PipelineStage, number> = { intake: 212, coding: 347, eligibility: 296, submission: 318, denial: 111 };

interface PipelineState {
  counts: Record<PipelineStage, number>;
  atRisk: Record<PipelineStage, number>;
  filter: PipelineStage | null;
  setFilter: (s: PipelineStage | null) => void;
  step: () => void;
  complete: () => void;
  reset: () => void;
}

let seed = 7;
const rand = () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

export const usePipeline = create<PipelineState>((set) => ({
  counts: { ...INITIAL },
  atRisk: { intake: 2, coding: 4, eligibility: 6, submission: 3, denial: 2 },
  filter: null,
  setFilter: (filter) => set({ filter }),
  step: () =>
    set((s) => {
      const c = { ...s.counts };
      const order = STAGES.map((x) => x.id);
      // move a few claims forward through each stage
      for (let i = 0; i < 3; i++) {
        const n = Math.min(c[order[i]], 1 + Math.floor(rand() * 4));
        c[order[i]] -= n;
        c[order[i + 1]] += n;
      }
      // some submissions are accepted (leave) and the same number of new claims enter intake
      const done = Math.min(c.submission, 1 + Math.floor(rand() * 4));
      c.submission -= done;
      c.intake += done;
      // occasional denial resolved back into submission
      if (rand() > 0.6 && c.denial > 0) {
        c.denial -= 1;
        c.submission += 1;
      } else if (c.submission > 0) {
        c.submission -= 1;
        c.denial += 1;
      }
      const atRisk = { ...s.atRisk };
      const k = order[Math.floor(rand() * order.length)];
      atRisk[k] = Math.max(0, Math.min(9, atRisk[k] + (rand() > 0.5 ? 1 : -1)));
      return { counts: c, atRisk };
    }),
  complete: () => set((s) => ({ counts: { ...s.counts, submission: Math.max(0, s.counts.submission - 1) } })),
  reset: () => set({ counts: { ...INITIAL }, filter: null }),
}));

export const pipelineTotal = (c: Record<PipelineStage, number>) => Object.values(c).reduce((a, b) => a + b, 0);

/** Drive the pipeline from the clock: one step every 6 simulated seconds. */
export function usePipelineDriver() {
  useEffect(() => {
    let acc = 0;
    return clock.subscribe((_, delta) => {
      acc += delta;
      if (acc >= 6000) {
        acc = 0;
        usePipeline.getState().step();
      }
    });
  }, []);
}
