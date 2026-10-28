/**
 * Builds the review content (SOAP fields, patient summary) from the session
 * snapshot. Complaint duration comes from ONE fixture value (complaintDays) so
 * the transcript and SOAP never disagree.
 */
import { durationWords } from '../../lib/format';
import { scenarioFor, deriveSession, type ActiveSession } from '../../store/session';
import type { ReviewDraft, SoapSection, SoapTab } from '../../store/demo';
import type { Claim, Encounter } from '../../store/types';

export type Snapshot = NonNullable<ReviewDraft['session']>;

export const snapshotFor = (enc: Encounter, firstName: string, complaintDays: number): Snapshot => {
  // Encounters opened without a live session (e.g. already cleared): replay the whole scenario, all kept.
  const sc = scenarioFor({ scenario: enc.scenario, complaintDays, firstName });
  const states: Snapshot['states'] = {};
  sc.suggestions.forEach((s) => (states[s.key] = { status: 'kept', asked: true }));
  return { scenario: enc.scenario, complaintDays, firstName, states, elapsedMs: sc.durationMs };
};

export const derivedFrom = (snap: Snapshot) =>
  deriveSession({
    ...snap,
    encounterId: '',
    status: 'stopped',
    consent: true,
    connection: 'ok',
    connectionSince: 0,
    mic: 'demo',
    stillListening: false,
    commandFlashAt: null,
  } as ActiveSession);

export interface SoapField {
  key: string;
  label: string;
  multiline?: boolean;
  list?: boolean;
  evidence?: string[];
  rule?: string;
  confidence?: number;
  placeholder?: string;
}

export const SOAP_FIELDS: Record<SoapTab, { title: string; fields: SoapField[] }> = {
  subjective: {
    title: 'Subjective Assessment',
    fields: [
      { key: 'chief', label: 'Chief Complaint', multiline: true, evidence: ['t2', 't4'], rule: 'Symptom and duration stated by patient', confidence: 0.96 },
      { key: 'symptoms', label: 'Symptoms', list: true, evidence: ['t6', 't8'], rule: 'Aggravating and easing factors', confidence: 0.92 },
      { key: 'history', label: 'History', multiline: true, evidence: ['t13', 't15'], rule: 'Protocol asks answered', confidence: 0.84, placeholder: 'Add history' },
    ],
  },
  objective: {
    title: 'Objective Findings',
    fields: [
      { key: 'rom', label: 'Range of Motion', multiline: true, evidence: ['t11'], rule: 'Measured change stated by clinician', confidence: 0.9 },
      { key: 'outcome', label: 'Outcome Measure', multiline: true, evidence: ['t11'], rule: 'Standard outcome score', confidence: 0.86, placeholder: 'Add a scored outcome measure (for example ODI)' },
      { key: 'gait', label: 'Gait and Balance', multiline: true, evidence: ['t10'], rule: 'Functional limitation stated', confidence: 0.88 },
    ],
  },
  assessment: {
    title: 'Assessment',
    fields: [
      { key: 'impression', label: 'Clinical Impression', multiline: true, evidence: ['t6', 't11'], rule: 'Synthesised from findings', confidence: 0.89 },
      { key: 'progress', label: 'Progress Toward Goals', multiline: true, evidence: ['t11'], rule: 'Compared with baseline', confidence: 0.87 },
    ],
  },
  plan: {
    title: 'Plan',
    fields: [
      { key: 'interventions', label: 'Interventions', list: true, evidence: ['t7', 't9'], rule: 'Procedures performed this session', confidence: 0.94 },
      { key: 'frequency', label: 'Frequency', multiline: true, evidence: ['t17'], rule: 'Stated by clinician', confidence: 0.93 },
      { key: 'goals', label: 'Goals', list: true, rule: 'Plan of care', confidence: 0.8 },
      { key: 'home', label: 'Home Programme', multiline: true, evidence: ['t7'], rule: 'Exercises prescribed', confidence: 0.85 },
    ],
  },
};

