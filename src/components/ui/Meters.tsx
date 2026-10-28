import { useEffect, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/format';

/** Animate a number toward `value` (400 ms default; instant under reduced motion). */
export function useAnimatedNumber(value: number, duration = 0.4) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const c = animate(display, value, { duration, ease: 'easeOut', onUpdate: setDisplay });
    return () => c.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce, duration]);
  return display;
}

const barTone = { success: 'bg-success', primary: 'bg-indigo', warning: 'bg-warning', error: 'bg-error' };

/** Horizontal meter. Animates from 0 on mount and eases over 500 ms on change. */
export function MeterBar({ value, tone = 'success', label }: { value: number; tone?: keyof typeof barTone; label: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 10) / 10}
      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken"
    >
      <div
        className={cn('h-full rounded-full transition-[width] ease-standard', barTone[tone])}
        style={{ width: mounted ? `${pct}%` : '0%', transitionDuration: 'var(--dur-meter)' }}
      />
    </div>
  );
}

export function MeterRow({ label, value, tone = 'success' }: { label: string; value: number; tone?: keyof typeof barTone }) {
  const shown = useAnimatedNumber(value, 0.5);
  const dot = tone === 'success' ? 'bg-success' : tone === 'primary' ? 'bg-indigo' : tone === 'warning' ? 'bg-warning' : 'bg-error';
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-body">
        <span className="flex items-center gap-2 text-fg-secondary">
          <span className={cn('h-1.5 w-1.5 rounded-full', dot)} aria-hidden />
          {label}
        </span>
        <span className="font-semibold tabular text-fg">{shown.toFixed(1)}%</span>
      </div>
      <MeterBar value={value} tone={tone} label={label} />
    </div>
  );
}

/** Circular progress ring with a 600 ms sweep on change. */
export function ProgressRing({
  value,
  size = 44,
  stroke = 4,
  tone = 'primary',
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  tone?: 'primary' | 'success' | 'warning' | 'error';
  label: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const color = { primary: 'stroke-primary', success: 'stroke-success', warning: 'stroke-warning', error: 'stroke-error' }[tone];
  return (
    <div role="img" aria-label={`${label}: ${Math.round(pct)}%`} className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-sunken" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className={cn(color, 'transition-[stroke-dashoffset] ease-standard')}
          style={{ strokeDasharray: c, strokeDashoffset: c * (1 - pct / 100), transitionDuration: 'var(--dur-ring)' }}
        />
      </svg>
      <span className="absolute text-caption font-semibold tabular text-fg">{Math.round(pct)}%</span>
    </div>
  );
}
