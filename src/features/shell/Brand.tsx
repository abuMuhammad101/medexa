import { cn } from '../../lib/format';

/** Medexa mark: three slanted strokes plus the AI spark. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 28" className={cn('h-7 w-10', className)} aria-hidden>
      <path d="M2 24 L9 4 L13 4 L6 24 Z" fill="var(--color-primary)" />
      <path d="M11 24 L18 4 L22 4 L15 24 Z" fill="var(--color-primary)" />
      <path d="M20 24 L27 4 L31 4 L24 24 Z" fill="var(--color-primary)" />
      <path d="M35 1 l1 2.5 2.5 1 -2.5 1 -1 2.5 -1 -2.5 -2.5 -1 2.5 -1 z" fill="var(--ai-glow-3)" />
    </svg>
  );
}

export function Spark({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden>
      <defs>
        <linearGradient id="spark-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--ai-glow-1)" />
          <stop offset="50%" stopColor="var(--ai-glow-2)" />
          <stop offset="100%" stopColor="var(--ai-glow-3)" />
        </linearGradient>
      </defs>
      <path d="M12 2 l2.4 6.6 L21 11 l-6.6 2.4 L12 20 l-2.4 -6.6 L3 11 l6.6 -2.4 z" fill="url(#spark-g)" />
      <path d="M19 2 l0.8 2.2 2.2 0.8 -2.2 0.8 -0.8 2.2 -0.8 -2.2 -2.2 -0.8 2.2 -0.8 z" fill="var(--ai-glow-3)" />
    </svg>
  );
}

export function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2">
      <Spark size={24} />
      <span className="text-h2 font-semibold text-primary">medexa</span>
    </span>
  );
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name
    .replace(/^Dr\.\s*/, '')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('');
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-ai-glow font-semibold text-fg-on-dark',
        size === 'sm' ? 'h-8 w-8 text-caption' : size === 'md' ? 'h-10 w-10 text-body-sm' : 'h-12 w-12 text-body',
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
