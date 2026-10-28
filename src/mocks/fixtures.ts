/**
 * Demo fixtures. ALL DATA IS FICTIONAL. Codes, descriptions and AED amounts are
 * illustrative only and are not real CCHI-BS / ICD-10-AM tariffs.
 */
import { makeEmiratesId } from '../lib/validators';
import type {
  Department,
  Encounter,
  Patient,
  Payer,
  PipelineStage,
  ScenarioId,
  VisitType,
} from '../store/types';

export const PAYERS: { id: Payer; label: string }[] = [
  { id: 'Daman', label: 'Daman' },
  { id: 'NAS', label: 'NAS' },
  { id: 'SAICO', label: 'SAICO' },
  { id: 'AlFuttaimTPA', label: 'Al-Futtaim TPA' },
  { id: 'SelfPay', label: 'Self-pay' },
];
export const payerLabel = (p: Payer) => PAYERS.find((x) => x.id === p)?.label ?? p;

export const DEPARTMENTS: Department[] = [
  'Physiotherapy',
  'Occupational Therapy',
  'Speech Therapy',
  'Orthopedics',
  'General Medicine',
];
export const VISIT_TYPES: VisitType[] = ['Initial Evaluation', 'Follow-up', 'Specialist Consult', 'Re-evaluation', 'Discharge'];

export interface PayerRules {
  preAuthCodes: string[];
  bundling: [string, string][];
  sessionCap: number;
  requiresOutcomeMeasureFor: string[];
  coveredDepartments: Department[];
  memberPrefix: string;
}

export const PAYER_RULES: Record<Payer, PayerRules> = {
  Daman: {
    preAuthCodes: ['9.5.20', '9.8.10'],
    bundling: [['9.3.42', '9.3.40']],
    sessionCap: 12,
    requiresOutcomeMeasureFor: ['9.3.42', '9.7.41'],
    coveredDepartments: ['Physiotherapy', 'Occupational Therapy', 'Orthopedics', 'General Medicine'],
    memberPrefix: 'DAM',
  },
  NAS: {
    preAuthCodes: ['9.5.20'],
    bundling: [['9.3.42', '9.3.40'], ['9.7.41', '9.7.40']],
    sessionCap: 10,
    requiresOutcomeMeasureFor: ['9.3.42'],
    coveredDepartments: ['Physiotherapy', 'Orthopedics', 'General Medicine'],
    memberPrefix: 'NAS',
  },
  SAICO: {
    preAuthCodes: ['9.5.20', '9.3.42'],
    bundling: [['9.3.42', '9.3.40']],
    sessionCap: 12,
    requiresOutcomeMeasureFor: ['9.7.41'],
    coveredDepartments: ['Physiotherapy', 'Speech Therapy', 'Orthopedics', 'General Medicine'],
    memberPrefix: 'SAI',
  },
  AlFuttaimTPA: {
    preAuthCodes: ['9.5.20', '9.8.10'],
    bundling: [['9.3.42', '9.3.40']],
    sessionCap: 8,
    requiresOutcomeMeasureFor: ['9.3.42', '9.7.41'],
    coveredDepartments: ['Physiotherapy', 'Occupational Therapy', 'Orthopedics'],
    memberPrefix: 'AFT',
  },
  SelfPay: {
    preAuthCodes: [],
    bundling: [],
    sessionCap: 99,
    requiresOutcomeMeasureFor: [],
    coveredDepartments: ['Physiotherapy', 'Occupational Therapy', 'Speech Therapy', 'Orthopedics', 'General Medicine'],
    memberPrefix: 'SP',
  },
};

export interface CodeDef {
  code: string;
  system: 'CCHI-BS' | 'ICD-10-AM';
  kind: 'dx' | 'px';
  description: string;
  amountAed: number;
}

