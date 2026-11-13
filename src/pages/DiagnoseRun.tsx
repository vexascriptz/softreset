import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ListChecks, RotateCcw } from 'lucide-react';
import { Badge, Button, Checkbox, EmptyState, ErrorBanner, Field, Input, PageHeader, Panel, SegmentedControl } from '../components/ui';
import { SessionBanner } from '../components/SessionBanner';
import { useActiveSession } from '../lib/activeSession';
import { logEntry, updateSession } from '../lib/sessions';
import { pushRecent } from '../lib/hooks';
import { PROBLEM_BY_ID } from '../data/problems';
import { getTree, type DiagnosticNode, type DiagnosticTree, type MeasureNode, type MeasureOutcome, type Observation, type ResultNode } from '../data/diagnostics';
import { PROCEDURE_BY_ID } from '../data/procedures';
import { toolName } from '../data/software';
import { nowIso, uid } from '../lib/utils';
import type { Finding, Measurement, Phase, Session, WorkflowState } from '../lib/types';

export default function DiagnoseRun() {
  const { problemId = '' } = useParams();
  const problem = PROBLEM_BY_ID[problemId];
  const tree = getTree(problem?.workflowId);
  const { session, ready, activeId } = useActiveSession();

  if (!problem || !tree) {
    return (
      <EmptyState title="This workflow is not available yet" action={<Link to="/diagnose" className="text-sm font-medium text-accent hover:underline">Back to Diagnose</Link>}>
        softreset only includes diagnostic workflows that have been written and checked. Planned problems are listed on the Diagnose page.
      </EmptyState>
    );
  }

  // Wait for the active session to load, so an earlier run in it can be resumed.
  if (activeId && !ready) return <p className="text-sm text-muted">Loading…</p>;

  return <Runner key={problemId} problemId={problemId} tree={tree} session={session} />;
}

function freshState(problemId: string, tree: DiagnosticTree): WorkflowState {
  return { problemId, nodeId: tree.start, answers: {}, values: {}, history: [], conditions: '', phase: 'before', finished: false };
}

interface PendingMeasure {
  outcome: MeasureOutcome;
  values: Record<string, number>;
  conditions: string;
}

