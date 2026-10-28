/**
 * Four scripted consultations. A scenario is an ordered list of timed events
 * (transcript turns and suggestions). Playback is a pure function of the
 * session's elapsed time, so restoring a session is just restoring elapsedMs.
 */
import { codeDef } from '../mocks/fixtures';
import { durationWords } from '../lib/format';
import type { ScenarioId, SuggestionKind, TermHit } from '../store/types';

export interface TurnDef {
  id: string;
  atMs: number;
  speaker: 'clinician' | 'patient';
  text: string;
  terms: TermHit[];
}

export interface SuggestionDef {
  key: string;
  atMs: number;
  kind: SuggestionKind;
  text: string;
  description: string;
  code?: string;
  confidence: number;
  evidence: string[];
  rule?: string;
  /** For dx/px suggestions: the claim line it creates. dxKey links a procedure to a detected diagnosis. */
  line?: { code: string; dxKey?: string; match?: 'matched' | 'review' | 'none' };
  /** Protocol asks: the turn that answers it, and the clinician turn that asks it. */
  answerTurn?: string;
  askTurn?: string;
  /** Keeping this suggestion documents the outcome measure. */
  documentsOutcome?: boolean;
}

export interface ScenarioDef {
  id: ScenarioId;
  name: string;
  blurb: string;
  complaintDays: number;
  durationMs: number;
  turns: TurnDef[];
  suggestions: SuggestionDef[];
  payerRejects: boolean;
  lumbarFlexionGain: number;
}

export const SCENARIO_LIST: { id: ScenarioId; name: string; blurb: string }[] = [
  { id: 'clean', name: 'Clean claim', blurb: 'Everything documented and coded; readiness stays high.' },
  { id: 'missing_docs', name: 'Missing documentation', blurb: 'A procedure lacks a diagnosis link and no outcome score is recorded.' },
  { id: 'preauth', name: 'Pre-auth needed', blurb: 'Dry needling needs payer pre-authorisation before billing.' },
  { id: 'rejection', name: 'Payer rejection', blurb: 'Coding is clean but the payer rejects on eligibility.' },
];

const S = 1000;
const term = (t: string, normalized: string, suggestionKey?: string): TermHit => ({ term: t, normalized, suggestionKey });

