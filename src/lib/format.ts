export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

export const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
export const fmtAed = (n: number) => `AED ${fmtInt(n)}`;
export const fmtPct = (n: number, digits = 0) => `${n.toFixed(digits)}%`;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const fmtHeaderDate = (d: Date) =>
  `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}, ${d.getFullYear()}`;

export const fmtRowDate = (iso: string) => {
  const d = new Date(iso);
  const h = d.getHours();
  const hh = String(((h + 11) % 12) + 1).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${MONTHS[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${hh}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
};

export const fmtTime = (d: Date) => {
  const h = d.getHours();
  return `${((h + 11) % 12) + 1}:${String(d.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

export const weekdayShort = (d: Date) => WEEKDAYS[d.getDay()].slice(0, 3);

export const greeting = (d: Date) => {
  const h = d.getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

/** mm:ss from milliseconds (session offsets). */
export const fmtClock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

/** "3h left", "1d 6h", "45m left" */
export const fmtCountdown = (ms: number) => {
  if (ms <= 0) return 'Overdue';
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return h > 0 ? `${d}d ${h}h` : `${d}d left`;
  if (h > 0) return `${h}h left`;
  return `${m}m left`;
};

export const durationWords = (days: number) => {
  if (days % 7 === 0) {
    const w = days / 7;
    const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'];
    return `${words[w] ?? w} week${w === 1 ? '' : 's'}`;
  }
  return `${days} days`;
};

export const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
