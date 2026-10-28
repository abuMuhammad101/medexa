import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Download, FilePenLine, Lock, RotateCw, Wand2, X } from 'lucide-react';
import { Button, Confirm, DemoBadge, IconButton, Menu, StepProgress, TimelineStepper, Tooltip } from '../../components/ui';
import { clock, useSimNow } from '../../engine/clock';
import { usePipeline } from '../../engine/pipeline';
import { claimTotal, dxSupportConfidence, evaluate, readinessScore } from '../../engine/rules';
import { api, ApiError, latency } from '../../mocks/api';
import { download, makePdf } from '../../lib/pdf';
import { cn, fmtAed } from '../../lib/format';
import { isTypingTarget, useKeydown } from '../../lib/hooks';
import { newReview, useDemo, useEncounter, usePatient, type ReviewDraft, type SoapSection, type SoapTab } from '../../store/demo';
import { toast } from '../../store/toast';
import { canEdit as canEditFn, readOnlyReason, useUi } from '../../store/ui';
import type { Claim, RuleFix } from '../../store/types';
import { NotFound } from '../../routes/Misc';
import { Spark, Wordmark } from '../shell/Brand';
import { BillingCard, DenialDrawer } from './BillingCard';
import { buildSoap, derivedFrom, snapshotFor, SOAP_FIELDS } from './content';
import { TurnsContext } from './Evidence';
import { SendPopover, SubmitDialog, SummarySendDialog, type SubmitPhase } from './SendFlow';
import { SoapCard } from './SoapCard';
import { SummaryCard } from './SummaryCard';