export function buildSoap(snap: Snapshot, enc: Encounter, claim: Claim): Record<SoapTab, SoapSection> {
  const d = derivedFrom(snap);
  const kept = (k: string) => d.suggestions.find((s) => s.key === k && s.status === 'kept');
  const answers = d.suggestions.filter((s) => s.kind === 'protocol' && s.answer).map((s) => s.answer!);
  const dur = durationWords(snap.complaintDays);
  const px = claim.lines.filter((l) => l.kind === 'px');
  const dx = claim.lines.filter((l) => l.kind === 'dx');
  const documented = snap.scenario !== 'missing_docs';
  const flex = scenarioFor(snap).lumbarFlexionGain;
  return {
    subjective: {
      reviewed: false,
      fields: {
        chief: `Patient reports lower back discomfort for ${dur} (${snap.complaintDays} days), especially after sitting. Experiences mobility issues and sharp pains. States: 'My back feels tight and stiff.'`,
        symptoms: ['Sharp pain worsens by sitting', 'Eases with rest', kept('dx_radic') ? 'Intermittent sharp twinge near the right hip' : '', 'Fatigue most days'].filter(Boolean).join('\n'),
        history: answers.length ? answers.map((a) => a.replace(/^My /, 'Patient: my ')).join(' ') : '',
      },
    },
    objective: {
      reviewed: false,
      fields: {
        rom: `Lumbar flexion improved by ${flex} degrees compared with baseline. Extension within functional limits, end-range discomfort.`,
        outcome: documented ? 'Oswestry Disability Index 28% (baseline 40%).' : '',
        gait: 'Unsteady on stairs; reciprocal gait on level ground with reduced stride length. Gait training on parallel bars tolerated.',
      },
    },
    assessment: {
      reviewed: false,
      fields: {
        impression: `${dx.map((l) => `${l.description} (${l.code})`).join('; ') || 'Low back pain'}. Symptoms consistent with mechanical lumbar pain with intermittent radicular features.`,
        progress: `Improving: ${flex} degrees more lumbar flexion, better tolerance to exercise. Session ${enc.sessionNo} of ${enc.sessionsPlanned}.`,
      },
    },
    plan: {
      reviewed: false,
      fields: {
        interventions: px.map((l) => `${l.description} (${l.code})`).join('\n') || 'Therapeutic exercise',
        frequency: 'Continue 3 sessions per week for the remaining plan of care.',
        goals: 'Sit for 45 minutes without pain\nClimb stairs without rail support\nReturn to evening walks 4 times per week',
        home: 'Bridges and pelvic tilts, 3 sets of 10, once daily. Avoid prolonged sitting; stand every 30 minutes.',
      },
    },
  };
}

export const soapGaps = (tab: SoapTab, s: SoapSection) =>
  SOAP_FIELDS[tab].fields.some((f) => f.placeholder && !s.fields[f.key]?.trim());

/** Next 3 sessions on Mon / Wed / Fri after the demo date. */
export function nextSessions(from: Date) {
  const out: Date[] = [];
  const d = new Date(from);
  while (out.length < 3) {
    d.setDate(d.getDate() + 1);
    if ([1, 3, 5].includes(d.getDay())) out.push(new Date(d.getFullYear(), d.getMonth(), d.getDate(), [10, 16, 9][out.length], 30));
  }
  return out;
}

export interface SummaryText {
  dear: string;
  completed: (n: number, total: number) => string;
  included: string;
  focused: string;
  keyImprovement: string;
  improvement: (deg: number) => [string, string];
  performed: string;
  performedDetailed: string;
  carePlan: string;
  continuing: (n: number) => string;
  and: string;
  title: string;
}

export const SUMMARY_TEXT: Record<'en' | 'ar', SummaryText> = {
  en: {
    title: 'Session Summary Note',
    dear: 'Dear Patient, today you completed',
    completed: (n, t) => `Session ${n} of ${t}`,
    included: 'in your therapy plan of care. The session included',
    focused: 'focused on improving lower back pain, fatigue, strength, and balance.',
    keyImprovement: 'Key Improvement',
    improvement: (deg) => ['Clinical improvement recorded with', `lumbar flexion increased by ${deg} degrees`],
    performed: 'You performed well and required some movement assistance, which is expected at this stage. Overall stability is trending upward compared to baseline.',
    performedDetailed:
      'You performed well and needed some help with movement, which is expected at this stage. Your forward bending and stair confidence are improving compared with your first visit. Keep doing the bridges and pelvic tilts each day, and stand up every 30 minutes when sitting.',
    carePlan: 'Upcoming Care Plan',
    continuing: (n) => `Continuing therapy ${n} sessions this week`,
    and: 'and',
  },
  ar: {
    title: 'ملخص الجلسة',
    dear: 'عزيزي المريض، أكملت اليوم',
    completed: (n, t) => `الجلسة ${n} من ${t}`,
    included: 'في خطة العلاج الخاصة بك. تضمنت الجلسة',
    focused: 'بهدف تخفيف آلام أسفل الظهر والتعب وتحسين القوة والتوازن.',
    keyImprovement: 'أهم تحسن',
    improvement: (deg) => ['تم تسجيل تحسن سريري مع', `زيادة انثناء أسفل الظهر بمقدار ${deg} درجة`],
    performed: 'كان أداؤك جيدًا واحتجت إلى بعض المساعدة في الحركة، وهذا متوقع في هذه المرحلة. الثبات العام في تحسن مقارنة بالبداية.',
    performedDetailed:
      'كان أداؤك جيدًا واحتجت إلى بعض المساعدة في الحركة، وهذا متوقع في هذه المرحلة. تحسن الانحناء للأمام والثقة على الدرج مقارنة بزيارتك الأولى. استمر في التمارين اليومية وقف كل 30 دقيقة عند الجلوس.',
    carePlan: 'خطة الرعاية القادمة',
    continuing: (n) => `متابعة العلاج ${n} جلسات هذا الأسبوع`,
    and: 'و',
  },
};

export const PROCEDURE_AR: Record<string, string> = {
  '9.3.42': 'تمارين علاجية',
  '9.3.10': 'علاج يدوي',
  '9.7.41': 'تدريب على المشي',
  '9.5.20': 'الإبر الجافة',
};

export const procedurePhrase = (code: string, description: string) => {
  const map: Record<string, string> = { '9.3.42': 'therapeutic exercises', '9.7.41': 'gait training', '9.3.10': 'manual therapy', '9.5.20': 'dry needling' };
  return map[code] ?? description.toLowerCase();
};
