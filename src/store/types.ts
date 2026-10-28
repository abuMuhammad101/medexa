export type Payer = 'Daman' | 'NAS' | 'SAICO' | 'AlFuttaimTPA' | 'SelfPay';
export type EncounterStatus = 'queued' | 'in_session' | 'in_review' | 'cleared' | 'inactive';
export type NphiesStatus = 'cleared' | 'queued' | 'inactive';
export type Department =
  | 'Physiotherapy'
  | 'Occupational Therapy'
  | 'Speech Therapy'
  | 'Orthopedics'
  | 'General Medicine';
export type VisitType = 'Initial Evaluation' | 'Follow-up' | 'Specialist Consult' | 'Re-evaluation' | 'Discharge';
export type ScenarioId = 'clean' | 'missing_docs' | 'preauth' | 'rejection';
export type PipelineStage = 'intake' | 'coding' | 'eligibility' | 'submission' | 'denial';
export type Role = 'Clinician' | 'Coder' | 'Admin';

export interface Patient {
  id: string;
  name: string;
  emiratesId: string;
  dob: string;
  sex: 'M' | 'F';
  phone: string;
  payer: Payer;
  policyNo?: string;
  memberId?: string;
}

export type CodeSystem = 'CCHI-BS' | 'ICD-10-AM';
export type MatchState = 'matched' | 'review' | 'none';

export interface ClaimLine {
  id: string;
  kind: 'dx' | 'px';
  code: string;
  system: CodeSystem;
  description: string;
  amountAed: number;
  linkedDxIds: string[];
  match: MatchState;
  confidence: number;
  evidenceTurnIds: string[];
}

export type PreAuthState = 'none' | 'required' | 'requested' | 'approved' | 'needs_info';

export interface ClaimDocs {
  outcomeMeasure: boolean;
  history: boolean;
  eligibilityReverified: boolean;
}

export interface Claim {
  lines: ClaimLine[];
  totalAed: number;
  preAuth?: PreAuthState;
  denialRisk: number;
  docs: ClaimDocs;
  ref?: string;
  submittedAt?: string;
}

export interface Encounter {
  id: string;
  patientId: string;
  visitType: VisitType;
  department: Department;
  scheduledAt: string;
  status: EncounterStatus;
  nphies: NphiesStatus;
  refId: string;
  readiness: number;
  claim: Claim;
  sessionNo: number;
  sessionsPlanned: number;
  scenario: ScenarioId;
  stage: PipelineStage;
  inactiveReason?: string;
}

export interface TermHit {
  term: string;
  normalized: string;
  suggestionKey?: string;
}

export interface TranscriptTurn {
  id: string;
  speaker: 'clinician' | 'patient';
  text: string;
  atMs: number;
  terms: TermHit[];
  command?: boolean;
}

export type SuggestionKind = 'billing' | 'detected' | 'protocol' | 'readiness' | 'info';

export interface Suggestion {
  id: string;
  key: string;
  kind: SuggestionKind;
  text: string;
  code?: string;
  description: string;
  confidence: number;
  evidenceTurnIds: string[];
  rule?: string;
  status: 'open' | 'kept' | 'dismissed';
  asked?: boolean;
  answer?: string;
  createdAt: number;
  line?: Omit<ClaimLine, 'id' | 'evidenceTurnIds'> & { dxKey?: string };
}

export type Severity = 'error' | 'warning' | 'info';

export interface RuleFix {
  label: string;
  type: 'link_dx' | 'add_outcome' | 'request_preauth' | 'remove_line' | 'reverify';
  lineId?: string;
  dxId?: string;
}

export interface RuleResult {
  id: string;
  rule: string;
  severity: Severity;
  title: string;
  reason: string;
  evidence: string;
  fix?: RuleFix;
}
