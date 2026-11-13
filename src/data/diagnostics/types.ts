// Structured decision-tree format. Each workflow is a set of nodes keyed by id.
// A choice node records an answer; a measure node takes numbers and interprets them in context;
// a checklist node asks the technician to confirm setup; a result node states a conclusion with its uncertainty.

export type Level = 'info' | 'notice' | 'concern';

export interface Observation {
  level: Level;
  text: string;
}

export interface ChoiceOption {
  label: string;
  value: string;
  next: string;
}

export interface MeasureField {
  key: string;
  label: string;
  unit: string;
  hint: string;
  min: number;
  max: number;
  /** When set, the value is saved to the session as a measurement with this metric. */
  metric?: string;
}

export type Values = Record<string, number | undefined>;
export type Answers = Record<string, string>;

export interface MeasureOutcome {
  observations: Observation[];
  next: string;
  summary: string;
}

export interface ResultAction {
  text: string;
  why: string;
  procedureId?: string;
  safety?: string;
}

interface NodeBase {
  id: string;
  title: string;
  /** Why this step matters. Shown in a quiet expandable block. */
  why: string;
}

export interface ChoiceNode extends NodeBase {
  type: 'choice';
  prompt: string;
  answerKey: string;
  options: ChoiceOption[];
}

export interface ChecklistNode extends NodeBase {
  type: 'checklist';
  items: string[];
  next: string;
}

export interface MeasureNode extends NodeBase {
  type: 'measure';
  instructions: string[];
  softwareIds: string[];
  fields: MeasureField[];
  /** Basis for the thresholds, so the technician can judge them against the customer's hardware. */
  basis: string;
  interpret: (values: Values, answers: Answers) => MeasureOutcome;
}

export interface ResultNode extends NodeBase {
  type: 'result';
  confidence: 'low' | 'medium' | 'high';
  summary: string;
  causes: string[];
  uncertainty: string;
  actions: ResultAction[];
  verify: string[];
  escalate?: string;
}

export type DiagnosticNode = ChoiceNode | ChecklistNode | MeasureNode | ResultNode;

export interface DiagnosticTree {
  problemId: string;
  title: string;
  intro: string;
  estimatedMinutes: number;
  start: string;
  nodes: Record<string, DiagnosticNode>;
}