/** 40 illustrative codes. */
export const CODES: CodeDef[] = [
  { code: '9.3.42', system: 'CCHI-BS', kind: 'px', description: 'Therapeutic exercise, 30 min', amountAed: 320 },
  { code: '9.3.40', system: 'CCHI-BS', kind: 'px', description: 'Therapeutic exercise, 15 min', amountAed: 180 },
  { code: '9.3.10', system: 'CCHI-BS', kind: 'px', description: 'Manual therapy techniques', amountAed: 290 },
  { code: '9.3.12', system: 'CCHI-BS', kind: 'px', description: 'Soft tissue mobilisation', amountAed: 240 },
  { code: '9.3.20', system: 'CCHI-BS', kind: 'px', description: 'Neuromuscular re-education', amountAed: 300 },
  { code: '9.3.30', system: 'CCHI-BS', kind: 'px', description: 'Aquatic therapy', amountAed: 360 },
  { code: '9.7.41', system: 'CCHI-BS', kind: 'px', description: 'Gait training', amountAed: 280 },
  { code: '9.7.40', system: 'CCHI-BS', kind: 'px', description: 'Balance training', amountAed: 220 },
  { code: '9.7.50', system: 'CCHI-BS', kind: 'px', description: 'OT functional exercise', amountAed: 260 },
  { code: '9.7.52', system: 'CCHI-BS', kind: 'px', description: 'ADL training', amountAed: 250 },
  { code: '9.5.20', system: 'CCHI-BS', kind: 'px', description: 'Dry needling, lumbar', amountAed: 540 },
  { code: '9.5.10', system: 'CCHI-BS', kind: 'px', description: 'Electrical stimulation, unattended', amountAed: 150 },
  { code: '9.5.12', system: 'CCHI-BS', kind: 'px', description: 'Therapeutic ultrasound', amountAed: 160 },
  { code: '9.5.14', system: 'CCHI-BS', kind: 'px', description: 'Mechanical traction', amountAed: 190 },
  { code: '9.8.10', system: 'CCHI-BS', kind: 'px', description: 'Lumbar orthosis fitting', amountAed: 820 },
  { code: '9.1.10', system: 'CCHI-BS', kind: 'px', description: 'Physiotherapy re-assessment', amountAed: 380 },
  { code: '9.1.01', system: 'CCHI-BS', kind: 'px', description: 'Physiotherapy initial evaluation', amountAed: 520 },
  { code: '9.1.20', system: 'CCHI-BS', kind: 'px', description: 'Discharge evaluation', amountAed: 340 },
  { code: '9.9.01', system: 'CCHI-BS', kind: 'px', description: 'Home exercise programme instruction', amountAed: 120 },
  { code: '9.9.02', system: 'CCHI-BS', kind: 'px', description: 'Patient education, 15 min', amountAed: 110 },
  { code: 'M54.5', system: 'ICD-10-AM', kind: 'dx', description: 'Low back pain', amountAed: 0 },
  { code: 'M54.16', system: 'ICD-10-AM', kind: 'dx', description: 'Radiculopathy, lumbar region', amountAed: 0 },
  { code: 'M54.17', system: 'ICD-10-AM', kind: 'dx', description: 'Radiculopathy, lumbosacral region', amountAed: 0 },
  { code: 'M51.26', system: 'ICD-10-AM', kind: 'dx', description: 'Lumbar disc displacement', amountAed: 0 },
  { code: 'M47.816', system: 'ICD-10-AM', kind: 'dx', description: 'Lumbar spondylosis', amountAed: 0 },
  { code: 'M25.551', system: 'ICD-10-AM', kind: 'dx', description: 'Pain in right hip', amountAed: 0 },
  { code: 'M62.81', system: 'ICD-10-AM', kind: 'dx', description: 'Muscle weakness, generalised', amountAed: 0 },
  { code: 'R53.83', system: 'ICD-10-AM', kind: 'dx', description: 'Other fatigue', amountAed: 0 },
  { code: 'R26.81', system: 'ICD-10-AM', kind: 'dx', description: 'Unsteadiness on feet', amountAed: 0 },
  { code: 'R26.89', system: 'ICD-10-AM', kind: 'dx', description: 'Other abnormalities of gait', amountAed: 0 },
  { code: 'M79.18', system: 'ICD-10-AM', kind: 'dx', description: 'Myalgia, other site', amountAed: 0 },
  { code: 'M53.3', system: 'ICD-10-AM', kind: 'dx', description: 'Sacrococcygeal disorders', amountAed: 0 },
  { code: 'S33.5', system: 'ICD-10-AM', kind: 'dx', description: 'Sprain of lumbar spine ligaments', amountAed: 0 },
  { code: 'M17.11', system: 'ICD-10-AM', kind: 'dx', description: 'Primary osteoarthritis, right knee', amountAed: 0 },
  { code: 'M75.1', system: 'ICD-10-AM', kind: 'dx', description: 'Rotator cuff syndrome', amountAed: 0 },
  { code: 'G56.0', system: 'ICD-10-AM', kind: 'dx', description: 'Carpal tunnel syndrome', amountAed: 0 },
  { code: 'I63.9', system: 'ICD-10-AM', kind: 'dx', description: 'Cerebral infarction, unspecified', amountAed: 0 },
  { code: 'E11.9', system: 'ICD-10-AM', kind: 'dx', description: 'Type 2 diabetes without complications', amountAed: 0 },
  { code: 'Z96.651', system: 'ICD-10-AM', kind: 'dx', description: 'Presence of right artificial knee joint', amountAed: 0 },
  { code: 'Z50.1', system: 'ICD-10-AM', kind: 'dx', description: 'Other physical therapy', amountAed: 0 },
];
export const codeDef = (code: string) => CODES.find((c) => c.code === code);

