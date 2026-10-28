import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, BadgeCheck, Loader2, MicOff, PanelRightOpen, Pause, Play, RotateCw, Square, Timer, WifiOff } from 'lucide-react';
import { Button, Confirm, ErrorState, IconButton, Tooltip } from '../../components/ui';
import { clock, useClockTick } from '../../engine/clock';
import { evaluate, readinessScore } from '../../engine/rules';
import { CLINICIAN } from '../../mocks/fixtures';
import { fmtClock, fmtTime } from '../../lib/format';
import { useKeydown } from '../../lib/hooks';
import { newReview, useDemo, useEncounter, usePatient } from '../../store/demo';
import { claimFromSession, deriveSession, useSession } from '../../store/session';
import { toast } from '../../store/toast';
import { Avatar } from '../shell/Brand';
import { VOICE_STOP_EVENT } from '../shell/DemoDirector';
import { prepareSession } from '../shell/navigation';
import { NotFound } from '../../routes/Misc';
import { InsightsFeed } from './InsightsFeed';
import { Orb, type OrbState } from './Orb';
import { PulsePanel, type PulseData } from './PulsePanel';
import { Transcript } from './Transcript';

let restoreChecked = false;

const ageOf = (dob: string) => {
  const y = Number(dob.slice(0, 4));
  return Number.isFinite(y) ? new Date(clock.now()).getFullYear() - y : undefined;
};

