import { forwardRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { CalendarClock, Check, ChevronRight, FileText, MoreHorizontal, Undo2, X } from 'lucide-react';
import { cn, fmtRowDate } from '../../lib/format';
import type { NphiesStatus } from '../../store/types';
import { Button, IconButton } from './Button';
import { Menu, type MenuItem } from './Overlay';
import { StatusDot, Tag } from './Pills';

export type SuggestionRowState = 'pending' | 'kept' | 'dismissed';

/** Suggestion row: tag, text, Keep, dismiss. Dismissed shows Undo. */
export const SuggestionRow = forwardRef<
  HTMLDivElement,
  {
    tag: string;
    text: ReactNode;
    state: SuggestionRowState;
    onKeep: () => void;
    onDismiss: () => void;
    onUndo?: () => void;
    footer?: ReactNode;
    highlight?: boolean;
    disabled?: boolean;
    onFocus?: () => void;
  }
>(function SuggestionRow({ tag, text, state, onKeep, onDismiss, onUndo, footer, highlight, disabled, onFocus }, ref) {
  if (state === 'dismissed') {
    return (
      <div ref={ref} className="flex items-center justify-between gap-3 rounded-md bg-surface-muted px-3 py-2 text-body-sm text-fg-secondary">
        <span>Suggestion dismissed.</span>
        {onUndo && (
          <Button size="sm" variant="ghost" onClick={onUndo} leading={<Undo2 size={16} aria-hidden />}>
            Undo
          </Button>
        )}
      </div>
    );
  }
  return (
    <div
      ref={ref}
      tabIndex={-1}
      onFocus={onFocus}
      data-suggestion
      className={cn(
        'rounded-md p-2 outline-none transition-colors duration-base focus-within:bg-primary-subtle focus:bg-primary-subtle',
        highlight && 'pulse-highlight',
      )}
    >
      <Tag className={state === 'kept' ? 'border-success text-success-text' : undefined}>
        {state === 'kept' && <Check size={12} className="mr-1" aria-hidden />}
        {tag}
      </Tag>
      <div className="mt-3 flex items-start gap-4">
        <p className="flex-1 text-body-lg text-fg">{text}</p>
        <div className="flex shrink-0 items-center gap-1">
          <motion.div whileTap={{ scale: 0.92 }} animate={state === 'kept' ? { scale: [1, 1.08, 1] } : {}} transition={{ type: 'spring', stiffness: 500, damping: 18 }}>
            <Button
              size="sm"
              variant={state === 'kept' ? 'tinted' : 'outline'}
              onClick={onKeep}
              disabled={disabled}
              aria-pressed={state === 'kept'}
              leading={<Check size={16} aria-hidden />}
            >
              {state === 'kept' ? 'Kept' : 'Keep'}
            </Button>
          </motion.div>
          <IconButton aria-label="Dismiss suggestion" size="sm" onClick={onDismiss} disabled={disabled}>
            <X size={20} />
          </IconButton>
        </div>
      </div>
      {footer}
    </div>
  );
});

const nphiesMeta: Record<NphiesStatus, { label: string; tone: 'success' | 'warning' | 'error' }> = {
  cleared: { label: 'Cleared', tone: 'success' },
  queued: { label: 'Queued', tone: 'warning' },
  inactive: { label: 'Inactive', tone: 'error' },
};

export function EncounterRow({
  name,
  nphies,
  scheduledAt,
  refId,
  menu,
  onOpen,
  badge,
}: {
  name: string;
  nphies: NphiesStatus;
  scheduledAt: string;
  refId: string;
  menu: MenuItem[];
  onOpen: () => void;
  badge?: ReactNode;
}) {
  const m = nphiesMeta[nphies];
  return (
    <li className="group relative flex items-center gap-3 border-b border-line px-6 py-3.5 transition-colors duration-fast hover:bg-surface-muted">
      <button
        type="button"
        onClick={onOpen}
        className="absolute inset-0 focus-visible:outline-none focus-visible:shadow-focus"
        aria-label={`Open encounter for ${name}, NPHIES ${m.label}, ${fmtRowDate(scheduledAt)}`}
      />
      <div className="pointer-events-none min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-lg text-fg">
          <span className="font-medium">{name}</span>
          <span className="inline-flex items-center gap-1.5 text-body">
            <StatusDot tone={m.tone} />
            <span className="text-fg-secondary">NPHIES:</span>
            <span className="text-fg">{m.label}</span>
          </span>
          {badge}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-body font-medium text-fg-secondary">
          <span className="inline-flex items-center gap-1.5 tabular">
            <CalendarClock size={16} aria-hidden /> {fmtRowDate(scheduledAt)}
          </span>
          <span className="inline-flex items-center gap-1.5 tabular">
            <FileText size={16} aria-hidden /> Ref ID: {refId}
          </span>
        </p>
      </div>
      <div className="relative flex items-center gap-1 opacity-100 transition-opacity duration-fast md:opacity-60 md:group-hover:opacity-100 md:focus-within:opacity-100">
        <Menu
          items={menu}
          trigger={
            <IconButton aria-label={`More actions for ${name}`} size="md">
              <MoreHorizontal size={20} />
            </IconButton>
          }
        />
        <IconButton aria-label={`Open ${name}`} size="md" onClick={onOpen}>
          <ChevronRight size={20} />
        </IconButton>
      </div>
    </li>
  );
}