export const CLINICIAN = { name: 'Dr. Sarah', fullName: 'Dr. Sarah Rahman', specialty: 'Physiotherapy' };

/** Demo configuration the presenter may tweak. */
export const DEMO_CONFIG = {
  slaRedThreshold: 10,
  idleLockMinutes: 15,
  kpiBase: { claimsInFlight: 1284, firstPass: 82, recovered7d: 412860, slaRisk: 17 },
};

const P = (
  id: string,
  name: string,
  year: number,
  serial: string,
  sex: 'M' | 'F',
  payer: Payer,
  phone: string,
): Patient => ({
  id,
  name,
  emiratesId: makeEmiratesId(year, serial),
  dob: `${year}-0${(Number(serial[0]) % 9) + 1}-1${serial[1]}`,
  sex,
  phone,
  payer,
  memberId: `${PAYER_RULES[payer].memberPrefix}-${serial.slice(0, 4)}-${serial.slice(3, 7)}`,
});

export const SEED_PATIENTS: Patient[] = [
  P('p1', 'Samuel Thompson', 1968, '4471029', 'M', 'Daman', '+971 50 412 7781'),
  P('p2', 'Fatima Zahra', 1985, '2219034', 'F', 'NAS', '+971 55 201 4410'),
  P('p3', 'Sarah Williams', 1991, '7730112', 'F', 'SAICO', '+971 52 778 1290'),
  P('p4', 'Ahmed Abdullah', 1974, '5502981', 'M', 'NAS', '+971 56 330 9012'),
  P('p5', 'Omar Haddad', 1962, '1180457', 'M', 'AlFuttaimTPA', '+971 50 118 4472'),
  P('p6', 'Layla Mansour', 1988, '6623019', 'F', 'Daman', '+971 54 662 3011'),
  P('p7', 'Daniel Okafor', 1979, '3390218', 'M', 'SAICO', '+971 58 339 0218'),
  P('p8', 'Mariam Saeed', 1996, '8841207', 'F', 'Daman', '+971 50 884 1207'),
  P('p9', 'Rahul Menon', 1983, '9012745', 'M', 'AlFuttaimTPA', '+971 55 901 2745'),
  P('p10', 'Noura Khalil', 1970, '4120388', 'F', 'NAS', '+971 52 412 0388'),
  P('p11', 'Yusuf Rahimi', 1958, '2290674', 'M', 'SelfPay', '+971 56 229 0674'),
  P('p12', 'Hana Lindqvist', 1993, '7765021', 'F', 'SAICO', '+971 54 776 5021'),
];

const emptyClaim = () => ({
  lines: [],
  totalAed: 0,
  denialRisk: 0,
  docs: { outcomeMeasure: false, history: false, eligibilityReverified: false },
});

