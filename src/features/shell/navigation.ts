import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../store/demo';
import { useSession } from '../../store/session';
import type { Encounter } from '../../store/types';

/** Where an encounter opens. Inactive encounters return null (caller shows a warning). */
export const encounterPath = (e: Encounter): string | null => {
  if (e.status === 'inactive' || e.nphies === 'inactive') return null;
  if (e.status === 'cleared' || e.status === 'in_review') {
    const step = useDemo.getState().reviews[e.id]?.step ?? 0;
    return `/review/${e.id}/${step + 1}`;
  }
  return `/session/${e.id}`;
};

/** Prepare (or reuse) the live session for an encounter. */
export function prepareSession(e: Encounter) {
  const s = useSession.getState();
  const demo = useDemo.getState();
  if (s.active?.encounterId === e.id) return;
  const patient = demo.patients.find((p) => p.id === e.patientId);
  s.begin({
    encounterId: e.id,
    scenario: demo.scenarioOverride ?? e.scenario,
    complaintDays: demo.complaintDays,
    firstName: patient?.name.split(' ')[0] ?? 'there',
  });
}

export function useOpenEncounter(onInactive: (e: Encounter) => void) {
  const navigate = useNavigate();
  return (e: Encounter, opts: { start?: boolean } = {}) => {
    const path = encounterPath(e);
    if (!path) return onInactive(e);
    if (opts.start || path.startsWith('/session')) prepareSession(e);
    navigate((opts.start ? `/session/${e.id}` : path) + window.location.search);
  };
}
