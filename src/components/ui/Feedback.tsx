import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, RotateCw, X, XCircle } from 'lucide-react';
import { cn } from '../../lib/format';
import { useToasts, type Toast } from '../../store/toast';
import { Button, IconButton } from './Button';

const toneIcon = {
  info: <Info size={20} className="text-primary" aria-hidden />,
  success: <CheckCircle2 size={20} className="text-success" aria-hidden />,
  warning: <AlertTriangle size={20} className="text-warning" aria-hidden />,
  error: <XCircle size={20} className="text-error" aria-hidden />,
};

function ToastItem({ t }: { t: Toast }) {
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const id = setTimeout(() => dismiss(t.id), t.durationMs);
    return () => clearTimeout(id);
  }, [t.id, t.durationMs, dismiss]);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.98 }}
      transition={{ duration: 0.2 }}
      role={t.tone === 'error' ? 'alert' : 'status'}
      className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border border-line bg-surface p-4 shadow-modal"
    >
      {toneIcon[t.tone]}
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-fg">{t.title}</p>
        {t.body && <p className="mt-0.5 text-body-sm text-fg-secondary">{t.body}</p>}
      </div>
      {t.action && (
        <Button
          size="sm"
          variant="tinted"
          onClick={() => {
            t.action!.onClick();
            dismiss(t.id);
          }}
        >
          {t.action.label}
        </Button>
      )}
      <IconButton aria-label="Dismiss notification" size="sm" onClick={() => dismiss(t.id)}>
        <X size={16} />
      </IconButton>
    </motion.div>
  );
}

/** Toast region: queue of 3, polite live region. */
export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-6 right-6 z-[90] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastItem key={t.id} t={t} />
        ))}
      </AnimatePresence>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-sm', className)} aria-hidden />;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 px-6 py-10 text-center', className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-subtle text-primary">{icon}</div>
      <p className="text-h4 font-medium text-fg">{title}</p>
      {body && <p className="max-w-sm text-body text-fg-secondary">{body}</p>}
      {action}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  body,
  onRetry,
  compact,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex items-start gap-3 rounded-md border border-error bg-error-bg text-error-text',
        compact ? 'p-3' : 'p-4',
      )}
    >
      <XCircle size={20} aria-hidden className="mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-body font-medium">{title}</p>
        {body && <p className="text-body-sm">{body}</p>}
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} leading={<RotateCw size={16} aria-hidden />}>
          Retry
        </Button>
      )}
    </div>
  );
}

/** Small toggleable "Demo data" badge for the footer. */
export function DemoBadge() {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-line-strong bg-surface-glass px-2.5 text-caption text-fg-secondary glass">
      <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden />
      Demo data: all patients and IDs are fictional
    </span>
  );
}