function Runner({ problemId, tree, session }: { problemId: string; tree: DiagnosticTree; session: Session | undefined }) {
  const sessionId = session?.id;
  // Read once at mount. Later saves to the session must not reset the workflow on screen.
  const [initial] = useState(() => {
    const wf = session?.workflow;
    if (wf && wf.problemId === problemId && !wf.finished && tree.nodes[wf.nodeId]) return { state: wf, resumed: true };
    return { state: freshState(problemId, tree), resumed: false };
  });

  const [state, setState] = useState<WorkflowState>(initial.state);
  const [stack, setStack] = useState<WorkflowState[]>([]);
  const [pending, setPending] = useState<PendingMeasure | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [resumedBanner, setResumedBanner] = useState(initial.resumed);

  const node = tree.nodes[state.nodeId] as DiagnosticNode | undefined;
  const problemTitle = PROBLEM_BY_ID[problemId]?.title ?? tree.title;

  useEffect(() => {
    pushRecent({ kind: 'problem', id: problemId, title: problemTitle, href: `/diagnose/${problemId}` });
  }, [problemId, problemTitle]);

  const clearStep = () => {
    setPending(null);
    setInputs({});
    setErrors({});
    setChecked({});
  };

  /** Writes to the active session, if there is one. Without a session, the diagnosis stays on screen. */
  const save = (change: (draft: Session) => void) => {
    if (!sessionId) return;
    updateSession(sessionId, change).catch((err: unknown) => setSaveError(err instanceof Error ? err.message : 'Could not save to the session.'));
  };

  /** Moves to the next state. The current state is pushed so Back can return to it. */
  const enter = (next: WorkflowState, previous: WorkflowState, extra?: (draft: Session) => void) => {
    const target = tree.nodes[next.nodeId];
    const result: ResultNode | undefined = target && target.type === 'result' ? target : undefined;
    const finalState: WorkflowState = result ? { ...next, finished: true } : next;
    setStack((s) => [...s, previous]);
    setState(finalState);
    clearStep();
    save((draft) => {
      draft.workflow = finalState;
      if (result) {
        const finding: Finding = {
          id: uid(),
          at: nowIso(),
          level: result.confidence === 'low' ? 'notice' : 'info',
          source: tree.title,
          text: `${result.title}. ${result.summary}`,
        };
        draft.findings.push(finding);
        draft.log.push(logEntry('diagnosis', `Diagnosis concluded: ${result.title}.`));
      }
      extra?.(draft);
    });
  };

  const choose = (option: { value: string; label: string; next: string }) => {
    if (node?.type !== 'choice') return;
    const next: WorkflowState = {
      ...state,
      answers: { ...state.answers, [node.answerKey]: option.value },
      history: [...state.history, { nodeId: node.id, title: node.title, summary: [`Answer: ${option.label}`] }],
      nodeId: option.next,
    };
    enter(next, state);
  };

  const continueChecklist = () => {
    if (node?.type !== 'checklist') return;
    const done = node.items.filter((_, i) => checked[i]).length;
    const next: WorkflowState = {
      ...state,
      history: [...state.history, { nodeId: node.id, title: node.title, summary: [`${done} of ${node.items.length} setup items confirmed.`] }],
      nodeId: node.next,
    };
    enter(next, state);
  };

  /** Validates the numbers and interprets them. Nothing is saved until the technician continues. */
  const submitMeasure = (measure: MeasureNode) => {
    const nextErrors: Record<string, string> = {};
    const parsed: Record<string, number> = {};
    for (const f of measure.fields) {
      const raw = (inputs[f.key] ?? '').trim();
      if (raw === '') {
        nextErrors[f.key] = `Enter ${f.label.toLowerCase()}.`;
        continue;
      }
      const n = Number(raw);
      if (!Number.isFinite(n) || n < f.min || n > f.max) {
        nextErrors[f.key] = `Enter a number from ${f.min} to ${f.max} ${f.unit}.`;
        continue;
      }
      parsed[f.key] = n;
    }
    const conditions = (inputs.conditions ?? state.conditions).trim();
    if (!conditions) {
      nextErrors.conditions = 'Describe the conditions, such as the open programs and the scene, so the values can be compared later.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setPending({ outcome: measure.interpret(parsed, state.answers), values: parsed, conditions });
  };

  /** Saves the measured values and observations, then moves on to the node the interpretation chose. */
  const continueMeasure = (measure: MeasureNode) => {
    if (!pending) return;
    const { outcome, values, conditions } = pending;
    const measurements: Measurement[] = measure.fields
      .filter((f) => f.metric && values[f.key] !== undefined)
      .map((f) => ({
        id: uid(),
        at: nowIso(),
        metric: f.metric as Measurement['metric'],
        value: values[f.key],
        phase: state.phase,
        conditions,
        note: `From ${tree.title}: ${measure.title.toLowerCase()}.`,
      }));
    const findings: Finding[] = outcome.observations.map((o: Observation) => ({
      id: uid(),
      at: nowIso(),
      level: o.level,
      source: `${tree.title}, ${measure.title}`,
      text: o.text,
    }));
    const next: WorkflowState = {
      ...state,
      conditions,
      values: { ...state.values, [measure.id]: values },
      history: [...state.history, { nodeId: measure.id, title: measure.title, summary: outcome.observations.map((o) => o.text) }],
      nodeId: outcome.next,
    };
    enter(next, state, (draft) => {
      draft.measurements.push(...measurements);
      draft.findings.push(...findings);
      draft.log.push(logEntry('diagnosis', `${measure.title}: ${outcome.summary}`));
    });
  };

  const back = () => {
    const prev = stack[stack.length - 1];
    if (!prev) return;
    setStack((s) => s.slice(0, -1));
    setState(prev);
    clearStep();
    save((draft) => {
      draft.workflow = prev;
    });
  };

  const startOver = () => {
    const fresh = freshState(problemId, tree);
    setStack([]);
    setState(fresh);
    clearStep();
    setResumedBanner(false);
    save((draft) => {
      draft.workflow = fresh;
      draft.log.push(logEntry('diagnosis', `Diagnosis restarted: ${tree.title}.`));
    });
  };

  const setPhase = (phase: Phase) => {
    setState((s) => ({ ...s, phase }));
    save((draft) => {
      if (draft.workflow) draft.workflow.phase = phase;
    });
  };

  const canGoBack = stack.length > 0 && node !== undefined && node.type !== 'result' && !pending;

  return (
    <>
      <PageHeader
        title={tree.title}
        description={tree.intro}
        actions={
          <>
            <Badge>About {tree.estimatedMinutes} min</Badge>
            <Button size="sm" variant="ghost" onClick={startOver}>
              <RotateCcw size={14} aria-hidden /> Start over
            </Button>
          </>
        }
      />

      <div className="mb-5 flex flex-col gap-3">
        <SessionBanner />
        {resumedBanner && (
          <div className="flex flex-wrap items-center gap-3 rounded-control border border-line bg-brand-soft px-4 py-2.5 text-sm text-ink">
            <span>Resumed from an earlier run in this session.</span>
            <button type="button" onClick={() => setResumedBanner(false)} className="ml-auto text-accent hover:underline">
              Dismiss
            </button>
          </div>
        )}
        {saveError && <ErrorBanner>{saveError}</ErrorBanner>}
      </div>

      <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside aria-label="Evidence so far" className="lg:sticky lg:top-20 lg:self-start">
          <h2 className="mb-3 text-sm font-medium text-ink">Evidence so far</h2>
          {state.history.length === 0 ? (
            <p className="text-sm text-muted">Each answer and measurement appears here, with what it showed.</p>
          ) : (
            <ol className="relative flex flex-col gap-4 border-l border-line pl-5">
              {state.history.map((h, i) => (
                <li key={`${h.nodeId}-${i}`} className="relative">
                  <span className="absolute -left-[25px] top-1.5 h-2 w-2 rounded-full bg-brand" aria-hidden />
                  <p className="text-sm text-ink">{h.title}</p>
                  {h.summary.map((line, j) => (
                    <p key={j} className="mt-0.5 text-xs leading-snug text-muted">
                      {line}
                    </p>
                  ))}
                </li>
              ))}
            </ol>
          )}
        </aside>

        <div className="min-w-0">
          {node?.type === 'choice' && (
            <Panel title={node.title} description={node.prompt}>
              <WhyBlock text={node.why} />
              <ul className="mt-4 flex flex-col gap-2">
                {node.options.map((o) => (
                  <li key={o.value}>
                    <button
                      type="button"
                      onClick={() => choose(o)}
                      className="flex w-full items-center rounded-control border border-line bg-surface px-4 py-3 text-left text-sm text-ink transition-colors hover:border-brand hover:bg-brand-soft/60"
                    >
                      {o.label}
                    </button>
                  </li>
                ))}
              </ul>
              {canGoBack && (
                <div className="mt-5">
                  <BackButton onClick={back} />
                </div>
              )}
            </Panel>
          )}

          {node?.type === 'checklist' && (
            <Panel title={node.title} description="Confirm each item. You can continue with items unchecked, but the baseline is only as good as the setup.">
              <WhyBlock text={node.why} />
              <ul className="mt-4 flex flex-col gap-3">
                {node.items.map((item, i) => (
                  <li key={item}>
                    <Checkbox id={`check-${i}`} checked={Boolean(checked[i])} onChange={(v) => setChecked((c) => ({ ...c, [i]: v }))} label={item} />
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Button variant="primary" onClick={continueChecklist}>
                  Continue
                </Button>
                {canGoBack && <BackButton onClick={back} />}
              </div>
            </Panel>
          )}

          {node?.type === 'measure' && (
            <Panel title={node.title} description="Enter the values you measured. softreset interprets them against the thresholds below, then suggests the next step.">
              <WhyBlock text={node.why} />

              <div className="mt-5 flex flex-col gap-3">
                <p className="text-sm font-medium text-ink">Take the measurements</p>
                <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink marker:text-muted">
                  {node.instructions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                {node.softwareIds.length > 0 && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-sm">
                    <span className="text-muted">Use:</span>
                    {node.softwareIds.map((id) => (
                      <Link
                        key={id}
                        to={`/library/${id}`}
                        onClick={() => pushRecent({ kind: 'tool', id, title: toolName(id), href: `/library/${id}` })}
                        className="text-accent hover:underline"
                      >
                        {toolName(id)}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <details className="group mt-5 rounded-control border border-line px-4 py-3 text-sm">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-ink">
                  <ChevronDown size={15} className="text-muted transition-transform group-open:rotate-180" aria-hidden />
                  How the thresholds are set
                </summary>
                <p className="mt-2 max-w-[68ch] text-muted">{node.basis}</p>
              </details>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {node.fields.map((f) => (
                  <Field key={f.key} label={`${f.label} (${f.unit})`} htmlFor={`f-${f.key}`} hint={f.hint} error={errors[f.key]}>
                    <Input
                      id={`f-${f.key}`}
                      inputMode="decimal"
                      value={inputs[f.key] ?? ''}
                      onChange={(e) => setInputs((i) => ({ ...i, [f.key]: e.target.value }))}
                      disabled={Boolean(pending)}
                    />
                  </Field>
                ))}
                <Field
                  label="Conditions"
                  htmlFor="f-conditions"
                  hint="The open programs, scene, settings, and time. Keep the same wording for a later comparison."
                  error={errors.conditions}
                  className="sm:col-span-2"
                >
                  <Input
                    id="f-conditions"
                    value={inputs.conditions ?? state.conditions}
                    onChange={(e) => setInputs((i) => ({ ...i, conditions: e.target.value }))}
                    disabled={Boolean(pending)}
                    placeholder="Idle, browser closed, 15:00"
                  />
                </Field>
              </div>

              {!pending && (
                <div className="mt-6 flex flex-wrap items-center gap-2">
                  <Button variant="primary" onClick={() => submitMeasure(node)}>
                    Interpret these values
                  </Button>
                  {canGoBack && <BackButton onClick={back} />}
                </div>
              )}

              {pending && (
                <div className="mt-6 flex flex-col gap-4">
                  <ObservationList observations={pending.outcome.observations} />
                  <p className="text-xs text-muted">Continuing saves these values and observations to the session.</p>
                  <div>
                    <Button variant="primary" onClick={() => continueMeasure(node)}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}
            </Panel>
          )}

          {node?.type === 'result' && <ResultView node={node} onStartOver={startOver} />}

          {!node && <EmptyState title="This step is missing from the workflow">Start over, or let the person who maintains the workflow file know.</EmptyState>}

          {node?.type === 'measure' && (
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted">These measurements were taken</span>
              <SegmentedControl<Phase>
                label="Measurement timing"
                value={state.phase}
                onChange={setPhase}
                options={[
                  { value: 'before', label: 'Before changes' },
                  { value: 'after', label: 'After changes' },
                ]}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function WhyBlock({ text }: { text: string }) {
  return (
    <details className="group text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-accent">
        <ChevronDown size={14} className="transition-transform group-open:rotate-180" aria-hidden />
        Why this step matters
      </summary>
      <p className="mt-2 max-w-[68ch] text-muted">{text}</p>
    </details>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" onClick={onClick}>
      <ArrowLeft size={15} aria-hidden /> Back
    </Button>
  );
}

const LEVEL_TONE = { info: 'neutral', notice: 'caution', concern: 'concern' } as const;
const LEVEL_LABEL = { info: 'Info', notice: 'Notice', concern: 'Concern' } as const;

function ObservationList({ observations }: { observations: Observation[] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {observations.map((o, i) => (
        <li key={i} className="settle flex items-start gap-3 rounded-control bg-surface-2 px-4 py-3" style={{ animationDelay: `${i * 120}ms` }}>
          <Badge tone={LEVEL_TONE[o.level]} className="mt-px">
            {LEVEL_LABEL[o.level]}
          </Badge>
          <p className="text-sm text-ink">{o.text}</p>
        </li>
      ))}
    </ul>
  );
}

const CONFIDENCE_TONE = { low: 'caution', medium: 'brand', high: 'ok' } as const;
const CONFIDENCE_LABEL = { low: 'Low confidence', medium: 'Medium confidence', high: 'High confidence' } as const;

/** The one orchestrated moment in the app: the conclusion settles in, and its parts follow in sequence. */
function ResultView({ node, onStartOver }: { node: ResultNode; onStartOver: () => void }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="settle">
        <Panel title={node.title} description={node.summary} actions={<Badge tone={CONFIDENCE_TONE[node.confidence]}>{CONFIDENCE_LABEL[node.confidence]}</Badge>}>
          <WhyBlock text={node.why} />
          {node.causes.length > 0 && (
            <div className="mt-5">
              <p className="text-sm font-medium text-ink">Possible causes</p>
              <ul className="mt-2 list-disc pl-5 text-sm text-ink marker:text-muted">
                {node.causes.map((c) => (
                  <li key={c} className="py-0.5">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-5 rounded-control border border-line bg-surface-2 px-4 py-3">
            <p className="text-sm font-medium text-ink">What this does not establish</p>
            <p className="mt-1 max-w-[68ch] text-sm text-muted">{node.uncertainty}</p>
          </div>
          {node.escalate && <p className="mt-4 max-w-[68ch] rounded-control bg-caution-soft px-4 py-3 text-sm text-caution">{node.escalate}</p>}
        </Panel>
      </div>

      {node.actions.length > 0 && (
        <div className="settle" style={{ animationDelay: '120ms' }}>
          <Panel title="Next actions" description="Each action says why it is recommended. Take the ones the evidence supports.">
            <ul className="divide-y divide-line">
              {node.actions.map((a, i) => (
                <li key={i} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0">
                  <p className="text-sm font-medium text-ink">{a.text}</p>
                  <p className="max-w-[68ch] text-sm text-muted">{a.why}</p>
                  {a.safety && <p className="max-w-[68ch] text-sm text-concern">Safety: {a.safety}</p>}
                  {a.procedureId && PROCEDURE_BY_ID[a.procedureId] && (
                    <div>
                      <Link
                        to={`/procedures/${a.procedureId}`}
                        className="inline-flex h-8 items-center rounded-control border border-line bg-surface px-3 text-[13px] font-medium text-ink hover:bg-surface-2"
                      >
                        Open procedure: {PROCEDURE_BY_ID[a.procedureId].title}
                      </Link>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      {node.verify.length > 0 && (
        <div className="settle" style={{ animationDelay: '240ms' }}>
          <Panel title="Verify the outcome" description="Check these under the same conditions as the first measurement.">
            <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-ink marker:text-muted">
              {node.verify.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </Panel>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onStartOver}>
          <ListChecks size={15} aria-hidden /> Start a new diagnosis
        </Button>
        <Link to="/diagnose" className="text-sm text-accent hover:underline">
          Back to Diagnose
        </Link>
      </div>
    </div>
  );
}
