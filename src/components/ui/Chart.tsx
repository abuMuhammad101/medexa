/**
 * ChartCard body: area or bar chart with a day axis, today marker, future
 * buckets greyed, pointer scrub and keyboard scrub (arrow keys).
 * DESIGN-DECISION: hand-rolled SVG instead of Recharts so the scrub tooltip,
 * keyboard equivalent and token colours are fully controlled.
 */
import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '../../lib/format';
import type { SeriesPoint } from '../../engine/kpi';

const W = 260;
const H = 70;

export function MiniChart({
  kind,
  base,
  dense,
  format,
  qualify,
  label,
}: {
  kind: 'area' | 'bar';
  base: SeriesPoint[];
  dense?: { x: number; value: number | null }[];
  format: (v: number) => string;
  qualify: (v: number) => string;
  label: string;
}) {
  const gid = useId().replace(/:/g, '');
  const n = base.length;
  const todayIdx = Math.max(0, base.findIndex((b) => b.isToday));
  const [active, setActive] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const max = useMemo(() => {
    const vals = (dense ?? base).map((p) => p.value ?? 0);
    return Math.max(...vals, 1) * 1.15;
  }, [base, dense]);

  const colW = W / n;
  const xOf = (i: number) => i * colW + colW / 2;
  const yOf = (v: number) => H - (v / max) * H;

  const areaPath = useMemo(() => {
    if (kind !== 'area' || !dense) return { line: '', fill: '' };
    const pts = dense.filter((p) => p.value != null).map((p) => [p.x * colW + colW / 8, yOf(p.value as number)] as const);
    if (!pts.length) return { line: '', fill: '' };
    const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const fill = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H} L${pts[0][0].toFixed(1)},${H} Z`;
    return { line, fill };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dense, kind, max, colW]);

  const onMove = (e: PointerEvent) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return;
    const i = Math.floor(((e.clientX - r.left) / r.width) * n);
    const clamped = Math.max(0, Math.min(n - 1, i));
    setActive(base[clamped].value == null ? null : clamped);
  };

  const onKey = (e: KeyboardEvent) => {
    const lastPast = base.reduce((acc, b, i) => (b.value != null ? i : acc), 0);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const cur = active ?? todayIdx;
      const next = Math.max(0, Math.min(lastPast, cur + (e.key === 'ArrowRight' ? 1 : -1)));
      setActive(next);
    } else if (e.key === 'Escape') setActive(null);
  };

  const shown = active ?? null;
  const tip = shown != null && base[shown].value != null ? base[shown] : null;

  return (
    <div className="relative">
      {/* axis labels */}
      <div className="grid text-center" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }} aria-hidden>
        {base.map((b, i) => (
          <div key={i} className={cn('flex flex-col', b.future ? 'text-fg-tertiary' : 'text-fg-secondary')}>
            <span className="text-micro">{b.label}</span>
            <span className={cn('text-caption tabular', b.isToday && 'font-semibold text-fg')}>{b.sub}</span>
          </div>
        ))}
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H + 8}`}
        className="mt-2 block w-full cursor-crosshair overflow-visible rounded-xs focus-visible:outline-none focus-visible:shadow-focus"
        role="img"
        tabIndex={0}
        aria-label={`${label} chart. Use left and right arrow keys to read values.`}
        onPointerMove={onMove}
        onPointerLeave={() => setActive(null)}
        onKeyDown={onKey}
        onBlur={() => setActive(null)}
      >
        <defs>
          <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-indigo)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--color-indigo)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={`b${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-indigo)" stopOpacity="0.85" />
            <stop offset="100%" stopColor="var(--color-indigo)" stopOpacity="0.08" />
          </linearGradient>
        </defs>

        {kind === 'area' && (
          <>
            <path d={areaPath.fill} fill={`url(#g${gid})`} />
            <path d={areaPath.line} fill="none" stroke="var(--color-indigo)" strokeWidth="1.5" />
            {/* projection for the rest of today */}
            <line x1={xOf(todayIdx)} x2={W} y1={H - 18} y2={H - 18} stroke="var(--color-primary)" strokeDasharray="3 3" strokeWidth="1" />
          </>
        )}

        {kind === 'bar' &&
          base.map((b, i) => {
            const x = i * colW + 6;
            const w = colW - 12;
            const v = b.value ?? 0;
            const top = yOf(v);
            return (
              <g key={i}>
                <rect x={x} y={0} width={w} height={H} rx="3" fill="var(--color-surface-sunken)" />
                {!b.future && (
                  <rect
                    x={x}
                    y={top}
                    width={w}
                    height={H - top}
                    rx="3"
                    fill={b.isToday ? `url(#b${gid})` : 'var(--color-primary-subtle-strong)'}
                    opacity={active == null || active === i ? 1 : 0.55}
                  />
                )}
              </g>
            );
          })}

        {/* today marker */}
        <line x1={xOf(todayIdx)} x2={xOf(todayIdx)} y1={0} y2={H} stroke="var(--color-primary)" strokeDasharray="2 3" strokeWidth="1" opacity="0.6" />
        <circle cx={xOf(todayIdx)} cy={2} r="2.5" fill="var(--color-primary)" />

        {/* scrub guide */}
        {tip && shown != null && (
          <line x1={xOf(shown)} x2={xOf(shown)} y1={0} y2={H} stroke="var(--color-ink)" strokeDasharray="3 3" strokeWidth="1" />
        )}
      </svg>
      {tip && shown != null && (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -translate-x-1/2 whitespace-nowrap rounded-xs border border-line bg-surface px-2 py-0.5 text-caption text-fg shadow-raised"
          style={{ left: `${((shown + 0.5) / n) * 100}%`, bottom: 'var(--space-200)' }}
        >
          <span className="font-semibold text-primary tabular">{format(tip.value!)}</span>: {qualify(tip.value!)} count on {tip.label}
        </div>
      )}
    </div>
  );
}