const STEPS = [
  { title: 'SOAP Notes', description: 'Validate clinical objects generated from ambient recording.', icon: <Wand2 size={20} className="text-info" aria-hidden /> },
  { title: 'Billing Intelligence', description: 'Medexa AI has mapped documentation to GCC standard coding systems.', icon: <Wand2 size={20} className="text-info" aria-hidden /> },
  // DESIGN-DECISION: copy fix ("to show what we worked on")
  { title: 'Patient Summary', description: 'Share this Medexa summary with the patient to show what we worked on.' },
];

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function ReviewPage() {
  const { id = '', step = '1' } = useParams();
  const navigate = useNavigate();
  const enc = useEncounter(id);
  const patient = usePatient(enc?.patientId);
  const review = useDemo((s) => s.reviews[id]);
  const complaintDays = useDemo((s) => s.complaintDays);
  const role = useUi((s) => s.role);
  const globalLang = useUi((s) => s.lang);
  const reduce = useReducedMotion();
  const now = new Date(useSimNow(60000));

  const active = Math.min(2, Math.max(0, Number(step) - 1 || 0));
  const [denialsOpen, setDenialsOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [phase, setPhase] = useState<SubmitPhase>({ kind: 'idle' });
  const [confirmClose, setConfirmClose] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [edited, setEdited] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Initialise the review draft (snapshot + SOAP) on first open.
  useEffect(() => {
    if (!enc || !patient) return;
    const st = useDemo.getState();
    const r = st.reviews[enc.id] ?? newReview();
    const session = r.session ?? snapshotFor(enc, patient.name.split(' ')[0], complaintDays);
    let claim = enc.claim;
    if (claim.lines.length === 0 && !r.session) {
      // opened without a live session (seed encounter or direct link): rebuild from the replayed snapshot
      useDemo.getState().updateEncounter(enc.id, { status: enc.status === 'cleared' ? 'cleared' : 'in_review' });
      const d = derivedFrom(session);
      claim = { ...claim, lines: d.suggestions.filter((s) => s.line).map((s) => ({ ...s.line!, id: s.key, linkedDxIds: s.line!.dxKey ? [s.line!.dxKey] : [], evidenceTurnIds: s.evidenceTurnIds })) };
      st.setClaim(enc.id, claim);
    }
    if (!r.session || !r.soap) {
      st.saveReview(enc.id, {
        ...r,
        session,
        soap: r.soap ?? buildSoap(session, enc, claim),
        readinessAtStart: r.readinessAtStart ?? enc.readiness,
        summary: { ...r.summary, lang: globalLang },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enc?.id, patient?.id]);

  // follow the global language toggle
  useEffect(() => {
    if (review && review.summary.lang !== globalLang) useDemo.getState().saveReview(id, { summary: { ...review.summary, lang: globalLang } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalLang]);

  // remember the step and mark visited
  useEffect(() => {
    const r = useDemo.getState().reviews[id];
    if (!r) return;
    const visited = [...r.visited] as ReviewDraft['visited'];
    if (r.step !== active || !visited[active]) {
      visited[active] = true;
      useDemo.getState().saveReview(id, { step: active, visited });
    }
  }, [active, id, review?.session]);

  const go = useCallback(
    (i: number) => {
      if (i < 0 || i > 2 || i === active) return;
      // keep the query string so ?fail=... survives card navigation
      navigate(`/review/${id}/${i + 1}${window.location.search}`);
    },
    [active, id, navigate],
  );

  useKeydown((e) => {
    if (isTypingTarget(e.target) || document.querySelector('[role="dialog"]')) return;
    if (e.key === 'ArrowLeft') go(active - 1);
    if (e.key === 'ArrowRight') go(active + 1);
  });

  // Autosave after 1 s idle (simulated). ?fail=draft shows the inline retry.
  const autosave = useCallback(() => {
    setEdited(true);
    setSaveState('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await api.saveDraft();
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 1000);
  }, []);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const results = useMemo(
    () => (enc && patient ? evaluate(enc.claim, patient.payer, { sessionNo: enc.sessionNo, payerRejected: review?.payerRejected }) : []),
    [enc, patient, review?.payerRejected],
  );
  const denials = results.filter((r) => r.severity !== 'info');
  const readiness = enc ? readinessScore(enc.claim, results) : 0;
  const dxConf = enc ? dxSupportConfidence(enc.claim, results) : 0;
  const turns = useMemo(() => (review?.session ? derivedFrom(review.session).turns : []), [review?.session]);

  if (!enc || !patient) return <NotFound />;
  if (!review?.soap || !review.session) {
    return (
      <div className="flex min-h-full items-center justify-center bg-ambient text-fg-secondary" aria-busy="true">
        <RotateCw className="animate-spin" size={24} aria-hidden /> <span className="ml-2">Opening review...</span>
      </div>
    );
  }

  const cleared = enc.status === 'cleared';
  const amending = cleared && review.amendments > 0;
  const locked = cleared && !amending;
  const can = (area: 'soap' | 'billing' | 'summary') => !locked && canEditFn(role, area);
  const reason = locked ? 'Submitted claims are read-only. Use "Edit as amendment".' : readOnlyReason(role);

  const setClaim = (c: Claim) => {
    useDemo.getState().setClaim(id, c);
    autosave();
  };
  const setSoap = (soap: Record<SoapTab, SoapSection>) => {
    useDemo.getState().saveReview(id, { soap });
    // documenting an outcome score in SOAP satisfies the payer documentation rule
    if (soap.objective.fields.outcome?.trim() && !enc.claim.docs.outcomeMeasure) useDemo.getState().setClaim(id, { ...enc.claim, docs: { ...enc.claim.docs, outcomeMeasure: true } });
    if (!soap.objective.fields.outcome?.trim() && enc.claim.docs.outcomeMeasure) useDemo.getState().setClaim(id, { ...enc.claim, docs: { ...enc.claim.docs, outcomeMeasure: false } });
    autosave();
  };
  const applyFix = (fix: RuleFix, title: string) => {
    useDemo.getState().fixClaim(id, fix);
    if (fix.type === 'add_outcome' && review.soap && !review.soap.objective.fields.outcome) {
      const soap = { ...review.soap, objective: { ...review.soap.objective, fields: { ...review.soap.objective.fields, outcome: 'Oswestry Disability Index 32% (baseline 40%), captured from session measures.' } } };
      useDemo.getState().saveReview(id, { soap });
    }
    if (fix.type === 'reverify') useDemo.getState().updateEncounter(id, { nphies: 'cleared' });
    toast({ tone: 'success', title: 'Fix applied', body: title });
    autosave();
  };

  const visitedAll = review.visited.every(Boolean);
  const unvisited = STEPS.filter((_, i) => !review.visited[i]).map((s) => s.title);

  const submit = async () => {
    const attempt = review.submitAttempts + 1;
    useDemo.getState().saveReview(id, { submitAttempts: attempt });
    setPhase({ kind: 'validating' });
    await latency(500, 800);
    setPhase({ kind: 'sending' });
    try {
      const { ref } = await api.submitClaim({ attempt, scenarioRejects: review.session!.scenario === 'rejection', reverified: enc.claim.docs.eligibilityReverified, payer: patient.payer });
      const story = { before: review.readinessAtStart ?? readiness, after: readiness, protectedAed: claimTotal(enc.claim), ref };
      useDemo.getState().clearEncounter(id, story);
      useDemo.getState().setClaim(id, { ...useDemo.getState().encounters.find((e) => e.id === id)!.claim, ref, submittedAt: new Date(clock.now()).toISOString() });
      usePipeline.getState().complete();
      setPhase({ kind: 'accepted', ...story });
    } catch (e) {
      const err = e as ApiError;
      if (err.kind === 'rejected') {
        useDemo.getState().saveReview(id, { payerRejected: true });
        setPhase({ kind: 'rejected', reasons: err.reasons });
      } else setPhase({ kind: 'network', message: err.message });
    }
  };

  const exportPdf = (which: 'card' | 'pack') => {
    const soapLines = (tab: SoapTab) => SOAP_FIELDS[tab].fields.map((f) => `${f.label}: ${review.soap![tab].fields[f.key] || '(not documented)'}`);
    const coding = enc.claim.lines.map((l) => `${l.code} (${l.system}) ${l.description}${l.amountAed ? ` - ${fmtAed(l.amountAed)}` : ''}`);
    const sections: Record<number, string[]> = {
      0: ['SOAP NOTES', ...(['subjective', 'objective', 'assessment', 'plan'] as SoapTab[]).flatMap((t) => ['', t.toUpperCase(), ...soapLines(t)])],
      1: ['BILLING INTELLIGENCE', ...coding, '', `Claims readiness: ${readiness.toFixed(1)}%`, `Open denial items: ${denials.length}`, ...denials.map((d) => `- ${d.title}`)],
      2: ['PATIENT SUMMARY', review.summary.text ?? `Session ${enc.sessionNo} of ${enc.sessionsPlanned} completed. See the patient summary card.`],
    };
    const lines = which === 'card' ? sections[active] : [...sections[0], '', ...sections[1], '', ...sections[2]];
    const blob = makePdf(`Medexa review - ${patient.name} - ${enc.refId} (DEMO DATA)`, lines);
    download(blob, `medexa-${enc.refId}-${which === 'card' ? STEPS[active].title.toLowerCase().replace(/\s+/g, '-') : 'review-pack'}.pdf`);
    toast({ tone: 'success', title: 'Export ready', body: which === 'card' ? `${STEPS[active].title} PDF downloaded` : 'Full review pack PDF downloaded' });
  };

  const close = () => (edited && !cleared ? setConfirmClose(true) : navigate('/'));

  const procedures = enc.claim.lines.filter((l) => l.kind === 'px');
  const summaryPreview = `Dear ${patient.name.split(' ')[0]}, today you completed session ${enc.sessionNo} of ${enc.sessionsPlanned}. We worked on ${procedures.map((p) => p.description.toLowerCase()).join(', ') || 'your exercises'}. Lumbar flexion improved by 15 degrees. See you at your next session. (Sent by Medexa on behalf of your clinician)`;

  const cards: ReactNode[] = [
    <SoapCard
      key="soap"
      soap={review.soap}
      onChange={setSoap}
      canEdit={can('soap')}
      readOnlyReason={reason}
      active={active === 0}
      diagnoses={enc.claim.lines.filter((l) => l.kind === 'dx')}
      dischargeSuggested={review.dischargeSuggested}
    />,
    <BillingCard
      key="billing"
      claim={enc.claim}
      results={results}
      readiness={readiness}
      dxConfidence={dxConf}
      canEdit={can('billing')}
      readOnlyReason={reason}
      active={active === 1}
      onClaim={setClaim}
      onOpenDenials={() => setDenialsOpen(true)}
    />,
    <SummaryCard
      key="summary"
      summary={review.summary}
      onSummary={(s) => {
        useDemo.getState().saveReview(id, { summary: s });
        autosave();
      }}
      procedures={procedures}
      sessionNo={enc.sessionNo}
      sessionsPlanned={enc.sessionsPlanned}
      flexion={15}
      now={now}
      canEdit={can('summary')}
      readOnlyReason={reason}
      active={active === 2}
    />,
  ];

  return (
    <TurnsContext.Provider value={{ turns, firstName: review.session.firstName }}>
      <div className="relative flex min-h-full flex-col overflow-hidden bg-ambient">
        <header className="flex flex-wrap items-center justify-between gap-3 px-8 pt-6">
          <div className="flex items-center gap-4">
            <Wordmark />
            <span className="text-body-lg text-fg-secondary">Review Assistant</span>
            <span className="text-body-sm text-fg-tertiary" aria-live="polite">
              {saveState === 'saving' && 'Saving...'}
              {saveState === 'saved' && 'Saved just now'}
              {saveState === 'error' && (
                <span className="inline-flex items-center gap-1 text-error-text">
                  Save failed
                  <button className="underline focus-visible:outline-none focus-visible:shadow-focus" onClick={autosave}>
                    Retry
                  </button>
                </span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Menu
              items={[
                { label: 'Current card (PDF)', icon: <Download size={16} aria-hidden />, onSelect: () => exportPdf('card') },
                { label: 'Full review pack (PDF)', icon: <Download size={16} aria-hidden />, onSelect: () => exportPdf('pack') },
              ]}
              trigger={
                <Button variant="outline" leading={<Download size={16} aria-hidden />}>
                  Export
                </Button>
              }
            />
            <SendPopover
              allVisited={visitedAll}
              unvisited={unvisited}
              denialCount={denials.length}
              disabled={locked}
              onSummary={() => setSummaryOpen(true)}
              onSubmit={submit}
              onShowDenials={() => {
                go(1);
                setDenialsOpen(true);
              }}
            />
            <IconButton aria-label="Close review" size="lg" onClick={close}>
              <X size={24} />
            </IconButton>
          </div>
        </header>

        {cleared && (
          <div className={cn('mx-8 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md px-4 py-2 text-body-sm', amending ? 'bg-warning-bg text-warning-text' : 'bg-success-bg text-success-text')} role="status">
            <span className="flex items-center gap-2">
              {amending ? <FilePenLine size={16} aria-hidden /> : <Lock size={16} aria-hidden />}
              {amending ? `Amendment v${review.amendments + 1}: changes are versioned against claim ${enc.claim.ref ?? review.claimStory?.ref ?? ''}.` : `Submitted to NPHIES as ${enc.claim.ref ?? review.claimStory?.ref ?? 'claim'}. Read-only.`}
            </span>
            {!amending && (
              <Button size="sm" variant="outline" disabled={!canEditFn(role, 'soap')} onClick={() => useDemo.getState().saveReview(id, { amendments: review.amendments + 1 })} leading={<FilePenLine size={16} aria-hidden />}>
                Edit as amendment
              </Button>
            )}
          </div>
        )}

        <TimelineStepper steps={STEPS} active={active} visited={review.visited} onSelect={go} />

        {/* Carousel */}
        <section aria-roledescription="carousel" aria-label="Review cards" className="relative mt-6 flex-1">
          <div className="relative mx-auto h-[38rem] max-h-[62vh] min-h-[28rem]">
            {cards.map((card, i) => {
              const offset = i - active;
              const isActive = offset === 0;
              return (
                <motion.div
                  key={i}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${STEPS[i].title}, ${i + 1} of 3`}
                  onClick={() => !isActive && go(i)}
                  drag={isActive ? 'x' : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  dragSnapToOrigin
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -80) go(active + 1);
                    else if (info.offset.x > 80) go(active - 1);
                  }}
                  initial={false}
                  animate={
                    reduce
                      ? { x: '-50%', left: `${50 + offset * 100}%`, opacity: isActive ? 1 : 0, scale: 1, y: 0 }
                      : { x: '-50%', left: `${50 + offset * 46}%`, scale: isActive ? 1 : 0.86, y: isActive ? 0 : 36, opacity: Math.abs(offset) > 1 ? 0 : isActive ? 1 : 0.45 }
                  }
                  transition={{ duration: reduce ? 0.2 : 0.35, ease: [0.2, 0, 0, 1] }}
                  className={cn(
                    'absolute top-0 h-full w-full max-w-2xl overflow-hidden rounded-xl bg-surface',
                    isActive ? 'ai-border-active z-10 shadow-hover' : 'z-0 cursor-pointer shadow-xs',
                  )}
                  style={{ maxWidth: 'min(42rem, calc(100vw - var(--space-1600)))' }}
                >
                  {/* inactive neighbours are not focusable; clicking them navigates */}
                  <div
                    className="h-full"
                    ref={(el) => {
                      if (el) (el as HTMLDivElement & { inert: boolean }).inert = !isActive;
                    }}
                  >
                    {card}
                  </div>
                </motion.div>
              );
            })}
          </div>

          <Tooltip content="Previous card (Left arrow)">
            <IconButton aria-label="Previous card" variant="ink" size="lg" disabled={active === 0} onClick={() => go(active - 1)} className="absolute left-6 top-1/2 z-20 -translate-y-1/2 md:left-20">
              <ArrowLeft size={24} />
            </IconButton>
          </Tooltip>
          <Tooltip content="Next card (Right arrow)">
            <IconButton aria-label="Next card" variant="ink" size="lg" disabled={active === 2} onClick={() => go(active + 1)} className="absolute right-6 top-1/2 z-20 -translate-y-1/2 md:right-20">
              <ArrowRight size={24} />
            </IconButton>
          </Tooltip>
        </section>

        <footer className="flex flex-wrap items-end justify-between gap-4 px-8 pb-6 pt-6">
          <StepProgress active={active} total={3} visited={review.visited} />
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-body-sm text-fg-secondary">
              <Spark size={16} /> Readiness <span className="font-semibold text-fg tabular">{readiness.toFixed(1)}%</span>
            </span>
            <DemoBadge />
          </div>
        </footer>
      </div>

      <DenialDrawer open={denialsOpen} onClose={() => setDenialsOpen(false)} items={denials} onApply={applyFix} readOnly={locked || !canEditFn(role, 'billing')} />
      <SummarySendDialog open={summaryOpen} onClose={() => setSummaryOpen(false)} preview={review.summary.text ?? summaryPreview} phone={patient.phone} name={patient.name} />
      <SubmitDialog
        phase={phase}
        onClose={() => setPhase({ kind: 'idle' })}
        onRetry={submit}
        onFix={() => {
          setPhase({ kind: 'idle' });
          go(1);
          setDenialsOpen(true);
        }}
        onDone={() => {
          setPhase({ kind: 'idle' });
          navigate('/');
        }}
      />
      <Confirm
        open={confirmClose}
        title="Leave review?"
        body="Your changes are saved as a draft."
        confirmLabel="Leave"
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => navigate('/')}
      />
    </TurnsContext.Provider>
  );
}
