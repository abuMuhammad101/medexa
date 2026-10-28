/**
 * The agent's presence. States: idle, listening (breathing, scales with audio
 * level), thinking (rings rotate), paused (static, desaturated), error (amber).
 */
import { cn } from '../../lib/format';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'paused' | 'error';

export function Orb({ state, level = 0 }: { state: OrbState; level?: number }) {
  const scale = state === 'listening' ? 1 + Math.min(level, 1) * 0.06 : 1;
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute -bottom-40 -right-30 h-[34rem] w-[34rem] transition-[filter] duration-slow',
        state === 'paused' && 'grayscale',
        state === 'idle' && 'opacity-70',
      )}
      style={{ filter: state === 'error' ? 'sepia(0.8) saturate(2.2) hue-rotate(-12deg)' : undefined }}
    >
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            inset: `${i * 9}%`,
            background: 'var(--orb-ring)',
            animation:
              state === 'listening'
                ? `breathe ${4 + i}s ease-in-out ${i * 0.3}s infinite`
                : state === 'thinking'
                  ? `spin-slow ${8 + i * 3}s linear infinite`
                  : undefined,
            border: state === 'thinking' ? 'var(--hairline) dashed var(--color-indigo)' : undefined,
          }}
        />
      ))}
      <div
        className="absolute rounded-full transition-transform duration-fast"
        style={{
          inset: '36%',
          background: 'var(--orb-core)',
          boxShadow: 'var(--ai-glow-shadow)',
          transform: `scale(${scale})`,
          animation: state === 'listening' ? 'breathe 3s ease-in-out infinite' : undefined,
        }}
      />
      {/* wave texture */}
      <svg viewBox="0 0 100 100" className="absolute opacity-40" style={{ inset: '36%' }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            d={`M0 ${40 + i * 6} Q 25 ${34 + i * 6 - level * 8}, 50 ${40 + i * 6} T 100 ${40 + i * 6}`}
            fill="none"
            stroke="var(--color-text-on-dark)"
            strokeWidth="0.4"
          />
        ))}
      </svg>
    </div>
  );
}
