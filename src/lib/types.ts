export type Level = 'info' | 'notice' | 'concern';
export type SessionStatus = 'open' | 'paused' | 'completed';
export type Phase = 'before' | 'after';
export type VerificationResult = 'passed' | 'failed' | 'not-tested';
export type LogKind = 'system' | 'diagnosis' | 'action' | 'verification' | 'note';

export type MetricKey =
  | 'boot-seconds'
  | 'startup-items'
  | 'ram-idle-pct'
  | 'ram-peak-pct'
  | 'cpu-idle-pct'
  | 'disk-idle-pct'
  | 'free-space-gb'
  | 'avg-fps'
  | 'low-1pct-fps'
  | 'frametime-ms';

export interface Customer {
  id: string;
  name: string;
  reference: string;
  contact: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Hardware {
  device: string;
  cpu: string;
  gpu: string;
  ram: string;
  storage: string;
  displayHz: string;
}

export interface Finding {
  id: string;
  at: string;
  level: Level;
  source: string;
  text: string;
}

export interface Measurement {
  id: string;
  at: string;
  metric: MetricKey;
  value: number;
  phase: Phase;
  conditions: string;
  note: string;
}

export interface ActionRecord {
  id: string;
  at: string;
  description: string;
  procedureId?: string;
  softwareId?: string;
}

export interface SettingChange {
  id: string;
  at: string;
  setting: string;
  before: string;
  after: string;
  reversal: string;
}

export interface Verification {
  id: string;
  at: string;
  check: string;
  result: VerificationResult;
  detail: string;
}

export interface LogEntry {
  id: string;
  at: string;
  kind: LogKind;
  text: string;
}

export interface HistoryStep {
  nodeId: string;
  title: string;
  summary: string[];
}

export interface WorkflowState {
  problemId: string;
  nodeId: string;
  answers: Record<string, string>;
  values: Record<string, Record<string, number>>;
  history: HistoryStep[];
  conditions: string;
  phase: Phase;
  finished: boolean;
}

export interface Session {
  id: string;
  customerId: string;
  serviceId: string;
  status: SessionStatus;
  reportedIssue: string;
  initialCondition: string;
  windowsVersion: string;
  hardware: Hardware;
  findings: Finding[];
  measurements: Measurement[];
  actions: ActionRecord[];
  settingsChanged: SettingChange[];
  verifications: Verification[];
  procedureProgress: Record<string, string[]>;
  workflow: WorkflowState | null;
  remainingConcerns: string;
  maintenance: string;
  notes: string;
  log: LogEntry[];
  openedAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface RecentItem {
  kind: 'tool' | 'procedure' | 'problem';
  id: string;
  title: string;
  href: string;
  at: string;
}

export interface ExportBundle {
  app: 'softreset';
  schemaVersion: 1;
  exportedAt: string;
  customers: Customer[];
  sessions: Session[];
}
