import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Check, CheckCircle2, Loader2, Trash2, UserCheck, XCircle } from 'lucide-react';
import { Button, ErrorState, Modal, Select, TextField } from '../../components/ui';
import { api, type EligibilityResult } from '../../mocks/api';
import { DEPARTMENTS, PAYER_RULES, PAYERS, VISIT_TYPES } from '../../mocks/fixtures';
import { clock } from '../../engine/clock';
import { cn, uid } from '../../lib/format';
import { digitsOnly, formatEmiratesId, validateEmiratesId, validateName } from '../../lib/validators';
import { useDemo } from '../../store/demo';
import { toast } from '../../store/toast';
import type { Department, Encounter, Patient, Payer, VisitType } from '../../store/types';
import { encounterPath, prepareSession } from '../shell/navigation';

interface Form {
  eid: string;
  name: string;
  payer: Payer | '';
  memberId: string;
  department: Department | '';
  visitType: VisitType | '';
}

const EMPTY: Form = { eid: '', name: '', payer: '', memberId: '', department: '', visitType: '' };
type Field = keyof Form;
const ORDER: Field[] = ['eid', 'name', 'payer', 'department', 'visitType'];

function validate(f: Form): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  const eid = validateEmiratesId(f.eid);
  if (!eid.ok) e.eid = eid.error;
  const n = validateName(f.name);
  if (n) e.name = n;
  if (!f.payer) e.payer = 'Choose a payer.';
  if (f.payer !== 'SelfPay' && !f.department) e.department = 'Choose a department.';
  if (f.payer === 'SelfPay' && !f.department) e.department = 'Choose a department.';
  if (!f.visitType) e.visitType = 'Choose a visit type.';
  return e;
}

export const deriveMemberId = (payer: Payer, eid: string) => {
  const d = digitsOnly(eid);
  return `${PAYER_RULES[payer].memberPrefix}-${d.slice(7, 11) || '0000'}-${d.slice(3, 7) || '0000'}`;
};

