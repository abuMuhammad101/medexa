import { weekdayShort } from '../lib/format';
import type { Range } from '../store/ui';

export interface SeriesPoint {
  label: string;
  sub: string;
  value: number | null;
  isToday: boolean;
  future: boolean;
}

export type KpiId = 'claims' | 'firstPass' | 'recovered' | 'sla';

const noise = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Axis buckets for a range, anchored on the demo date. */
export function buckets(range: Range, now: Date) {
  if (range === 'today') {
    const hours = [8, 10, 12, 14, 16, 18];
    const cur = now.getHours();
    const idx = Math.max(0, hours.findIndex((h, i) => cur >= h && (i === hours.length - 1 || cur < hours[i + 1])));
    return hours.map((h, i) => ({ label: `${h}:00`, sub: h < 12 ? 'AM' : 'PM', isToday: i === idx, future: i > idx }));
  }
  if (range === 'month') {
    const day = now.getDate();
    const cur = Math.min(4, Math.floor((day - 1) / 7));
    return [0, 1, 2, 3, 4, 5].map((w) => ({
      label: w < 5 ? `Wk ${w + 1}` : 'Next',
      sub: String(Math.min(w * 7 + 1, 31)),
      isToday: w === cur,
      future: w > cur,
    }));
  }
  // week: Mon..Sat of the demo week
  const dow = now.getDay(); // 0 Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((dow + 6) % 7));
  const todayIdx = (dow + 6) % 7; // Sun -> 6 (after Sat: all past)
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { label: weekdayShort(d), sub: String(d.getDate()), isToday: i === todayIdx, future: i > todayIdx };
  });
}

const PROFILE: Record<KpiId, { mean: number; spread: number; salt: number }> = {
  claims: { mean: 52, spread: 22, salt: 1 },
  firstPass: { mean: 76, spread: 12, salt: 2 },
  recovered: { mean: 60, spread: 26, salt: 3 },
  sla: { mean: 14, spread: 8, salt: 4 },
};

export function series(kpi: KpiId, range: Range, now: Date): SeriesPoint[] {
  const p = PROFILE[kpi];
  const salt = p.salt + (range === 'today' ? 10 : range === 'month' ? 20 : 0);
  return buckets(range, now).map((b, i) => ({
    ...b,
    value: b.future ? null : Math.round(p.mean + (noise(i, salt) - 0.5) * 2 * p.spread),
  }));
}

/** Dense series for area charts (8 samples per bucket) so the line reads as a trend. */
export function denseSeries(kpi: KpiId, range: Range, now: Date) {
  const base = series(kpi, range, now);
  const p = PROFILE[kpi];
  const out: { x: number; value: number | null }[] = [];
  base.forEach((b, i) => {
    for (let k = 0; k < 8; k++) {
      const x = i + k / 8;
      out.push({ x, value: b.value == null ? null : Math.round(b.value + (noise(i * 8 + k, p.salt + 40) - 0.5) * p.spread * 0.9) });
    }
  });
  return { base, dense: out };
}

export const qualify = (kpi: KpiId, v: number) => {
  const p = PROFILE[kpi];
  const good = kpi === 'sla' ? v < p.mean : v >= p.mean;
  return good ? 'Good' : 'Low';
};

export function rangeValue(kpi: KpiId, range: Range, base: number) {
  const m: Record<KpiId, Record<Range, number>> = {
    claims: { today: 1, week: 1, month: 1 },
    firstPass: { today: 0.97, week: 1, month: 1.03 },
    recovered: { today: 0.16, week: 1, month: 4.3 },
    sla: { today: 1, week: 1, month: 2.4 },
  };
  return base * m[kpi][range];
}