export function SessionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const enc = useEncounter(id);
  const patient = usePatient(enc?.patientId);
  const active = useSession((s) => s.active);
  const patch = useSession((s) => s.patch);
  const tick = useSession((s) => s.tick);
  const end = useSession((s) => s.end);
  const session = active && active.encounterId === id ? active : null;

  const [pulseOpen, setPulseOpen] = useState(false);
  const [restorePrompt, setRestorePrompt] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [consentError, setConsentError] = useState(false);
  const [requestingMic, setRequestingMic] = useState(false);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [pulseKey, setPulseKey] = useState<string | null>(null);
  const [command, setCommand] = useState<{ atMs: number } | null>(null);
  const consentRef = useRef<HTMLInputElement>(null);

  // make sure a session exists for this encounter
  useEffect(() => {
    if (enc && (!active || active.encounterId !== enc.id)) prepareSession(enc);
  }, [enc, active]);

  // refresh / return mid-session: offer Resume or Discard
  useEffect(() => {
    if (restoreChecked) return;
    restoreChecked = true;
    const a = useSession.getState().active;
    if (a && a.encounterId === id && (a.status === 'recording' || a.status === 'paused') && a.elapsedMs > 0) {
      patch({ status: 'paused' });
      setRestorePrompt(true);
    }
  }, [id, patch]);

  // drive elapsed time from the simulation clock
  const onTick = useCallback((_: number, delta: number) => tick(delta), [tick]);
  useClockTick(onTick, session?.status === 'recording');

  // connection loss: up to 8 s, then recover or error
  useEffect(() => {
    if (session?.connection !== 'reconnecting') return;
    const recover = Math.random() < 0.7;
    const t = setTimeout(
      () => {
        if (recover) {
          patch({ connection: 'ok' });
          toast({ tone: 'success', title: 'Reconnected', body: 'Nothing was lost; audio was buffered locally.' });
        } else patch({ connection: 'error' });
      },
      recover ? 3500 : 8000,
    );
    return () => clearTimeout(t);
  }, [session?.connection, patch]);

  const derived = useMemo(() => (session ? deriveSession(session) : null), [session]);

  // silence > 20 s posts "Still listening" once
  useEffect(() => {
    if (!session || !derived || session.stillListening || session.status !== 'recording') return;
    if (session.elapsedMs - derived.lastTurnAt > 20000 && derived.turns.length > 0) patch({ stillListening: true });
  }, [session, derived, patch]);

  const askStop = useCallback(() => {
    if (!session || session.status === 'pre') return;
    setConfirmStop(true);
  }, [session]);

  // voice command "Stop" (simulated by S key and the Demo director)
  const voiceStop = useCallback(() => {
    const a = useSession.getState().active;
    if (!a || a.status !== 'recording') return;
    setCommand({ atMs: a.elapsedMs });
    patch({ status: 'paused' });
    setTimeout(() => setConfirmStop(true), 900);
  }, [patch]);

  useEffect(() => {
    window.addEventListener(VOICE_STOP_EVENT, voiceStop);
    return () => window.removeEventListener(VOICE_STOP_EVENT, voiceStop);
  }, [voiceStop]);

  const togglePause = useCallback(() => {
    if (!session || session.connection !== 'ok') return;
    if (session.status === 'recording') patch({ status: 'paused' });
    else if (session.status === 'paused') {
      setCommand(null);
      patch({ status: 'recording' });
    }
  }, [session, patch]);

  const keep = (status: 'kept' | 'dismissed') => {
    if (!derived) return;
    const target = derived.suggestions.find((s) => s.key === focusedKey && s.status !== 'dismissed') ?? derived.suggestions.filter((s) => s.status === 'open').sort((a, b) => b.createdAt - a.createdAt)[0];
    if (!target) return;
    useSession.getState().setSuggestion(target.key, { status });
    toast({ tone: status === 'kept' ? 'success' : 'info', title: status === 'kept' ? 'Kept' : 'Dismissed', body: target.text.slice(0, 80), durationMs: 2500 });
  };

  useKeydown((e) => {
    if (!session || confirmStop || preparing || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (e.key === ' ') {
      if ((e.target as HTMLElement).tagName === 'BUTTON') return;
      e.preventDefault();
      togglePause();
    } else if (k === 'p' && !e.shiftKey) setPulseOpen((o) => !o);
    else if (k === 'k' && !e.shiftKey) keep('kept');
    else if (k === 'd' && !e.shiftKey) keep('dismissed');
    else if (k === 's' && !e.shiftKey) voiceStop();
  });

  if (!enc || !patient) return <NotFound />;
  if (!session || !derived) {
    return (
      <div className="flex h-80 items-center justify-center text-fg-secondary" aria-busy="true">
        <Loader2 className="animate-spin" size={24} aria-hidden /> <span className="ml-2">Preparing session...</span>
      </div>
    );
  }

  const status = session.status;
  const disabled = session.connection !== 'ok';
  const recentSuggestion = derived.suggestions.some((s) => session.elapsedMs - s.createdAt < 2500);
  const orbState: OrbState =
    session.connection !== 'ok' ? 'error' : status === 'pre' ? 'idle' : status === 'paused' || status === 'stopped' ? 'paused' : recentSuggestion ? 'thinking' : 'listening';
  const level = status === 'recording' ? 0.5 + 0.5 * Math.sin(session.elapsedMs / 400) : 0;

  // Pulse data from the provisional claim (open + kept suggestions)
  const provisional = claimFromSession(session, true);
  const results = evaluate(provisional, patient.payer, { sessionNo: enc.sessionNo });
  const quality = provisional.lines.length === 0 ? 100 : readinessScore(provisional, results);
  const progress = Math.min(100, (session.elapsedMs / derived.scenario.durationMs) * 100);
  const soapPct = Math.max(0, Math.min(100, progress * 0.85 - 5));
  const pulse: PulseData = {
    quality,
    issues: results.filter((r) => r.severity !== 'info'),
    preAuthNeeded: results.some((r) => r.rule === 'preauth'),
    nphiesReady: enc.nphies === 'cleared',
    eligible: enc.nphies === 'cleared',
    transcriptPct: progress,
    soapPct,
    notePct: soapPct < 70 ? Math.min(20, soapPct * 0.25) : Math.min(100, ((soapPct - 70) / 30) * 100),
    ambient: session.connection === 'reconnecting' ? 'Reconnecting' : status === 'recording' ? 'Active Listening' : status === 'paused' ? 'Paused' : status === 'pre' ? 'Not started' : 'Stopped',
    checkedAt: fmtTime(clock.date()),
  };

  const start = async () => {
    if (!session.consent) {
      setConsentError(true);
      consentRef.current?.focus();
      return;
    }
    if (session.mic === 'unknown' && navigator.mediaDevices?.getUserMedia) {
      setRequestingMic(true);
      try {
        const stream = await Promise.race([
          navigator.mediaDevices.getUserMedia({ audio: true }),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
        ]);
        stream.getTracks().forEach((t) => t.stop());
        patch({ mic: 'granted', status: 'recording' });
      } catch {
        patch({ mic: 'denied' });
      } finally {
        setRequestingMic(false);
      }
      return;
    }
    patch({ status: 'recording', mic: session.mic === 'unknown' ? 'demo' : session.mic });
  };

  const finalize = async () => {
    setConfirmStop(false);
    patch({ status: 'stopped' });
    setPreparing(true);
    await new Promise((r) => setTimeout(r, 1400 / clock.speed));
    const demo = useDemo.getState();
    const claim = claimFromSession(session, false);
    demo.setClaim(enc.id, claim);
    demo.updateEncounter(enc.id, { status: 'in_review', stage: 'coding' });
    const r = readinessScore(claim, evaluate(claim, patient.payer, { sessionNo: enc.sessionNo }));
    const discharge = enc.sessionNo >= enc.sessionsPlanned;
    useDemo.setState((s) => ({
      reviews: {
        ...s.reviews,
        [enc.id]: {
          ...newReview(),
          readinessAtStart: r,
          dischargeSuggested: discharge,
          session: { scenario: session.scenario, complaintDays: session.complaintDays, firstName: session.firstName, states: session.states, elapsedMs: session.elapsedMs },
        },
      },
    }));
    if (discharge) toast({ tone: 'success', title: 'Plan of care complete', body: 'A Discharge suggestion was added to the review.' });
    end();
    navigate(`/review/${enc.id}/1${window.location.search}`);
  };

  const age = ageOf(patient.dob);

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-line py-4">
        <div className="flex items-center gap-4">
          <IconButton aria-label="Back to Control room" onClick={() => (status === 'recording' ? setConfirmLeave(true) : navigate('/'))}>
            <ArrowLeft size={24} />
          </IconButton>
          <Avatar name={patient.name} />
          <div>
            <h1 className="flex items-center gap-2 text-h3 font-medium">
              {patient.name}
              <Tooltip content="Identity verified with Emirates ID">
                <span tabIndex={0} aria-label="Identity verified" className="rounded-full focus-visible:outline-none focus-visible:shadow-focus">
                  <BadgeCheck size={24} className="text-success" aria-hidden />
                </span>
              </Tooltip>
            </h1>
            <p className="text-body text-fg-secondary">
              {age}y/{patient.sex}
            </p>
          </div>
        </div>
        <p className="text-body-lg text-fg-secondary">
          <span className="text-fg tabular">{String(enc.sessionNo).padStart(2, '0')}</span> /{enc.sessionsPlanned} Sessions
        </p>
      </header>

      {restorePrompt && (
        <div role="alertdialog" aria-label="Resume session?" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-warning bg-warning-bg px-4 py-3">
          <span className="flex items-center gap-2 text-body text-fg">
            <AlertTriangle size={20} className="text-warning-text" aria-hidden />
            This session was interrupted at {fmtClock(session.elapsedMs)}. Resume where you left off?
          </span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                end();
                prepareSession(enc);
                setRestorePrompt(false);
              }}
            >
              Discard
            </Button>
            <Button
              size="sm"
              onClick={() => {
                patch({ status: 'recording' });
                setRestorePrompt(false);
              }}
            >
              Resume
            </Button>
          </div>
        </div>
      )}

      {session.connection !== 'ok' &&
        (session.connection === 'reconnecting' ? (
          <div role="status" className="mt-4 flex items-center gap-2 rounded-md bg-warning-bg px-4 py-3 text-body text-warning-text">
            <WifiOff size={20} aria-hidden /> Reconnecting... the timer keeps counting locally.
          </div>
        ) : (
          <div className="mt-4">
            <ErrorState title="Connection lost" body="Audio is buffered on this device. Retry to resume streaming." onRetry={() => patch({ connection: 'reconnecting', connectionSince: Date.now() })} />
          </div>
        ))}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="h-[70vh] min-h-0 xl:col-span-5 xl:h-[calc(100vh-var(--space-4000))]">
          <InsightsFeed
            suggestions={derived.suggestions}
            status={status}
            stillListening={session.stillListening}
            focusedKey={focusedKey}
            setFocusedKey={setFocusedKey}
            pulseKey={pulseKey}
          />
        </div>

        <section aria-label="Recording" className="relative min-h-[36rem] overflow-hidden xl:col-span-7">
          <Orb state={orbState} level={level} />
          <div className="absolute right-0 top-0 z-10 flex items-center overflow-hidden rounded-md border border-line bg-surface shadow-xs">
            <IconButton aria-label="Open Pulse panel (P)" className="rounded-none" onClick={() => setPulseOpen(true)}>
              <PanelRightOpen size={20} />
            </IconButton>
            <span className="flex h-10 w-10 items-center justify-center border-l border-line" title="Connected">
              <span className={session.connection === 'ok' ? 'h-2 w-2 rounded-full bg-success' : 'h-2 w-2 rounded-full bg-warning'} aria-hidden />
              <span className="sr-only">{session.connection === 'ok' ? 'Connected' : 'Connection problem'}</span>
            </span>
          </div>

          <div className="relative z-[1] flex flex-col items-center pt-30">
            <p className="flex items-center gap-2 text-display font-medium text-primary tabular" role="timer" aria-label={`Elapsed ${fmtClock(session.elapsedMs)}`}>
              <Timer size={32} className="text-ink" aria-hidden /> {fmtClock(session.elapsedMs)}
            </p>

            {status === 'pre' ? (
              <div className="mt-4 flex flex-col items-center gap-4">
                <p className="text-h3 text-fg-secondary">Press Start when the patient is ready</p>
                <label className="flex items-center gap-2 text-body text-fg">
                  <input
                    ref={consentRef}
                    type="checkbox"
                    required
                    checked={session.consent}
                    onChange={(e) => {
                      patch({ consent: e.target.checked });
                      setConsentError(false);
                    }}
                    aria-invalid={consentError || undefined}
                    aria-describedby={consentError ? 'consent-err' : undefined}
                    className="h-5 w-5 accent-primary"
                  />
                  Patient has consented to ambient recording
                </label>
                {consentError && (
                  <p id="consent-err" role="alert" className="text-body-sm text-error-text">
                    Consent is required before recording.
                  </p>
                )}
                {session.mic === 'denied' && (
                  <div role="alert" className="flex max-w-md flex-col items-center gap-2 rounded-md border border-warning bg-warning-bg p-4 text-center text-body-sm text-fg">
                    <MicOff size={20} className="text-warning-text" aria-hidden />
                    Microphone access was blocked. Allow it from the address bar's site settings, or continue with the scripted demo audio.
                    <Button size="sm" variant="outline" onClick={() => patch({ mic: 'demo', status: 'recording' })}>
                      Use demo audio
                    </Button>
                  </div>
                )}
                <Button size="lg" onClick={start} loading={requestingMic} leading={<Play size={20} aria-hidden />}>
                  Start
                </Button>
              </div>
            ) : (
              <>
                <p className="mt-2 text-h3 text-fg-secondary">
                  Say <span className="font-semibold text-primary">Stop</span> <span className="font-semibold text-fg">Recording..</span>
                </p>
                <div className="mt-4 flex items-center gap-4">
                  <IconButton
                    aria-label={status === 'recording' ? 'Pause recording (Space)' : 'Resume recording (Space)'}
                    variant="outline"
                    size="lg"
                    disabled={disabled || status === 'stopped'}
                    onClick={togglePause}
                  >
                    {status === 'recording' ? <Pause size={24} className="text-primary" /> : <Play size={24} className="text-primary" />}
                  </IconButton>
                  <IconButton aria-label="Stop recording" variant="primary" size="lg" disabled={disabled || status === 'stopped'} onClick={askStop}>
                    <Square size={24} />
                  </IconButton>
                </div>
                {session.mic === 'demo' && <p className="mt-2 text-caption text-fg-tertiary">Using demo audio</p>}
              </>
            )}

            <div className="mt-12 w-full px-6 pb-60">
              <Transcript turns={derived.turns} patientFirstName={session.firstName} onTerm={(k) => setPulseKey(k + ':' + Date.now())} command={command} />
            </div>
          </div>
        </section>
      </div>

      <PulsePanel open={pulseOpen} onOpenChange={setPulseOpen} data={pulse} />

      <Confirm
        open={confirmStop}
        title="End session and open Review Assistant?"
        body={`Kept items become the draft SOAP note and claim. ${derived.suggestions.filter((s) => s.status === 'open').length} open suggestions will not be included.`}
        confirmLabel="End session"
        onCancel={() => {
          setConfirmStop(false);
          setCommand(null);
        }}
        onConfirm={finalize}
      />
      <Confirm
        open={confirmLeave}
        title="Leave this session?"
        body="Recording pauses. You can resume from the encounter list."
        confirmLabel="Leave"
        onCancel={() => setConfirmLeave(false)}
        onConfirm={() => {
          patch({ status: 'paused' });
          setConfirmLeave(false);
          navigate('/');
        }}
      />

      <AnimatePresence>
        {preparing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="status"
            className="fixed inset-0 z-[90] flex items-center justify-center bg-scrim backdrop-blur-lg"
          >
            <div className="ai-ring flex w-full max-w-sm flex-col items-center gap-4 rounded-xl bg-surface p-8 text-center shadow-modal">
              <RotateCw size={32} className="animate-spin text-primary" aria-hidden />
              <p className="text-h3 font-medium">Preparing your review</p>
              <p className="text-body text-fg-secondary">SOAP synthesis finishing for {CLINICIAN.name}...</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-sunken">
                <motion.div className="h-full bg-primary" initial={{ width: '72%' }} animate={{ width: '100%' }} transition={{ duration: 1.3 / clock.speed }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
