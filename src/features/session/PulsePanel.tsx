import { useState, type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { BadgeCheck, Check, PanelRightClose } from 'lucide-react';
import { ProgressRing, StatusDot } from '../../components/ui';
import { CLINICIAN } from '../../mocks/fixtures';
import { cn } from '../../lib/format';
import type { RuleResult } from '../../store/types';

export interface PulseData {
  quality: number;
  issues: RuleResult[];
  preAuthNeeded: boolean;
  nphiesReady: boolean;
  eligible: boolean;
  transcriptPct: number;
  soapPct: number;
  notePct: number;
  ambient: 'Active Listening' | 'Paused' | 'Reconnecting' | 'Stopped' | 'Not started';
  checkedAt: string;
}

export const riskOf = (q: number) => (q >= 85 ? 'Low' : q >= 65 ? 'Medium' : 'High');

function Chip({ ok, warn, label, extra, expanded, onToggle }: { ok: boolean; warn?: boolean; label: string; extra?: ReactNode; expanded: boolean; onToggle: () => void }) {
  const tone = ok ? 'success' : warn ? 'warning' : 'error';
  return (
    <button
      type="button"
      aria-expanded={expanded}
      onClick={onToggle}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3.5 text-body transition-colors duration-fast focus-visible:outline-none focus-visible:shadow-focus',
        expanded ? 'border-primary bg-primary-subtle' : 'border-line hover:bg-surface-muted',
        !ok && (warn ? 'text-warning-text' : 'text-error-text'),
      )}
    >
      <StatusDot tone={tone} />
      {label}
      {extra}
      <span className="sr-only">{ok ? 'passed' : warn ? 'needs attention' : 'failed'}</span>
    </button>
  );
}

function Row({ label, status, pct }: { label: string; status: string; pct: number }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-3 text-body-lg last:border-b-0">
      <span className="text-fg">{label}</span>
      <span className="flex items-center gap-3 text-fg-secondary">
        {status === 'Complete' && <Check size={16} className="text-success" aria-hidden />}
        {status}
        <span className="h-4 w-px bg-line" aria-hidden />
        <span className="w-10 text-right text-fg tabular">{Math.round(pct)}%</span>
      </span>
    </div>
  );
}

const statusOf = (pct: number, pending: boolean) => (pct >= 100 ? 'Complete' : pending ? 'Pending' : 'Processing');