/** Encounters are generated from the demo date so nothing is in the past. */
export const seedEncounters = (now: Date): Encounter[] => {
  const at = (dayOffset: number, h: number, m: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h, m, 0, 0);
    if (d < now && dayOffset === 0) d.setTime(now.getTime() + (h - 7) * 15 * 60000 + 20 * 60000);
    return d.toISOString();
  };
  const E = (
    n: number,
    patientId: string,
    dayOffset: number,
    h: number,
    m: number,
    status: Encounter['status'],
    nphies: Encounter['nphies'],
    scenario: ScenarioId,
    stage: PipelineStage,
    extra: Partial<Encounter> = {},
  ): Encounter => ({
    id: `e${n}`,
    patientId,
    visitType: 'Follow-up',
    department: 'Physiotherapy',
    scheduledAt: at(dayOffset, h, m),
    status,
    nphies,
    refId: `PA-2026-00${(847231 + n * 1379).toString().padStart(6, '0')}`,
    readiness: 0,
    claim: emptyClaim(),
    sessionNo: 4,
    sessionsPlanned: 12,
    scenario,
    stage,
    ...extra,
  });
  return [
    E(1, 'p1', 0, 9, 30, 'queued', 'cleared', 'missing_docs', 'intake'),
    E(2, 'p2', 0, 11, 0, 'queued', 'cleared', 'clean', 'intake', { sessionNo: 7, sessionsPlanned: 10 }),
    E(3, 'p3', 0, 14, 15, 'queued', 'queued', 'preauth', 'eligibility', { visitType: 'Initial Evaluation', sessionNo: 1 }),
    E(4, 'p4', 1, 9, 0, 'inactive', 'inactive', 'clean', 'eligibility', {
      inactiveReason: 'NAS eligibility response: member ID not active for Physiotherapy on the date of service.',
    }),
    E(5, 'p5', 1, 10, 45, 'queued', 'cleared', 'rejection', 'intake', { sessionNo: 6, sessionsPlanned: 8 }),
    E(6, 'p6', 1, 15, 30, 'queued', 'queued', 'missing_docs', 'coding', { department: 'Orthopedics', visitType: 'Specialist Consult', sessionNo: 2 }),
    E(7, 'p7', 2, 8, 30, 'queued', 'cleared', 'clean', 'intake', { sessionNo: 12, sessionsPlanned: 12, visitType: 'Discharge' }),
    E(8, 'p8', 2, 13, 0, 'queued', 'queued', 'preauth', 'eligibility', { department: 'Occupational Therapy', sessionNo: 3 }),
  ];
};

export interface PriorityItem {
  id: string;
  kind: 'Denial' | 'Pre-Auth' | 'Appeal';
  ref: string;
  payer: Payer;
  amountAed: number;
  deadlineOffsetMs: number;
  reason: string;
  patientId: string;
  timeline: { at: string; text: string }[];
  fix: string;
}

const H = 3600000;
export const SEED_PRIORITY: PriorityItem[] = [
  {
    id: 'q1', kind: 'Denial', ref: 'DN-88213', payer: 'AlFuttaimTPA', amountAed: 18400, deadlineOffsetMs: 3 * H,
    reason: 'Coding: CPT/ICD mismatch', patientId: 'p5',
    timeline: [
      { at: 'Submitted', text: 'Claim sent to NPHIES with 4 lines' },
      { at: 'Denied', text: 'Payer flagged procedure 9.3.42 without a supporting lumbar diagnosis' },
      { at: 'Now', text: 'Appeal window closes soon' },
    ],
    fix: 'Link 9.3.42 to M54.16 (Radiculopathy, lumbar region) and resubmit with the session note.',
  },
  {
    id: 'q2', kind: 'Pre-Auth', ref: 'PA-77102', payer: 'Daman', amountAed: 9600, deadlineOffsetMs: 6 * H,
    reason: 'Medical necessity: awaiting docs', patientId: 'p6',
    timeline: [
      { at: 'Requested', text: 'Pre-auth for dry needling (9.5.20), 6 sessions' },
      { at: 'Needs info', text: 'Daman requested a functional outcome score' },
    ],
    fix: 'Attach the ODI score from session 2 and the referral letter.',
  },
  {
    id: 'q3', kind: 'Appeal', ref: 'AP-33410', payer: 'NAS', amountAed: 6250, deadlineOffsetMs: 26 * H,
    reason: 'Authorization: expired referral', patientId: 'p10',
    timeline: [
      { at: 'Denied', text: 'Referral expired 3 days before the date of service' },
      { at: 'Appeal drafted', text: 'Medexa drafted an appeal with the renewed referral' },
    ],
    fix: 'Upload the renewed GP referral and submit the drafted appeal.',
  },
  {
    id: 'q4', kind: 'Denial', ref: 'DN-90045', payer: 'SAICO', amountAed: 4180, deadlineOffsetMs: 30 * H,
    reason: 'Authorization: expired referral', patientId: 'p12',
    timeline: [
      { at: 'Denied', text: 'SAICO denied session 5 as outside the authorised window' },
    ],
    fix: 'Request a retro-authorisation extension with the plan of care.',
  },
  {
    id: 'q5', kind: 'Pre-Auth', ref: 'PA-77188', payer: 'SAICO', amountAed: 3900, deadlineOffsetMs: 52 * H,
    reason: 'Coding: missing modifier', patientId: 'p3',
    timeline: [{ at: 'Draft', text: 'Pre-auth draft missing the bilateral modifier' }],
    fix: 'Add the bilateral modifier and send.',
  },
];
