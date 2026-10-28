/**
 * Demo director (Shift+D): scenario, speed, reset and live-event triggers so a
 * presenter can steer the story.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { Clapperboard, FastForward, Lock, Mic, RotateCcw, Unplug, WifiOff, X } from 'lucide-react';
import { Button, IconButton, SegmentedControl } from '../../components/ui';
import { clock } from '../../engine/clock';
import { SCENARIO_LIST } from '../../engine/scenarios';
import { useKeydown } from '../../lib/hooks';
import { cn } from '../../lib/format';
import { useDemo } from '../../store/demo';
import { useSession } from '../../store/session';
import { toast } from '../../store/toast';
import { useUi } from '../../store/ui';
import type { ScenarioId } from '../../store/types';
import { resetDemo } from './resetDemo';

export const VOICE_STOP_EVENT = 'medexa:voice-stop';

export function DemoDirector() {
  const open = useUi((s) => s.directorOpen);
  const setOpen = useUi((s) => s.setDirector);
  const speed = useUi((s) => s.speed);
  const setSpeed = useUi((s) => s.setSpeed);
  const setForcedOffline = useUi((s) => s.setForcedOffline);
  const forcedOffline = useUi((s) => s.forcedOffline);
  const setLocked = useUi((s) => s.setLocked);
  const override = useDemo((s) => s.scenarioOverride);
  const setOverride = useDemo((s) => s.setScenarioOverride);
  const active = useSession((s) => s.active);
  const patch = useSession((s) => s.patch);

  useKeydown((e) => {
    if (e.shiftKey && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      setOpen(!useUi.getState().directorOpen);
    }
  });

  const pickScenario = (id: ScenarioId) => {
    setOverride(id);
    if (active && active.status === 'pre') patch({ scenario: id, states: {} });
    toast({
      tone: 'info',
      title: `Scenario: ${SCENARIO_LIST.find((s) => s.id === id)?.name}`,
      body: active && active.status !== 'pre' ? 'Applies to the next session you start.' : undefined,
    });
  };

  const changeSpeed = (v: string) => {
    const n = Number(v);
    clock.setSpeed(n);
    setSpeed(n);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen} modal={false}>
      <Dialog.Portal>
        <Dialog.Content
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed bottom-6 left-6 z-[85] w-80 rounded-xl border border-line bg-surface p-5 shadow-modal focus:outline-none"
        >
          <header className="flex items-center justify-between">
            <Dialog.Title className="flex items-center gap-2 text-h4 font-semibold">
              <Clapperboard size={20} aria-hidden /> Demo director
            </Dialog.Title>
            <Dialog.Close asChild>
              <IconButton aria-label="Close demo director" size="sm">
                <X size={16} />
              </IconButton>
            </Dialog.Close>
          </header>
          <Dialog.Description className="mt-1 text-caption text-fg-secondary">Hidden presenter controls. Shift+D toggles.</Dialog.Description>

          <h3 className="mt-4 text-caption font-medium uppercase text-fg-tertiary">Scenario</h3>
          <div role="radiogroup" aria-label="Scenario" className="mt-2 flex flex-col gap-1">
            {SCENARIO_LIST.map((s) => {
              const on = (override ?? active?.scenario) === s.id;
              return (
                <button
                  key={s.id}
                  role="radio"
                  aria-checked={on}
                  onClick={() => pickScenario(s.id)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-left transition-colors duration-fast focus-visible:outline-none focus-visible:shadow-focus',
                    on ? 'border-primary bg-primary-subtle' : 'border-line hover:bg-surface-muted',
                  )}
                >
                  <span className="block text-body font-medium">{s.name}</span>
                  <span className="block text-caption text-fg-secondary">{s.blurb}</span>
                </button>
              );
            })}
          </div>

          <h3 className="mt-4 text-caption font-medium uppercase text-fg-tertiary">Speed</h3>
          <div className="mt-2">
            <SegmentedControl
              label="Simulation speed"
              size="sm"
              value={String(speed)}
              onChange={changeSpeed}
              options={[
                { value: '1', label: '1x' },
                { value: '2', label: '2x' },
                { value: '4', label: '4x' },
              ]}
            />
          </div>

          <h3 className="mt-4 text-caption font-medium uppercase text-fg-tertiary">Live events</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!active || active.status !== 'recording'}
              onClick={() => window.dispatchEvent(new Event(VOICE_STOP_EVENT))}
              leading={<Mic size={16} aria-hidden />}
            >
              Simulate voice "Stop"
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!active || active.status !== 'recording'}
              onClick={() => patch({ connection: 'reconnecting', connectionSince: Date.now() })}
              leading={<Unplug size={16} aria-hidden />}
            >
              Drop connection
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!active || active.status === 'pre'}
              onClick={() => useSession.getState().tick(15000 * (active?.status === 'recording' ? 1 : 0))}
              leading={<FastForward size={16} aria-hidden />}
            >
              Skip 15 s
            </Button>
            <Button
              size="sm"
              variant={forcedOffline ? 'tinted' : 'outline'}
              aria-pressed={forcedOffline}
              onClick={() => setForcedOffline(!forcedOffline)}
              leading={<WifiOff size={16} aria-hidden />}
            >
              Offline
            </Button>
            <Button size="sm" variant="outline" onClick={() => setLocked(true)} leading={<Lock size={16} aria-hidden />}>
              Lock now
            </Button>
          </div>
          <p className="mt-3 text-caption text-fg-secondary">
            Error states: add <code className="rounded-xs bg-surface-sunken px-1">?fail=submit</code> (or save, eligibility) to the URL.
          </p>

          <Button
            className="mt-4 w-full"
            variant="outline"
            onClick={() => {
              resetDemo();
              toast({ tone: 'success', title: 'Demo reset', body: 'Data, clock and session are back to the start.' });
            }}
            leading={<RotateCcw size={16} aria-hidden />}
          >
            Reset demo
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
