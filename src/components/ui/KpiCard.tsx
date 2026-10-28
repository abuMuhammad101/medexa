import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/format';
import { IconButton } from './Button';
import { Skeleton } from './Feedback';
import { useAnimatedNumber } from './Meters';

export function KpiCard({
  title,
  value,
  format,
  unit,
  caption,
  alert,
  chart,
  loading,
  onDrill,
}: {
  title: string;
  value: number;
  format: (v: number) => string;
  unit?: string;
  caption: string;
  alert?: boolean;
  chart?: ReactNode;
  loading?: boolean;
  onDrill?: () => void;
}) {
  const shown = useAnimatedNumber(value);
  return (
    <section
      aria-label={title}
      className="group flex min-w-0 flex-col rounded-lg border border-line bg-surface p-4 shadow-xs transition-[box-shadow,transform] duration-base ease-standard hover:-translate-y-0.5 hover:shadow-hover"
    >
      <header className="flex items-start justify-between gap-2">
        <h3 className="text-body-lg text-fg-secondary">{title}</h3>
        <IconButton aria-label={`Open ${title} queue`} size="sm" variant="outline" onClick={onDrill}>
          <ChevronRight size={16} />
        </IconButton>
      </header>
      {loading ? (
        <>
          <Skeleton className="mt-2 h-8 w-30" />
          <Skeleton className="mt-4 h-20 w-full" />
          <Skeleton className="mt-4 h-4 w-40" />
        </>
      ) : (
        <>
          <p className={cn('mt-1 text-stat font-semibold tabular', alert ? 'text-error-text' : 'text-fg')} aria-live="polite">
            {format(shown)}
            {unit && <span className="ml-1 text-caption font-normal text-fg-tertiary">{unit}</span>}
            {alert && <span className="sr-only"> (above threshold)</span>}
          </p>
          <div className="mt-3 flex-1">{chart}</div>
          <p className="mt-3 text-body text-fg-secondary">{caption}</p>
        </>
      )}
    </section>
  );
}
