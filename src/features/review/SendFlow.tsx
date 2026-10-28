import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { ArrowUpRight, CheckCircle2, Loader2, Mail, MessageCircle, MessageSquareText, Send, ShieldAlert, ShieldCheck, WifiOff, XCircle } from 'lucide-react';
import { Button, Modal } from '../../components/ui';
import { latency } from '../../mocks/api';
import { cn, fmtAed } from '../../lib/format';
import { toast } from '../../store/toast';

export type SubmitPhase =
  | { kind: 'idle' }
  | { kind: 'validating' }
  | { kind: 'sending' }
  | { kind: 'accepted'; ref: string; before: number; after: number; protectedAed: number }
  | { kind: 'rejected'; reasons: string[] }
  | { kind: 'network'; message: string };

export function SendPopover({
  allVisited,
  unvisited,
  denialCount,
  onSummary,
  onSubmit,
  onShowDenials,
  disabled,
}: {
  allVisited: boolean;
  unvisited: string[];
  denialCount: number;
  onSummary: () => void;
  onSubmit: () => void;
  onShowDenials: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const blocked = !allVisited || denialCount > 0;
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button disabled={disabled} trailing={<ArrowUpRight size={16} aria-hidden />}>
          Send
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-[70] w-80 rounded-lg border border-line bg-surface p-2 shadow-modal focus:outline-none">
          {!allVisited && (
            <p className="m-2 rounded-md bg-warning-bg px-3 py-2 text-body-sm text-warning-text" role="note">
              Visit every card first: {unvisited.join(', ')}.
            </p>
          )}
          <button
            disabled={!allVisited}
            onClick={() => {
              setOpen(false);
              onSummary();
            }}
            className="flex w-full items-start gap-3 rounded-md p-3 text-left hover:bg-primary-subtle focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <MessageCircle size={20} className="mt-0.5 text-primary" aria-hidden />
            <span>
              <span className="block text-body font-medium">Send summary to patient</span>
              <span className="block text-body-sm text-fg-secondary">WhatsApp, SMS or email, with a preview</span>
            </span>
          </button>
          <button
            disabled={blocked}
            onClick={() => {
              setOpen(false);
              onSubmit();
            }}
            className="flex w-full items-start gap-3 rounded-md p-3 text-left hover:bg-primary-subtle focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
          >
            <ShieldCheck size={20} className="mt-0.5 text-primary" aria-hidden />
            <span>
              <span className="block text-body font-medium">Submit claim to NPHIES</span>
              <span className="block text-body-sm text-fg-secondary">Validates, sends and tracks the payer response</span>
            </span>
          </button>
          {allVisited && denialCount > 0 && (
            <div className="m-2 rounded-md bg-error-bg p-3 text-body-sm text-error-text" role="note">
              <p className="flex items-center gap-1.5 font-medium">
                <ShieldAlert size={16} aria-hidden /> Blocked: {denialCount} open item{denialCount > 1 ? 's' : ''} in the Active Denial Loop
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  setOpen(false);
                  onShowDenials();
                }}
              >
                Review denial loop
              </Button>
            </div>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

type Channel = 'whatsapp' | 'sms' | 'email';
const CHANNELS: { id: Channel; label: string; icon: JSX.Element }[] = [
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={16} aria-hidden /> },
  { id: 'sms', label: 'SMS', icon: <MessageSquareText size={16} aria-hidden /> },
  { id: 'email', label: 'Email', icon: <Mail size={16} aria-hidden /> },
];

export function SummarySendDialog({ open, onClose, preview, phone, name }: { open: boolean; onClose: () => void; preview: string; phone: string; name: string }) {
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [sending, setSending] = useState(false);
  const masked = phone ? phone.replace(/(\d{2}) (\d{3})/, '$1 ***') : '+971 5* *** ****';
  const target = channel === 'email' ? `${name.split(' ')[0].toLowerCase()}@example.com` : masked;
  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      title="Send summary to patient"
      titleTone="ink"
      description={`To ${name}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={sending}
            leading={<Send size={16} aria-hidden />}
            onClick={async () => {
              setSending(true);
              await latency(500, 800);
              setSending(false);
              onClose();
              toast({ tone: 'success', title: `Summary sent via ${CHANNELS.find((c) => c.id === channel)?.label}`, body: `Simulated delivery to ${target}` });
            }}
          >
            Send
          </Button>
        </div>
      }
    >
      <fieldset>
        <legend className="text-body font-medium">Channel</legend>
        <div className="mt-2 flex gap-2">
          {CHANNELS.map((c) => (
            <label
              key={c.id}
              className={cn(
                'flex h-10 cursor-pointer items-center gap-2 rounded-full border px-4 text-body focus-within:shadow-focus',
                channel === c.id ? 'border-primary bg-primary-subtle' : 'border-line hover:bg-surface-muted',
              )}
            >
              <input type="radio" name="channel" value={c.id} checked={channel === c.id} onChange={() => setChannel(c.id)} className="sr-only" />
              {c.icon}
              {c.label}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="mt-4 text-body-sm text-fg-secondary">Preview to {target}</p>
      <div className={cn('mt-2 whitespace-pre-wrap rounded-lg p-4 text-body', channel === 'whatsapp' ? 'bg-success-bg' : 'bg-surface-muted')}>{preview}</div>
      <p className="mt-2 text-caption text-fg-tertiary">Demo only: nothing is actually sent.</p>
    </Modal>
  );
}

export function SubmitDialog({
  phase,
  onClose,
  onRetry,
  onFix,
  onDone,
}: {
  phase: SubmitPhase;
  onClose: () => void;
  onRetry: () => void;
  onFix: () => void;
  onDone: () => void;
}) {
  const busy = phase.kind === 'validating' || phase.kind === 'sending';
  const steps = ['Validating', 'Sending to NPHIES', 'Payer response'];
  const stepIdx = phase.kind === 'validating' ? 0 : phase.kind === 'sending' ? 1 : phase.kind === 'accepted' ? 3 : 2;
  return (
    <Modal open={phase.kind !== 'idle'} onRequestClose={() => !busy && onClose()} title="Submit claim to NPHIES" titleTone="ink">
      <ol className="flex items-center gap-2" aria-label="Submission progress">
        {steps.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-caption',
                i < stepIdx ? 'bg-success text-fg-on-dark' : i === stepIdx ? 'bg-primary text-fg-on-dark' : 'bg-surface-sunken text-fg-secondary',
              )}
            >
              {i < stepIdx ? <CheckCircle2 size={16} aria-hidden /> : i + 1}
            </span>
            <span className={cn('text-body-sm', i === stepIdx ? 'font-medium text-fg' : 'text-fg-secondary')}>{s}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6" aria-live="polite">
        {busy && (
          <p className="flex items-center gap-2 text-body-lg">
            <Loader2 size={20} className="animate-spin text-primary" aria-hidden />
            {phase.kind === 'validating' ? 'Validating claim against payer rules...' : 'Sending to NPHIES...'}
          </p>
        )}
        {phase.kind === 'accepted' && (
          <div className="ai-ring flex flex-col items-center gap-3 rounded-xl bg-success-bg p-6 text-center">
            <CheckCircle2 size={40} className="text-success" aria-hidden />
            <p className="text-h2 font-medium text-fg">Accepted</p>
            <p className="text-body text-fg-secondary">
              Claim reference <span className="font-semibold text-fg tabular">{phase.ref}</span>
            </p>
            {/* Claim story built from the real simulation numbers */}
            <p className="text-body-lg text-fg">
              Readiness <span className="tabular">{Math.round(phase.before)}%</span> to <span className="font-semibold text-success-text tabular">{Math.round(phase.after)}%</span>, {fmtAed(phase.protectedAed)} protected
            </p>
            <Button onClick={onDone}>Back to Control room</Button>
          </div>
        )}
        {phase.kind === 'rejected' && (
          <div className="rounded-lg border border-error bg-error-bg p-4">
            <p className="flex items-center gap-2 text-h4 font-medium text-error-text">
              <XCircle size={20} aria-hidden /> Rejected by payer
            </p>
            <ul className="mt-2 list-disc pl-5 text-body text-fg">
              {phase.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <Button className="mt-4" onClick={onFix}>
              Fix and resubmit
            </Button>
          </div>
        )}
        {phase.kind === 'network' && (
          <div className="rounded-lg border border-warning bg-warning-bg p-4">
            <p className="flex items-center gap-2 text-h4 font-medium text-warning-text">
              <WifiOff size={20} aria-hidden /> Network error
            </p>
            <p className="mt-1 text-body text-fg">{phase.message}</p>
            <div className="mt-4 flex gap-2">
              <Button onClick={onRetry}>Retry</Button>
              <Button variant="ghost" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
