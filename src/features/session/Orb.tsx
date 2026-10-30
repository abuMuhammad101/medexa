/**
 * The agent's presence: a looping sphere render. States: idle (dimmed), listening
 * (breathing, scales with audio level), thinking (faster playback), paused (frozen,
 * desaturated), error (amber).
 */
import { useEffect, useRef } from 'react';
import { cn } from '../../lib/format';
import { useUi } from '../../store/ui';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'paused' | 'error';

export function Orb({ state, level = 0 }: { state: OrbState; level?: number }) {
  const ref = useRef<HTMLVideoElement>(null);
  const dark = useUi((s) => s.theme) === 'dark';
  const scale = state === 'listening' ? 1 + Math.min(level, 1) * 0.06 : 1;

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.playbackRate = state === 'thinking' ? 2 : 1;
    if (state === 'paused') v.pause();
    else void v.play().catch(() => undefined);
  }, [state]);

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute -bottom-30 -right-20 h-[26rem] w-[26rem] transition-[filter,opacity] duration-slow',
        state === 'paused' && 'grayscale',
        state === 'idle' ? 'opacity-40' : 'opacity-60',
      )}
      style={{ filter: state === 'error' ? 'sepia(0.8) saturate(2.2) hue-rotate(-12deg)' : undefined }}
    >
      <video
        ref={ref}
        src={`${import.meta.env.BASE_URL}orb.mp4`}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        tabIndex={-1}
        className={cn('h-full w-full object-cover transition-transform duration-fast', dark ? 'mix-blend-screen' : 'mix-blend-multiply')}
        style={{
          transform: `scale(${scale})`,
          // dark: black melts into the page (screen), lines glow. light: invert so the black
          // becomes white and multiply lets the page show through, leaving teal ink.
          filter: dark ? 'brightness(1.25) contrast(1.15) saturate(1.2)' : 'invert(1) hue-rotate(180deg) saturate(1.5) contrast(1.1)',
          maskImage: 'radial-gradient(circle closest-side, black 70%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(circle closest-side, black 70%, transparent 100%)',
        }}
      />
    </div>
  );
}
