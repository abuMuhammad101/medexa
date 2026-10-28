import { createContext, useContext, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Quote } from 'lucide-react';
import { MeterBar } from '../../components/ui';
import { CLINICIAN } from '../../mocks/fixtures';
import { fmtClock } from '../../lib/format';
import type { TranscriptTurn } from '../../store/types';
import { Spark } from '../shell/Brand';

export const TurnsContext = createContext<{ turns: TranscriptTurn[]; firstName: string }>({ turns: [], firstName: '' });

/**
 * Evidence trail. Any AI statement shows a "From transcript mm:ss" tag on
 * hover/focus; opening it explains "Why Medexa thinks this".
 */
export function Evidence({ turnIds = [], rule, confidence = 0.9, children }: { turnIds?: string[]; rule?: string; confidence?: number; children: ReactNode }) {
  const { turns, firstName } = useContext(TurnsContext);
  const quotes = turns.filter((t) => turnIds.includes(t.id));
  if (!quotes.length && !rule) return <>{children}</>;
  const first = quotes[0];
  return (
    <div className="group relative">
      {children}
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            className="absolute -top-2.5 right-2 inline-flex h-6 items-center gap-1 rounded-full border border-line bg-surface px-2 text-caption text-fg-secondary opacity-0 shadow-xs transition-opacity duration-fast hover:text-primary focus-visible:opacity-100 focus-visible:outline-none focus-visible:shadow-focus group-focus-within:opacity-100 group-hover:opacity-100"
            aria-label={`Why Medexa thinks this${first ? `, from transcript ${fmtClock(first.atMs)}` : ''}`}
          >
            <Spark size={12} />
            {first ? `From transcript ${fmtClock(first.atMs)}` : 'Why?'}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side="top" align="end" sideOffset={6} className="ai-ring z-[70] w-80 rounded-lg bg-surface p-4 shadow-modal focus:outline-none">
            <p className="flex items-center gap-1.5 text-body font-medium text-fg">
              <Spark size={16} /> Why Medexa thinks this
            </p>
            {quotes.map((q) => (
              <blockquote key={q.id} className="mt-3 rounded-md bg-surface-muted p-3 text-body-sm text-fg">
                <Quote size={12} className="mb-1 text-fg-tertiary" aria-hidden />
                <span className="tabular text-fg-tertiary">{fmtClock(q.atMs)}</span> {q.speaker === 'clinician' ? CLINICIAN.name : firstName}: {q.text}
              </blockquote>
            ))}
            {rule && (
              <p className="mt-3 text-body-sm text-fg-secondary">
                <span className="font-medium text-fg">Rule:</span> {rule}
              </p>
            )}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-caption text-fg-secondary">Confidence</span>
              <div className="flex-1">
                <MeterBar value={confidence * 100} tone="primary" label="Confidence" />
              </div>
              <span className="text-caption font-medium tabular">{Math.round(confidence * 100)}%</span>
            </div>
            <Popover.Arrow className="fill-surface" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