export function PatientModal({ open, mode, onClose }: { open: boolean; mode: 'patient' | 'encounter'; onClose: () => void }) {
  const navigate = useNavigate();
  const [f, setF] = useState<Form>(EMPTY);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [found, setFound] = useState<Patient | null>(null);
  const [lookup, setLookup] = useState<'idle' | 'loading'>('idle');
  const [elig, setElig] = useState<'idle' | 'loading' | EligibilityResult>('idle');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const refs = useRef<Partial<Record<Field, HTMLElement | null>>>({});
  const encounters = useDemo((s) => s.encounters);

  useEffect(() => {
    if (open) {
      setF(EMPTY);
      setTouched({});
      setSubmitted(false);
      setFound(null);
      setElig('idle');
      setSaveError(null);
      setConfirmDiscard(false);
    }
  }, [open]);

  const errors = useMemo(() => validate(f), [f]);
  const show = (k: Field) => (touched[k] || submitted ? errors[k] ?? null : null);
  const dirty = JSON.stringify(f) !== JSON.stringify(EMPTY);
  const selfPay = f.payer === 'SelfPay';

  const set = <K extends Field>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const blur = (k: Field) => setTouched((t) => ({ ...t, [k]: true }));

  // Emirates ID lookup once the ID is valid
  useEffect(() => {
    if (!validateEmiratesId(f.eid).ok) {
      setFound(null);
      return;
    }
    let live = true;
    setLookup('loading');
    api
      .lookupPatient(f.eid)
      .then((p) => {
        if (!live) return;
        setFound(p);
        if (p) setF((s) => ({ ...s, name: s.name || p.name, payer: s.payer || p.payer }));
      })
      .catch(() => live && setFound(null))
      .finally(() => live && setLookup('idle'));
    return () => {
      live = false;
    };
  }, [f.eid]);

  // Eligibility per department
  useEffect(() => {
    if (!f.payer || !f.department || selfPay) {
      setElig('idle');
      return;
    }
    let live = true;
    setElig('loading');
    api
      .checkEligibility(f.payer, f.department)
      .then((r) => live && setElig(r))
      .catch(() => live && setElig({ status: 'unavailable' }));
    return () => {
      live = false;
    };
  }, [f.payer, f.department, selfPay]);

  const requestClose = () => {
    if (saving) return;
    if (dirty && !confirmDiscard) setConfirmDiscard(true);
    else onClose();
  };

  const save = async () => {
    setSubmitted(true);
    const first = ORDER.find((k) => errors[k]);
    if (first) {
      refs.current[first]?.focus();
      return;
    }
    setSaving(true);
    setSaveError(null);
    const started = Date.now();
    try {
      const patient: Patient = found ?? {
        id: uid('p'),
        name: f.name.trim(),
        emiratesId: formatEmiratesId(f.eid),
        dob: `${digitsOnly(f.eid).slice(3, 7)}-01-01`,
        sex: 'M',
        phone: '',
        payer: f.payer as Payer,
        memberId: selfPay ? undefined : f.memberId || deriveMemberId(f.payer as Payer, f.eid),
      };
      await api.savePatient(patient);
      const wait = 600 - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      const st = useDemo.getState();
      st.addPatient({ ...patient, payer: f.payer as Payer });
      const eligible = selfPay || (typeof elig === 'object' && elig.status === 'eligible');
      const enc: Encounter = {
        id: uid('e'),
        patientId: patient.id,
        visitType: f.visitType as VisitType,
        department: f.department as Department,
        scheduledAt: new Date(clock.now() + 5 * 60000).toISOString(),
        status: 'queued',
        nphies: eligible ? 'cleared' : 'queued',
        refId: `PA-2026-00${String(850000 + Math.floor(Math.random() * 99999)).padStart(6, '0')}`,
        readiness: 0,
        claim: { lines: [], totalAed: 0, denialRisk: 0, docs: { outcomeMeasure: false, history: false, eligibilityReverified: false } },
        sessionNo: f.visitType === 'Initial Evaluation' ? 1 : 4,
        sessionsPlanned: 12,
        scenario: st.scenarioOverride ?? 'missing_docs',
        stage: 'intake',
      };
      st.createEncounter(enc);
      toast({ tone: 'success', title: found ? 'Encounter created' : 'Patient and encounter created', body: patient.name });
      setSaving(false);
      onClose();
      prepareSession(enc);
      navigate(`/session/${enc.id}`);
    } catch (e) {
      setSaving(false);
      setSaveError((e as Error).message);
    }
  };

  const existingEncounter = found ? encounters.find((e) => e.patientId === found.id) : undefined;

  const fields = {
    eid: (
      <div key="eid">
        <TextField
          ref={(el) => (refs.current.eid = el)}
          label="Emirates ID"
          inputMode="numeric"
          autoComplete="off"
          placeholder="xxx-xxxx-xxxxxxx123-4"
          value={f.eid}
          onChange={(e) => set('eid', formatEmiratesId(e.target.value))}
          onPaste={(e) => {
            e.preventDefault();
            set('eid', formatEmiratesId(e.clipboardData.getData('text')));
          }}
          onBlur={() => blur('eid')}
          error={show('eid')}
          hint={lookup === 'loading' ? 'Looking up patient...' : 'Format 784-YYYY-NNNNNNN-C'}
          trailing={lookup === 'loading' ? <Loader2 size={16} className="animate-spin text-fg-tertiary" aria-hidden /> : found ? <UserCheck size={20} className="text-success" aria-hidden /> : null}
        />
        {found && (
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-success-bg px-3 py-2 text-body-sm text-success-text" role="status">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={16} aria-hidden /> Found existing patient: {found.name}
            </span>
            {existingEncounter && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const path = encounterPath(existingEncounter);
                  onClose();
                  if (path) {
                    if (path.startsWith('/session')) prepareSession(existingEncounter);
                    navigate(path);
                  } else toast({ tone: 'warning', title: 'Existing encounter is inactive', body: existingEncounter.inactiveReason });
                }}
              >
                Open existing patient
              </Button>
            )}
          </div>
        )}
      </div>
    ),
    name: (
      <TextField
        key="name"
        ref={(el) => (refs.current.name = el)}
        label="Patient Name"
        placeholder="John Doe"
        autoComplete="off"
        value={f.name}
        onChange={(e) => set('name', e.target.value)}
        onBlur={() => blur('name')}
        error={show('name')}
      />
    ),
    payer: (
      <div key="payer" className={cn('grid gap-4', selfPay ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
        <Select<Payer>
          id="pm-payer"
          label="Payer"
          value={f.payer}
          onChange={(v) => {
            set('payer', v);
            blur('payer');
          }}
          onBlur={() => blur('payer')}
          options={PAYERS.map((p) => ({ value: p.id, label: p.label }))}
          error={show('payer')}
        />
        {!selfPay && (
          <TextField
            label="Member ID"
            note="(Optional - Derived if blank)"
            // DESIGN-DECISION: Figma placeholder said "Last Name"
            placeholder="Auto-derived from Emirates ID"
            value={f.memberId}
            onChange={(e) => set('memberId', e.target.value.toUpperCase())}
            hint={!f.memberId && f.payer && digitsOnly(f.eid).length >= 11 ? `Derived: ${deriveMemberId(f.payer, f.eid)}` : undefined}
          />
        )}
      </div>
    ),
    department: (
      <div key="department">
        <Select<Department>
          id="pm-dept"
          label="Department"
          note={selfPay ? undefined : '(Eligibility is checked per department)'}
          value={f.department}
          onChange={(v) => {
            set('department', v);
            blur('department');
          }}
          onBlur={() => blur('department')}
          options={DEPARTMENTS.map((d) => ({ value: d, label: d }))}
          error={show('department')}
        />
        <EligibilityLine state={elig} department={f.department} onPick={(d) => set('department', d)} />
      </div>
    ),
    visitType: (
      <Select<VisitType>
        key="visitType"
        id="pm-visit"
        label="Visit type"
        value={f.visitType}
        onChange={(v) => {
          set('visitType', v);
          blur('visitType');
        }}
        onBlur={() => blur('visitType')}
        options={VISIT_TYPES.map((v) => ({ value: v, label: v }))}
        error={show('visitType')}
      />
    ),
  };

  // Radix Select triggers are buttons; capture refs by id for focus management
  useEffect(() => {
    refs.current.payer = document.getElementById('pm-payer');
    refs.current.department = document.getElementById('pm-dept');
    refs.current.visitType = document.getElementById('pm-visit');
  });

  const order: (keyof typeof fields)[] = mode === 'encounter' ? ['visitType', 'eid', 'name', 'payer', 'department'] : ['eid', 'name', 'payer', 'department', 'visitType'];

  return (
    <Modal
      open={open}
      onRequestClose={requestClose}
      title={mode === 'encounter' ? 'New Encounter' : 'Patient Details'}
      description="Provide basic info about the patient."
      footer={
        confirmDiscard ? (
          <div role="alertdialog" aria-label="Discard changes?" className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 text-body text-fg">
              <AlertTriangle size={20} className="text-warning-text" aria-hidden /> Discard changes?
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" autoFocus onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </Button>
              <Button variant="danger" onClick={onClose}>
                Discard
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {saveError && <ErrorState compact title="Could not save" body={`${saveError} Your entries are kept.`} onRetry={save} />}
            <div className="flex justify-center gap-4">
              <Button variant="tinted" size="lg" onClick={requestClose} disabled={saving} leading={<Trash2 size={20} aria-hidden />}>
                Cancel
              </Button>
              <Button size="lg" onClick={save} loading={saving} leading={<Check size={20} aria-hidden />}>
                Save & Continue
              </Button>
            </div>
          </div>
        )
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        noValidate
      >
        <fieldset disabled={saving} className="flex flex-col gap-5">
          <legend className="sr-only">Patient and visit details</legend>
          {order.map((k) => fields[k])}
        </fieldset>
      </form>
    </Modal>
  );
}

function EligibilityLine({ state, department, onPick }: { state: 'idle' | 'loading' | EligibilityResult; department: string; onPick: (d: Department) => void }) {
  if (state === 'idle') return null;
  const base = 'mt-2 flex flex-wrap items-center gap-2 rounded-md px-3 py-2 text-body-sm';
  if (state === 'loading')
    return (
      <p className={cn(base, 'bg-surface-muted text-fg-secondary')} role="status">
        <Loader2 size={16} className="animate-spin" aria-hidden /> Checking eligibility for {department}...
      </p>
    );
  if (state.status === 'eligible')
    return (
      <p className={cn(base, 'bg-success-bg text-success-text')} role="status">
        <CheckCircle2 size={16} aria-hidden /> Eligible for {department}
      </p>
    );
  if (state.status === 'unavailable')
    return (
      <p className={cn(base, 'bg-warning-bg text-warning-text')} role="status">
        <AlertTriangle size={16} aria-hidden /> Payer unavailable. You can continue; NPHIES will re-check before the visit.
      </p>
    );
  return (
    <div className={cn(base, 'bg-error-bg text-error-text')} role="status">
      <XCircle size={16} aria-hidden /> Not eligible for this department. Eligible:
      {state.eligibleDepartments.map((d) => (
        <button key={d} type="button" onClick={() => onPick(d)} className="rounded-full border border-error px-2 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:shadow-focus">
          {d}
        </button>
      ))}
    </div>
  );
}
