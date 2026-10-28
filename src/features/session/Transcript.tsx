import type { ReactNode } from 'react';
import { Tooltip } from '../../components/ui';
import { CLINICIAN } from '../../mocks/fixtures';
import { cn, fmtClock } from '../../lib/format';
import type { TranscriptTurn } from '../../store/types';

const OPACITY = ['opacity-100', 'opacity-80', 'opacity-60', 'opacity-40', 'opacity-25', 'opacity-10'];

function withTerms(turn: TranscriptTurn, onTerm: (key: string) => void): ReactNode {
  if (!turn.terms.length) return turn.text;
  const parts: ReactNode[] = [];
  let rest = turn.text;
  let i = 0;
  for (const t of turn.terms) {
    const at = rest.indexOf(t.term);
    if (at < 0) continue;
    parts.push(rest.slice(0, at));
    parts.push(
      <Tooltip
        key={i++}
        content={
          <span>
            {t.normalized}
            {t.suggestionKey && <span className="block text-fg-on-dark-muted">Click to view the suggestion</span>}
          </span>
        }
      >
        <button
          type="button"
          onClick={() => t.suggestionKey && onTerm(t.suggestionKey)}
          className="mx-0.5 rounded-xs bg-ink px-1 text-fg-on-dark hover:bg-primary focus-visible:outline-none focus-visible:shadow-focus"
          aria-label={`${t.term}: ${t.normalized}${t.suggestionKey ? '. Show suggestion' : ''}`}
        >
          {t.term}
        </button>
      </Tooltip>,
    );
    rest = rest.slice(at + t.term.length);
  }
  parts.push(rest);
  return parts;
}

export function Transcript({
  turns,
  patientFirstName,
  onTerm,
  command,
}: {
  turns: TranscriptTurn[];
  patientFirstName: string;
  onTerm: (key: string) => void;
  command: { atMs: number } | null;
}) {
  const shown = turns.slice(-6);
  const latest = shown[shown.length - 1];
  return (
    <div className="relative mx-auto w-full max-w-xl">
      {/* polite announcement for each new line, not every word */}
      <p className="sr-only" aria-live="polite">
        {latest ? `${latest.speaker === 'clinician' ? CLINICIAN.name : patientFirstName}: ${latest.text}` : ''}
      </p>
      <ol className="flex flex-col gap-5" aria-label="Live transcript">
        {shown.map((t, idx) => {
          const age = shown.length - 1 - idx;
          const newest = age === 0 && !command;
          return (
            <li key={t.id} className={cn('grid grid-cols-[auto_1fr] gap-x-6 transition-opacity duration-slow', command ? OPACITY[age + 1] : OPACITY[age])}>
              <span className="pt-0.5 text-body-lg text-fg-secondary tabular">{fmtClock(t.atMs)}</span>
              <p className={cn('text-body-lg', newest ? 'text-fg' : 'text-fg-secondary')}>
                {t.speaker === 'clinician' ? CLINICIAN.name : patientFirstName}: {newest ? withTerms(t, onTerm) : t.text}
              </p>
            </li>
          );
        })}
        {command && (
          <li className="grid grid-cols-[auto_1fr] gap-x-6">
            <span className="pt-0.5 text-body-lg text-fg-secondary tabular">{fmtClock(command.atMs)}</span>
            <p className="text-body-lg text-fg">
              {CLINICIAN.name}: <span className="animate-pulse rounded-xs bg-primary px-1 font-semibold text-fg-on-dark">Stop</span> recording.
            </p>
          </li>
        )}
      </ol>
    </div>
  );
}
