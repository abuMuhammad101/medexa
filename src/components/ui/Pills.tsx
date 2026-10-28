import { useEffect, useState, type ReactNode } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '../../lib/format';

export type PillTone = 'outline' | 'ink' | 'success' | 'warning' | 'error' | 'primary' | 'indigo' | 'dark';

const tones: Record<PillTone, string> = {
  outline: 'border border-line-strong text-fg bg-surface',
  ink: 'bg-ink text-fg-on-dark',
  success: 'bg-success-bg text-success-text',
  warning: 'bg-warning-bg text-warning-text',
  error: 'bg-error-bg text-error-text',
  primary: 'bg-primary text-fg-on-dark',
  indigo: 'bg-indigo-bg text-indigo',
  dark: 'border border-line-dark text-fg-on-dark',
};

const dotTones: Record<PillTone, string> = {
  outline: 'bg-fg-secondary',
  ink: 'bg-fg-on-dark',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  primary: 'bg-fg-on-dark',
  indigo: 'bg-indigo',
  dark: 'bg-fg-on-dark',
};

/** Status pill. Never relies on colour alone: the label always carries the meaning. */
export function StatusPill({
  tone = 'outline',
  dot,
  children,
  className,
  size = 'md',
}: {
  tone?: PillTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap',
        // DESIGN-DECISION: pill side padding 14px (style guide) over 12px (library)
        size === 'md' ? 'h-7 px-3.5 text-body-sm' : 'h-6 px-2.5 text-caption',
        tones[tone],
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dotTones[tone])} aria-hidden />}
      {children}
    </span>
  );
}

/** Small dot + label used inline ("NPHIES: Cleared"). */
export function StatusDot({ tone, live }: { tone: 'success' | 'warning' | 'error' | 'primary' | 'neutral'; live?: boolean }) {
  const c = { success: 'bg-success', warning: 'bg-warning', error: 'bg-error', primary: 'bg-primary', neutral: 'bg-fg-tertiary' }[tone];
  return <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', c, live && 'live-dot')} aria-hidden />;
}

/** Code chip: click copies the code; shows a tick for 1.2 s. */
export function CodeChip({ code, variant = 'filled', className }: { code: string; variant?: 'filled' | 'outlined'; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1200);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(code).catch(() => undefined);
        setCopied(true);
      }}
      aria-label={copied ? `Copied ${code}` : `Copy code ${code}`}
      className={cn(
        'group inline-flex h-6 items-center gap-1 rounded-sm px-2 text-caption font-medium tabular transition-colors duration-fast',
        'focus-visible:outline-none focus-visible:shadow-focus',
        variant === 'filled'
          ? 'bg-ink text-fg-on-dark hover:bg-ink-hover'
          : 'border border-line-strong text-fg-secondary hover:border-primary hover:text-primary',
        className,
      )}
    >
      {code}
      {copied ? (
        <Check size={12} aria-hidden />
      ) : (
        <Copy size={12} aria-hidden className="opacity-0 transition-opacity duration-fast group-hover:opacity-100 group-focus-visible:opacity-100" />
      )}
      <span className="sr-only" aria-live="polite">{copied ? 'Copied' : ''}</span>
    </button>
  );
}

export type CaseKind = 'Denial' | 'Pre-Auth' | 'Appeal';

/** One chip, three kinds: Denial, Pre-Auth, Appeal. */
export function StatusChip({ kind, refId, onDark }: { kind: CaseKind; refId: string; onDark?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center rounded-sm px-2.5 text-body-sm tabular whitespace-nowrap',
        onDark ? 'border border-line-dark text-fg-on-dark' : 'border border-line-strong bg-surface text-fg',
      )}
    >
      {kind} #{refId}
    </span>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-7 items-center rounded-sm border border-line-strong px-2 text-body-sm text-fg-secondary', className)}>
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-line-strong bg-surface px-1 text-micro font-medium text-fg-secondary">
      {children}
    </kbd>
  );
}
