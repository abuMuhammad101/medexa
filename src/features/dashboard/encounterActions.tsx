import { useState } from 'react';
import { AlertTriangle, CalendarClock, Copy, ExternalLink, PlayCircle, RotateCw, XCircle } from 'lucide-react';
import { Button, Confirm, Modal, StatusPill, type MenuItem } from '../../components/ui';
import { api } from '../../mocks/api';
import { payerLabel } from '../../mocks/fixtures';
import { useDemo } from '../../store/demo';
import { toast } from '../../store/toast';
import type { Encounter, NphiesStatus, Patient } from '../../store/types';
import { useOpenEncounter } from '../shell/navigation';
import type { SortKey } from '../../store/demo';

const nphiesRank: Record<NphiesStatus, number> = { cleared: 0, queued: 1, inactive: 2 };

/** Stable sort (Array.prototype.sort is stable in modern engines). */
export function sortEncounters(list: Encounter[], patients: Patient[], key: SortKey) {
  const name = (e: Encounter) => patients.find((p) => p.id === e.patientId)?.name ?? '';
  const copy = [...list];
  switch (key) {
    case 'nearest':
      return copy.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    case 'latest':
      return copy.sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
    case 'name':
      return copy.sort((a, b) => name(a).localeCompare(name(b)));
    case 'nphies':
      return copy.sort((a, b) => nphiesRank[a.nphies] - nphiesRank[b.nphies]);
  }
}

export const SORT_LABEL: Record<SortKey, string> = { nearest: 'Nearest', latest: 'Latest', name: 'Name', nphies: 'NPHIES status' };

export function useEncounterActions() {
  const [inactive, setInactive] = useState<Encounter | null>(null);
  const [cancel, setCancel] = useState<Encounter | null>(null);
  const [retrying, setRetrying] = useState(false);
  const open = useOpenEncounter(setInactive);
  const patients = useDemo((s) => s.patients);
  const update = useDemo((s) => s.updateEncounter);
  const cancelEncounter = useDemo((s) => s.cancelEncounter);

  const menu = (e: Encounter): MenuItem[] => [
    { label: 'Open encounter', icon: <ExternalLink size={16} aria-hidden />, onSelect: () => open(e) },
    {
      label: 'Start session',
      icon: <PlayCircle size={16} aria-hidden />,
      disabled: e.status === 'cleared' || e.nphies === 'inactive',
      onSelect: () => open(e, { start: true }),
    },
    {
      label: 'Copy Ref ID',
      icon: <Copy size={16} aria-hidden />,
      onSelect: () => {
        navigator.clipboard?.writeText(e.refId).catch(() => undefined);
        toast({ tone: 'success', title: 'Ref ID copied', body: e.refId });
      },
    },
    { label: 'Reschedule', icon: <CalendarClock size={16} aria-hidden />, onSelect: () => toast({ tone: 'info', title: 'Available in the full product' }) },
    { label: 'Cancel encounter', icon: <XCircle size={16} aria-hidden />, danger: true, onSelect: () => setCancel(e) },
  ];

  const patientOf = (e: Encounter | null) => patients.find((p) => p.id === e?.patientId);

  const retry = async () => {
    if (!inactive) return;
    const p = patientOf(inactive);
    setRetrying(true);
    try {
      const r = await api.checkEligibility(p?.payer ?? 'SelfPay', inactive.department);
      if (r.status === 'eligible') {
        update(inactive.id, { nphies: 'cleared', status: 'queued', inactiveReason: undefined });
        toast({ tone: 'success', title: 'NPHIES check passed', body: `${p?.name} is now cleared.` });
        setInactive(null);
      } else {
        toast({ tone: 'warning', title: 'Still not eligible', body: 'The payer has not updated coverage yet.' });
      }
    } catch (err) {
      toast({ tone: 'error', title: 'NPHIES check failed', body: (err as Error).message });
    } finally {
      setRetrying(false);
    }
  };

  const dialogs = (
    <>
      <Modal
        open={!!inactive}
        onRequestClose={() => setInactive(null)}
        title="Encounter is inactive"
        titleTone="ink"
        description={patientOf(inactive)?.name}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setInactive(null)}>
              Close
            </Button>
            <Button onClick={retry} loading={retrying} leading={<RotateCw size={16} aria-hidden />}>
              Retry NPHIES check
            </Button>
          </div>
        }
      >
        <div className="flex gap-3 rounded-md border border-warning bg-warning-bg p-4 text-fg">
          <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warning-text" aria-hidden />
          <div>
            <StatusPill tone="error" dot size="sm">
              NPHIES: Inactive
            </StatusPill>
            <p className="mt-2 text-body">{inactive?.inactiveReason ?? 'The payer did not confirm coverage for this visit.'}</p>
            <p className="mt-2 text-body-sm text-fg-secondary">
              Payer: {payerLabel(patientOf(inactive)?.payer ?? 'SelfPay')} · Department: {inactive?.department} · Ref ID {inactive?.refId}
            </p>
          </div>
        </div>
      </Modal>
      <Confirm
        open={!!cancel}
        title="Cancel this encounter?"
        body={`${patientOf(cancel)?.name}'s encounter ${cancel?.refId} will be removed from the queue.`}
        confirmLabel="Cancel encounter"
        tone="danger"
        onCancel={() => setCancel(null)}
        onConfirm={() => {
          if (cancel) {
            cancelEncounter(cancel.id);
            toast({ tone: 'success', title: 'Encounter cancelled' });
          }
          setCancel(null);
        }}
      />
    </>
  );

  return { open, menu, dialogs };
}