export function buildScenario(id: ScenarioId, complaintDays = 21, firstName = 'Samuel'): ScenarioDef {
  const dur = durationWords(complaintDays);
  const documented = id !== 'missing_docs';
  const flex = 15;

  const turns: TurnDef[] = [
    { id: 't1', atMs: 2 * S, speaker: 'clinician', text: `Hello ${firstName}. How have you been since our last session?`, terms: [] },
    {
      id: 't2', atMs: 8 * S, speaker: 'patient',
      text: 'Honestly the lower back pain is still there, and I feel tired most days.',
      terms: [term('lower back pain', 'Low back pain (M54.5)', 'dx_lbp'), term('tired', 'Fatigue (R53.83)', 'dx_lbp')],
    },
    { id: 't3', atMs: 15 * S, speaker: 'clinician', text: 'And how long has this been occurring?', terms: [] },
    {
      id: 't4', atMs: 21 * S, speaker: 'patient',
      text: `It started about ${dur} ago, mostly in the evenings after I finish working.`,
      terms: [term(dur, `Onset ${complaintDays} days`, 'dx_lbp')],
    },
    { id: 't5', atMs: 29 * S, speaker: 'clinician', text: 'Does the pain radiate down towards the hip or remain centralized?', terms: [] },
    {
      id: 't6', atMs: 36 * S, speaker: 'patient',
      text: 'It mostly stays in my lower back, but sometimes I feel a sharp twinge near my right hip.',
      terms: [
        term('lower back', 'Lumbar region', 'dx_radic'),
        term('sharp twinge', 'Radicular pain', 'dx_radic'),
        term('right hip', 'Right hip (M25.551)', 'dx_radic'),
      ],
    },
    {
      id: 't7', atMs: 45 * S, speaker: 'clinician',
      text: "Let's start with therapeutic exercises today: bridges and pelvic tilts, three sets each.",
      terms: [term('therapeutic exercises', 'Therapeutic exercise (9.3.42)', 'px_ther')],
    },
    {
      id: 't8', atMs: 53 * S, speaker: 'patient',
      text: 'Okay. Sitting for a long time makes it worse, and resting helps.',
      terms: [term('Sitting', 'Aggravating factor: sitting'), term('resting', 'Easing factor: rest')],
    },
    {
      id: 't9', atMs: 61 * S, speaker: 'clinician',
      text: 'I am also adding manual therapy to the lumbar paraspinals, then gait training on the parallel bars.',
      terms: [term('manual therapy', 'Manual therapy (9.3.10)', 'px_manual'), term('gait training', 'Gait training (9.7.41)', 'px_gait')],
    },
    {
      id: 't10', atMs: 70 * S, speaker: 'patient',
      text: 'My walking feels unsteady on the stairs at home.',
      terms: [term('unsteady', 'Unsteadiness on feet (R26.81)', documented ? 'dx_unsteady' : undefined)],
    },
    {
      id: 't11', atMs: 79 * S, speaker: 'clinician',
      text: documented
        ? `Forward bending is better: lumbar flexion is up ${flex} degrees, and your ODI score is down to 28 from 40.`
        : `Forward bending is better than last time, about ${flex} degrees more lumbar flexion.`,
      terms: [term('lumbar flexion', `Lumbar flexion +${flex} degrees`, 'det_flex')],
    },
    {
      id: 't12', atMs: 88 * S, speaker: 'clinician',
      text: 'Does anyone in your family have diabetes or vascular issues?',
      terms: [],
    },
    {
      id: 't13', atMs: 94 * S, speaker: 'patient',
      text: 'My father had type 2 diabetes. No vascular problems that I know of.',
      terms: [term('type 2 diabetes', 'Family history: type 2 diabetes (Z83.3)')],
    },
    { id: 't14', atMs: 102 * S, speaker: 'clinician', text: 'How often do you engage in physical activity each week?', terms: [] },
    {
      id: 't15', atMs: 108 * S, speaker: 'patient',
      text: 'Maybe twice a week, mostly walking in the evening.',
      terms: [term('twice a week', 'Activity: 2 sessions/week')],
    },
  ];

  if (id === 'preauth') {
    turns.push({
      id: 't16', atMs: 116 * S, speaker: 'clinician',
      text: 'Next visit I would like to add dry needling to the lumbar paraspinals.',
      terms: [term('dry needling', 'Dry needling (9.5.20)', 'px_needling')],
    });
  }
  turns.push({
    id: 't17', atMs: 124 * S, speaker: 'clinician',
    text: 'Great work today. We will continue with three sessions this week.',
    terms: [],
  });

  const suggestions: SuggestionDef[] = [
    {
      key: 'dx_lbp', atMs: 23 * S, kind: 'detected', confidence: 0.96, evidence: ['t2', 't4'],
      text: `Patient reports persistent fatigue and lower back pain for ${dur}.`,
      description: 'Low back pain', code: 'M54.5', line: { code: 'M54.5' }, rule: 'Symptom + duration stated by patient',
    },
    {
      key: 'ask_family', atMs: 26 * S, kind: 'protocol', confidence: 0.8, evidence: [],
      text: 'Does anyone in your family have diabetes or vascular issues?',
      description: 'Family history (protocol)', answerTurn: 't13', askTurn: 't12', rule: 'Physio protocol: cardiovascular screening',
    },
    {
      key: 'dx_radic', atMs: 38 * S, kind: 'detected', confidence: 0.93, evidence: ['t6'],
      text: 'Pain localised to the lumbar region with intermittent radiation towards the right hip.',
      description: 'Radiculopathy, lumbar region', code: 'M54.16', line: { code: 'M54.16' }, rule: 'Radiating pain pattern',
    },
    {
      key: 'px_ther', atMs: 47 * S, kind: 'billing', confidence: 0.95, evidence: ['t7'],
      text: 'Code 9.3.42 (Therapeutic Exercise) matching CCHI-BS procedure has been identified',
      description: 'Therapeutic exercise, 30 min', code: '9.3.42', line: { code: '9.3.42', dxKey: 'dx_radic' }, rule: 'Procedure named with sets and reps',
    },
    {
      key: 'ask_activity', atMs: 56 * S, kind: 'protocol', confidence: 0.75, evidence: [],
      text: 'How often do you engage in physical activity each week?',
      description: 'Activity level (protocol)', answerTurn: 't15', askTurn: 't14', rule: 'Physio protocol: activity baseline',
    },
    {
      key: 'px_manual', atMs: 63 * S, kind: 'billing', confidence: 0.91, evidence: ['t9'],
      text: 'Code 9.3.10 (Manual Therapy) matching CCHI-BS procedure has been identified',
      description: 'Manual therapy techniques', code: '9.3.10', line: { code: '9.3.10', dxKey: 'dx_lbp' }, rule: 'Procedure named by clinician',
    },
    {
      key: 'px_gait', atMs: 66 * S, kind: 'billing', confidence: 0.88, evidence: ['t9'],
      text: 'Code 9.7.41 (Gait Training) matching CCHI-BS procedure has been identified',
      description: 'Gait training', code: '9.7.41',
      line: { code: '9.7.41', dxKey: documented ? 'dx_unsteady' : undefined, match: documented ? 'matched' : 'review' },
      rule: 'Procedure named by clinician',
    },
    {
      key: 'det_flex', atMs: 82 * S, kind: 'detected', confidence: 0.9, evidence: ['t11'],
      text: documented
        ? `Lumbar flexion improved by ${flex} degrees; ODI improved from 40 to 28.`
        : `Lumbar flexion improved by ${flex} degrees compared with baseline. No scored outcome measure stated.`,
      description: 'Objective progress', documentsOutcome: documented, rule: 'Measured change stated by clinician',
    },
  ];
  if (documented) {
    suggestions.push({
      key: 'dx_unsteady', atMs: 72 * S, kind: 'detected', confidence: 0.89, evidence: ['t10'],
      text: 'Patient reports unsteadiness on stairs, supporting gait training.',
      description: 'Unsteadiness on feet', code: 'R26.81', line: { code: 'R26.81' }, rule: 'Functional limitation stated',
    });
  }
  if (id === 'preauth') {
    suggestions.push({
      key: 'px_needling', atMs: 118 * S, kind: 'billing', confidence: 0.86, evidence: ['t16'],
      text: 'Code 9.5.20 (Dry Needling) matching CCHI-BS procedure has been identified. Payer requires pre-auth.',
      description: 'Dry needling, lumbar', code: '9.5.20', line: { code: '9.5.20', dxKey: 'dx_radic' }, rule: 'Payer pre-auth list',
    });
  }
  const readinessText: Record<ScenarioId, string> = {
    clean: 'No issues found. This claim looks ready to submit.',
    missing_docs: '2 issues found that may impact claim approval.',
    preauth: '1 issue found: pre-authorisation needed before billing 9.5.20.',
    rejection: 'No coding issues found. Eligibility is re-checked at submission.',
  };
  suggestions.push({
    key: 'readiness', atMs: 126 * S, kind: 'readiness', confidence: 0.9, evidence: [],
    text: readinessText[id], description: 'Claim Readiness',
  });

  const meta = SCENARIO_LIST.find((s) => s.id === id)!;
  return {
    id,
    name: meta.name,
    blurb: meta.blurb,
    complaintDays,
    durationMs: 132 * S,
    turns,
    suggestions: suggestions.sort((a, b) => a.atMs - b.atMs),
    payerRejects: id === 'rejection',
    lumbarFlexionGain: flex,
  };
}

export const lineFromCode = (code: string) => {
  const def = codeDef(code);
  if (!def) return undefined;
  return { kind: def.kind, code: def.code, system: def.system, description: def.description, amountAed: def.amountAed };
};
