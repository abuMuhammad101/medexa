import type { ReactNode } from 'react';
import { cn } from '../../lib/format';

export interface StepDef {
  title: string;
  description: string;
  icon?: ReactNode;
}

/** Timeline stepper: three nodes on a line, every node is a button. */
export function TimelineStepper({
  steps,
  active,
  visited,
  onSelect,
}: {
  steps: StepDef[];
  active: number;
  visited: boolean[];
  onSelect: (i: number) => void;
}) {
  return (
    <nav aria-label="Review steps" className="relative w-full overflow-hidden">
      <div className="relative mx-auto flex h-40 items-end">
        <div className="absolute inset-x-0 bottom-4 h-0.5 bg-line-strong" aria-hidden />
        <ol className="relative h-full w-full">
          {steps.map((s, i) => {
            const isActive = i === active;
            return (
              <li
                key={s.title}
                className="absolute bottom-0 flex w-1/2 -translate-x-1/2 flex-col items-center px-4 transition-[left] ease-standard"
                style={{ left: `${50 + (i - active) * 48}%`, transitionDuration: 'var(--dur-carousel)' }}
              >
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  aria-current={isActive ? 'step' : undefined}
                  className="group flex flex-col items-center gap-2 rounded-md text-center focus-visible:outline-none focus-visible:shadow-focus"
                >
                  <span
                    className={cn(
                      'flex items-center gap-2 font-medium transition-all duration-base',
                      isActive ? 'text-h1 text-ink' : 'text-h2 text-indigo opacity-60 group-hover:opacity-100',
                    )}
                  >
                    {s.title}
                    {s.icon}
                  </span>
                  <span className={cn('max-w-sm text-body', isActive ? 'text-fg' : 'text-fg-secondary opacity-70')}>{s.description}</span>
                  <span
                    className={cn(
                      'mt-6 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-primary-subtle transition-colors duration-base',
                      isActive ? 'border-primary' : visited[i] ? 'border-success' : 'border-indigo opacity-70',
                    )}
                    aria-hidden
                  />
                  <span className="sr-only">
                    Step {i + 1} of {steps.length}
                    {visited[i] ? ', visited' : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

/** "Step 02/ 03" plus a segmented progress bar. */
export function StepProgress({ active, total, visited }: { active: number; total: number; visited: boolean[] }) {
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <p className="text-h2 text-fg">
        Step {String(active + 1).padStart(2, '0')}/ <span className="text-body-lg text-fg-secondary">{String(total).padStart(2, '0')}</span>
      </p>
      <div className="flex items-center gap-2" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              'h-2 rounded-full transition-all ease-standard',
              i === active ? 'w-16 bg-primary' : visited[i] ? 'w-6 bg-indigo' : 'w-6 bg-line-strong',
            )}
            style={{ transitionDuration: 'var(--dur-carousel)' }}
          />
        ))}
      </div>
    </div>
  );
}