export function PulsePanel({ open, onOpenChange, data }: { open: boolean; onOpenChange: (o: boolean) => void; data: PulseData }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const risk = riskOf(data.quality);
  const ringTone = risk === 'Low' ? 'primary' : risk === 'Medium' ? 'warning' : 'error';
  const toggle = (k: string) => setExpanded((e) => (e === k ? null : k));
  const coding = data.issues.filter((i) => i.rule !== 'preauth');

  const detail: Record<string, ReactNode> = {
    preauth: data.preAuthNeeded ? 'Pre-authorisation is required for a procedure in this session and is not on file yet.' : 'No procedure in this session needs pre-authorisation for this payer.',
    nphies: data.nphiesReady ? 'Encounter registered with NPHIES; claim payload validates against the schema.' : 'NPHIES registration is still queued. The claim can be prepared but not sent.',
    elig: data.eligible ? 'Coverage active for this department on the date of service.' : 'Eligibility response pending from payer.',
    audit: coding.length ? (
      <ul className="list-disc pl-4">
        {coding.map((c) => (
          <li key={c.id}>{c.title}</li>
        ))}
      </ul>
    ) : (
      'All coded lines are linked to a supporting diagnosis.'
    ),
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-scrim backdrop-blur-md" />
        <Dialog.Content className="thin-scroll fixed bottom-4 right-4 top-4 z-[61] w-full max-w-full overflow-y-auto rounded-xl border border-line bg-surface p-6 shadow-modal focus:outline-none sm:w-pulse">
          <header className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Dialog.Close asChild>
                <button aria-label="Close Pulse panel (P)" className="flex h-9 w-9 items-center justify-center rounded-sm border border-line-strong hover:bg-surface-muted focus-visible:outline-none focus-visible:shadow-focus">
                  <PanelRightClose size={20} />
                </button>
              </Dialog.Close>
              <StatusDot tone="success" live />
              <Dialog.Title className="text-h3 font-medium">Claim Quality</Dialog.Title>
            </div>
            <ProgressRing value={data.quality} size={48} tone={ringTone} label="Claim quality" />
          </header>
          <Dialog.Description className="sr-only">Live claim quality, compliance checks and documentation progress for this session.</Dialog.Description>

          <h3 className="mt-6 border-b border-line pb-2 text-body-lg text-fg-secondary">Compliance & RCM</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            <Chip ok={!data.preAuthNeeded} warn label="Pre-Auth" extra={!data.preAuthNeeded ? <BadgeCheck size={16} className="text-success-text" aria-hidden /> : undefined} expanded={expanded === 'preauth'} onToggle={() => toggle('preauth')} />
            <Chip ok={data.nphiesReady} warn label="NPHIES Ready" expanded={expanded === 'nphies'} onToggle={() => toggle('nphies')} />
            <Chip ok={data.eligible} warn label="Eligibility Verified" expanded={expanded === 'elig'} onToggle={() => toggle('elig')} />
            <Chip ok={coding.length === 0} warn={coding.length < 2} label={`Coding Audit (${coding.length})`} expanded={expanded === 'audit'} onToggle={() => toggle('audit')} />
          </div>
          {expanded && (
            <div className="mt-3 rounded-md bg-surface-muted p-3 text-body-sm text-fg" role="region" aria-label="Check details">
              <p className="text-caption text-fg-tertiary">Checked {data.checkedAt}</p>
              <div className="mt-1">{detail[expanded]}</div>
            </div>
          )}

          <h3 className="mt-6 border-b border-line pb-2 text-body-lg text-fg-secondary">Documentation Pipeline</h3>
          <Row label="Transcript Stream" status={statusOf(data.transcriptPct, false)} pct={data.transcriptPct} />
          <Row label="SOAP Synthesis" status={statusOf(data.soapPct, data.soapPct === 0)} pct={data.soapPct} />
          {/* DESIGN-DECISION: Pending means under 20% until SOAP passes 70% */}
          <Row label="Clinical Note Draft" status={statusOf(data.notePct, data.soapPct < 70)} pct={data.notePct} />

          <h3 className="mt-6 border-b border-line pb-2 text-body-lg text-fg-secondary">Live Session</h3>
          <div className="flex items-center justify-between border-b border-line py-3 text-body-lg">
            <span>Ambient Status</span>
            <span className={cn('flex items-center gap-1.5 text-body', data.ambient === 'Active Listening' ? 'text-success-text' : data.ambient === 'Reconnecting' ? 'text-warning-text' : 'text-fg-secondary')}>
              <StatusDot tone={data.ambient === 'Active Listening' ? 'success' : data.ambient === 'Reconnecting' ? 'warning' : 'neutral'} live={data.ambient === 'Active Listening'} />
              {data.ambient}
            </span>
          </div>
          <div className="flex items-center justify-between py-3 text-body-lg">
            <span>Voice Provider</span>
            {/* DESIGN-DECISION: one clinician (signed-in user), not "Dr. Aris" */}
            <span className="text-body text-fg-secondary">Verified ({CLINICIAN.name})</span>
          </div>

          <h3 className="mt-6 border-b border-line pb-2 text-body-lg text-fg-secondary">Session Health Metrics</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface-sunken p-4">
              <p className="text-caption text-fg-secondary">Claim Quality</p>
              <p className="text-h2 tabular">{Math.round(data.quality)}%</p>
            </div>
            <div className="rounded-lg bg-surface-sunken p-4">
              <p className="text-caption text-fg-secondary">Risk Score</p>
              <p className={cn('text-h2', risk === 'Low' ? 'text-success-text' : risk === 'Medium' ? 'text-warning-text' : 'text-error-text')}>{risk}</p>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
