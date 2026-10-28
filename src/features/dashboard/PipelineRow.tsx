/**
 * Live Agent Pipeline (below the fold; not visible in Figma).
 * DESIGN-DECISION: five stage cards, first with the blue-to-teal header.
 * Counts drift on the simulation clock and always sum to Claims In Flight.
 */
import { Bot } from 'lucide-react';
import { STAGES, pipelineTotal, usePipeline } from '../../engine/pipeline';
import { cn, fmtInt } from '../../lib/format';
import { StatusDot } from '../../components/ui';
import { useAnimatedNumber } from '../../components/ui/Meters';

function Count({ value }: { value: number }) {
  const v = useAnimatedNumber(value);
  return <>{fmtInt(v)}</>;
}

export function PipelineRow() {
  const counts = usePipeline((s) => s.counts);
  const atRisk = usePipeline((s) => s.atRisk);
  const filter = usePipeline((s) => s.filter);
  const setFilter = usePipeline((s) => s.setFilter);
  const total = pipelineTotal(counts);
  return (
    <section aria-labelledby="pipeline-h" className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 id="pipeline-h" className="flex items-center gap-2 text-h3 font-medium text-ink dark:text-fg">
          Live Agent Pipeline <StatusDot tone="success" live />
          <span className="sr-only">live</span>
        </h2>
        <p className="text-body text-fg-secondary tabular">
          <Count value={total} /> claims in flight
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {STAGES.map((s, i) => {
          const risk = atRisk[s.id];
          const active = filter === s.id;
          return (
            <li key={s.id}>
              <button
                onClick={() => setFilter(active ? null : s.id)}
                aria-pressed={active}
                aria-label={`${s.label}: ${counts[s.id]} claims, ${risk} at SLA risk, ${s.agent}. ${active ? 'Clear filter' : 'Filter encounters by this stage'}`}
                className={cn(
                  'flex w-full flex-col overflow-hidden rounded-xl border bg-surface text-left shadow-xs transition-[box-shadow,transform] duration-base ease-standard',
                  'hover:-translate-y-0.5 hover:shadow-hover focus-visible:outline-none focus-visible:shadow-focus',
                  active ? 'border-primary' : 'border-line',
                )}
              >
                <div className={cn('flex items-center justify-between px-4 py-3', i === 0 ? 'bg-pipeline-head text-fg-on-dark' : 'border-b border-line text-fg')}>
                  <span className="text-body font-medium">
                    {i + 1}. {s.label}
                  </span>
                  <Bot size={16} aria-hidden />
                </div>
                <div className="flex flex-col gap-2 px-4 py-4">
                  <span className="text-stat font-semibold tabular text-fg">
                    <Count value={counts[s.id]} />
                  </span>
                  <span className="flex items-center gap-2 text-body-sm">
                    <StatusDot tone={risk >= 6 ? 'error' : risk >= 3 ? 'warning' : 'success'} />
                    <span className={risk >= 6 ? 'text-error-text' : risk >= 3 ? 'text-warning-text' : 'text-success-text'}>
                      {risk === 0 ? 'Within SLA' : `${risk} at SLA risk`}
                    </span>
                    <span className="text-fg-tertiary">· {s.slaHours}h SLA</span>
                  </span>
                  <span className="text-body-sm text-fg-secondary">{s.agent} working</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
