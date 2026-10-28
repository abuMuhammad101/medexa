/**
 * The single simulation clock. Every domain timer reads from here so the
 * Demo director's speed control (1x, 2x, 4x) drives the whole demo.
 */
import { useEffect, useState } from 'react';

type Listener = (simNow: number, simDelta: number) => void;

let speed = 1;
let anchorReal = Date.now();
let anchorSim = Date.now();
let lastSim = anchorSim;
const listeners = new Set<Listener>();
let timer: ReturnType<typeof setInterval> | null = null;

export const TICK_MS = 250;

const read = () => anchorSim + (Date.now() - anchorReal) * speed;

function ensureTimer() {
  if (timer || typeof window === 'undefined') return;
  timer = setInterval(() => {
    const now = read();
    const delta = now - lastSim;
    lastSim = now;
    listeners.forEach((l) => l(now, delta));
  }, TICK_MS);
}

export const clock = {
  now: () => read(),
  date: () => new Date(read()),
  get speed() {
    return speed;
  },
  setSpeed(next: number) {
    anchorSim = read();
    anchorReal = Date.now();
    speed = next;
  },
  /** Jump the clock forward (Demo director). */
  advance(ms: number) {
    anchorSim += ms;
  },
  reset() {
    anchorReal = Date.now();
    anchorSim = Date.now();
    lastSim = anchorSim;
  },
  subscribe(l: Listener) {
    listeners.add(l);
    ensureTimer();
    return () => {
      listeners.delete(l);
    };
  },
};

/** Re-render on the simulation clock at most every `everyMs` real ms. */
export function useSimNow(everyMs = 1000) {
  const [now, setNow] = useState(() => clock.now());
  useEffect(() => {
    let last = 0;
    return clock.subscribe((t) => {
      const real = Date.now();
      if (real - last >= everyMs) {
        last = real;
        setNow(t);
      }
    });
  }, [everyMs]);
  return now;
}

/** Subscribe to clock ticks (delta in simulated ms). */
export function useClockTick(fn: Listener, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    return clock.subscribe(fn);
  }, [fn, enabled]);
}
