/**
 * Fake API. Every call has 200-800 ms latency. Add ?fail=submit (or save,
 * eligibility, lookup; comma separated) to the URL to force failures.
 */
import { DEPARTMENTS, PAYER_RULES, payerLabel } from './fixtures';
import { digitsOnly } from '../lib/validators';
import type { Department, Patient, Payer } from '../store/types';
import { useDemo } from '../store/demo';

export class ApiError extends Error {
  constructor(message: string, public kind: 'network' | 'rejected' = 'network', public reasons: string[] = []) {
    super(message);
  }
}

const failFlags = () => {
  if (typeof window === 'undefined') return new Set<string>();
  return new Set((new URLSearchParams(window.location.search).get('fail') ?? '').split(',').filter(Boolean));
};

export const latency = (min = 200, max = 800) =>
  new Promise<void>((r) => setTimeout(r, min + Math.random() * (max - min)));

async function call<T>(name: string, fn: () => T, opts: { min?: number; max?: number } = {}): Promise<T> {
  await latency(opts.min, opts.max);
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new ApiError('You are offline.');
  if (failFlags().has(name)) throw new ApiError(`Simulated ${name} failure (network).`);
  return fn();
}

export type EligibilityResult =
  | { status: 'eligible' }
  | { status: 'not_eligible'; eligibleDepartments: Department[] }
  | { status: 'unavailable' };

export const api = {
  lookupPatient: (eid: string) =>
    call('lookup', () => {
      const d = digitsOnly(eid);
      return useDemo.getState().patients.find((p) => digitsOnly(p.emiratesId) === d) ?? null;
    }, { min: 200, max: 450 }),

  checkEligibility: (payer: Payer, dept: Department) =>
    call<EligibilityResult>('eligibility', () => {
      if (payer === 'SAICO' && dept === 'General Medicine') return { status: 'unavailable' };
      const covered = PAYER_RULES[payer].coveredDepartments;
      if (covered.includes(dept)) return { status: 'eligible' };
      return { status: 'not_eligible', eligibleDepartments: DEPARTMENTS.filter((d) => covered.includes(d)) };
    }, { min: 600, max: 900 }),

  savePatient: (p: Patient) => call('save', () => p, { min: 500, max: 700 }),

  saveDraft: () => call('draft', () => true, { min: 150, max: 300 }),

  /**
   * Submit to NPHIES. With ?fail=submit: attempt 1 is a network error, attempt 2
   * is rejected, attempt 3+ is accepted. The Payer rejection scenario rejects
   * until eligibility is re-verified.
   */
  submitClaim: async (args: { attempt: number; scenarioRejects: boolean; reverified: boolean; payer: Payer }) => {
    await latency(500, 800);
    const fail = failFlags().has('submit');
    if (fail && args.attempt === 1) throw new ApiError('NPHIES did not respond (timeout). Your claim was not sent.');
    if ((fail && args.attempt === 2) || (args.scenarioRejects && !args.reverified)) {
      throw new ApiError('Rejected by payer', 'rejected', [
        `${payerLabel(args.payer)}: member eligibility lapsed on the date of service (ELG-104).`,
        'Re-verify coverage and resubmit.',
      ]);
    }
    return { ref: `CLM-2026-${String(481 + Math.floor(Math.random() * 300)).padStart(6, '0')}` };
  },
};
