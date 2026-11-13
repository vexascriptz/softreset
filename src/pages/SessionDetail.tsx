import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, FileText, Gauge, Pause, Play, Plus, Stethoscope, Target } from 'lucide-react';
import { Badge, Button, ConfirmButton, EmptyState, ErrorBanner, Field, Input, PageHeader, Panel, ProgressBar, Select, Textarea } from '../components/ui';
import { StatusBadge } from '../components/SessionBanner';
import { useCollection, useRecord } from '../lib/hooks';
import { useActiveSession } from '../lib/activeSession';
import { logEntry, setSessionStatus, updateSession } from '../lib/sessions';
import { deleteRow } from '../lib/db';
import { METRICS, METRIC_BY_KEY } from '../lib/metrics';
import { formatDateTime, formatWithUnit, uid, nowIso } from '../lib/utils';
import type { Customer, Finding, Level, Phase, Session, VerificationResult } from '../lib/types';
import { PROCEDURES } from '../data/procedures';
import { SERVICE_BY_ID } from '../data/services';
import { PENDING_TOOLS, SOFTWARE, toolName } from '../data/software';
import { PROBLEM_BY_ID } from '../data/problems';
import { getTree } from '../data/diagnostics';

type Run = (change: (draft: Session) => void) => Promise<void>;

const LEVEL_TONE = { info: 'neutral', notice: 'caution', concern: 'concern' } as const;
const LEVEL_LABEL: Record<Level, string> = { info: 'Info', notice: 'Notice', concern: 'Concern' };

export default function SessionDetail() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { item: session, ready } = useRecord<Session>('sessions', sessionId);
  const { items: customers } = useCollection<Customer>('customers');
  const { activeId, setActiveId } = useActiveSession();
  const [error, setError] = useState<string | null>(null);

  if (!ready) return <p className="text-sm text-muted">Loading session…</p>;
  if (!session) {
    return (
      <EmptyState title="This session does not exist" action={<Button onClick={() => navigate('/sessions')}>Back to sessions</Button>}>
        It may have been deleted, or the link came from another browser. Sessions are stored per browser.
      </EmptyState>
    );
  }

  const customer = customers.find((c) => c.id === session.customerId);
  const isActive = session.id === activeId;
  const serviceLabel = SERVICE_BY_ID[session.serviceId]?.label ?? 'Session';

  const run: Run = async (change) => {
    setError(null);
    try {
      await updateSession(session.id, change);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The change could not be saved.');
    }
  };

  return (
    <>
      <PageHeader
        title={customer?.name ?? 'Session'}
        description={`${serviceLabel}, opened ${formatDateTime(session.openedAt)}, last changed ${formatDateTime(session.updatedAt)}`}
        actions={
          <>
            <StatusBadge status={session.status} />
            {isActive ? (
              <Badge tone="brand">Saving here</Badge>
            ) : (
              session.status !== 'completed' && (
                <Button size="sm" onClick={() => setActiveId(session.id)}>
                  Save diagnoses here
                </Button>
              )
            )}
            {session.status === 'open' && (
              <Button size="sm" variant="ghost" onClick={() => setSessionStatus(session.id, 'paused')}>
                <Pause size={14} aria-hidden /> Pause
              </Button>
            )}
            {session.status === 'paused' && (
              <Button size="sm" variant="ghost" onClick={() => setSessionStatus(session.id, 'open')}>
                <Play size={14} aria-hidden /> Resume
              </Button>
            )}
            {session.status !== 'completed' && (
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  await setSessionStatus(session.id, 'completed');
                  if (isActive) setActiveId(null);
                }}
              >
                <CheckCircle2 size={14} aria-hidden /> Complete
              </Button>
            )}
            <Link to="/diagnose" className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-[13px] font-medium text-ink hover:bg-surface-2">
              <Stethoscope size={14} aria-hidden /> Diagnose
            </Link>
            <Link to={`/reports/${session.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-[13px] font-medium text-ink hover:bg-surface-2">
              <FileText size={14} aria-hidden /> Report
            </Link>
          </>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      <div className="flex flex-col gap-5">
        <CaseDetails key={session.id} session={session} run={run} serviceQuestions={SERVICE_BY_ID[session.serviceId]?.intake ?? []} />
        <DiagnosisPanel session={session} />
        <FindingsPanel session={session} run={run} />
        <MeasurementsPanel session={session} run={run} />
        <ActionsPanel session={session} run={run} />
        <SettingsPanel session={session} run={run} />
        <ProcedureProgressPanel session={session} />
        <VerificationPanel session={session} run={run} />
        <ConcernsPanel key={`c-${session.id}`} session={session} run={run} />
        <NotesPanel key={`n-${session.id}`} session={session} run={run} />

        <Panel title="Delete this session" description="Removes this session’s findings, measurements, and notes from this browser. The customer record stays.">
          <ConfirmButton
            label="Delete session"
            confirmLabel="Confirm: delete this session"
            onConfirm={async () => {
              await deleteRow('sessions', session.id);
              if (isActive) setActiveId(null);
              navigate('/sessions');
            }}
          />
        </Panel>
      </div>
    </>
  );
}

function CaseDetails({ session, run, serviceQuestions }: { session: Session; run: Run; serviceQuestions: string[] }) {
  const [form, setForm] = useState({
    reportedIssue: session.reportedIssue,
    initialCondition: session.initialCondition,
    windowsVersion: session.windowsVersion,
    hardware: { ...session.hardware },
  });
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await run((s) => {
      s.reportedIssue = form.reportedIssue.trim();
      s.initialCondition = form.initialCondition.trim();
      s.windowsVersion = form.windowsVersion.trim();
      s.hardware = { ...form.hardware };
      s.log.push(logEntry('system', 'Case details updated.'));
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const hw = form.hardware;
  const setHw = (key: keyof typeof hw, value: string) => setForm({ ...form, hardware: { ...hw, [key]: value } });

  return (
    <Panel
      title="Case details"
      description="What the customer reported, the machine as it was when you started, and the hardware that the report needs."
      actions={
        <Button variant="primary" size="sm" onClick={save}>
          {saved ? 'Saved' : 'Save case details'}
        </Button>
      }
    >
      <div className="grid gap-4">
        <Field label="Reported issue" htmlFor="reported">
          <Textarea id="reported" rows={2} value={form.reportedIssue} onChange={(e) => setForm({ ...form, reportedIssue: e.target.value })} />
        </Field>
        <Field label="Initial condition" htmlFor="initial" hint="What you observed when you started. Times, symptoms, and what was already open.">
          <Textarea id="initial" rows={2} value={form.initialCondition} onChange={(e) => setForm({ ...form, initialCondition: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Windows version" htmlFor="winver" hint="From winver, for example 23H2 or 24H2 with the build.">
            <Input id="winver" value={form.windowsVersion} onChange={(e) => setForm({ ...form, windowsVersion: e.target.value })} />
          </Field>
          <Field label="Device" htmlFor="device" hint="Desktop or laptop, and the model.">
            <Input id="device" value={hw.device} onChange={(e) => setHw('device', e.target.value)} />
          </Field>
          <Field label="Display refresh rate" htmlFor="hz">
            <Input id="hz" value={hw.displayHz} onChange={(e) => setHw('displayHz', e.target.value)} placeholder="144 Hz" />
          </Field>
          <Field label="Processor" htmlFor="cpu">
            <Input id="cpu" value={hw.cpu} onChange={(e) => setHw('cpu', e.target.value)} />
          </Field>
          <Field label="Graphics" htmlFor="gpu">
            <Input id="gpu" value={hw.gpu} onChange={(e) => setHw('gpu', e.target.value)} />
          </Field>
          <Field label="Memory" htmlFor="ram">
            <Input id="ram" value={hw.ram} onChange={(e) => setHw('ram', e.target.value)} placeholder="16 GB" />
          </Field>
          <Field label="Storage" htmlFor="storage" hint="Drive models and sizes.">
            <Input id="storage" value={hw.storage} onChange={(e) => setHw('storage', e.target.value)} />
          </Field>
        </div>
        {serviceQuestions.length > 0 && (
          <details className="text-sm">
            <summary className="cursor-pointer text-accent hover:underline">Questions for this service</summary>
            <ul className="mt-2 list-disc pl-5 text-muted marker:text-muted">
              {serviceQuestions.map((q) => (
                <li key={q} className="py-0.5">
                  {q}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </Panel>
  );
}

function DiagnosisPanel({ session }: { session: Session }) {
  const wf = session.workflow;
  const tree = wf ? getTree(PROBLEM_BY_ID[wf.problemId]?.workflowId) : undefined;
  const problemId = wf?.problemId;
  return (
    <Panel
      title="Diagnosis"
      description="The diagnostic workflow for this session. Its state is saved, so you can resume it after a pause."
      actions={
        <Link to={problemId ? `/diagnose/${problemId}` : '/diagnose'} className="inline-flex h-8 items-center rounded-control bg-brand px-3 text-[13px] font-medium text-on-brand hover:bg-brand-strong">
          {wf && !wf.finished ? 'Resume diagnosis' : wf ? 'Open diagnosis' : 'Start a diagnosis'}
        </Link>
      }
    >
      {!wf || !tree ? (
        <p className="text-sm text-muted">No diagnosis has run in this session yet. Start with the customer’s complaint on the Diagnose page.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-ink">{tree.title}</p>
          <p className="text-sm text-muted">
            {wf.finished ? 'Concluded. The result is saved to the findings below.' : `In progress at: ${tree.nodes[wf.nodeId]?.title ?? 'the current step'}.`}
          </p>
          {wf.history.length > 0 && (
            <ol className="flex flex-col gap-2 border-l border-line pl-4">
              {wf.history.map((h, i) => (
                <li key={`${h.nodeId}-${i}`} className="text-sm">
                  <span className="text-ink">{h.title}</span>
                  {h.summary.map((line, j) => (
                    <span key={j} className="block text-muted">
                      {line}
                    </span>
                  ))}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </Panel>
  );
}

function FindingsPanel({ session, run }: { session: Session; run: Run }) {
  const [text, setText] = useState('');
  const [level, setLevel] = useState<Level>('info');
  const [source, setSource] = useState('Technician');
  const [err, setErr] = useState<string | null>(null);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setErr('Write the finding in one or two sentences before adding it.');
      return;
    }
    setErr(null);
    const finding: Finding = { id: uid(), at: nowIso(), level, source: source.trim() || 'Technician', text: text.trim() };
    await run((s) => {
      s.findings.push(finding);
      s.log.push(logEntry('diagnosis', `Finding added: ${finding.text}`));
    });
    setText('');
  };

  return (
    <Panel title="Findings" description="What the evidence shows and how strongly. Keep each one to what you can support.">
      {session.findings.length === 0 ? (
        <p className="mb-4 text-sm text-muted">No findings yet. Diagnostic conclusions are added here automatically.</p>
      ) : (
        <ul className="mb-5 divide-y divide-line">
          {session.findings.map((f) => (
            <li key={f.id} className="flex flex-col gap-1 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={LEVEL_TONE[f.level]}>{LEVEL_LABEL[f.level]}</Badge>
                <span className="text-xs text-muted">
                  {f.source}, {formatDateTime(f.at)}
                </span>
              </div>
              <p className="text-sm text-ink">{f.text}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_9rem_9rem_auto] sm:items-end">
        <Field label="Add a finding" htmlFor="finding-text" error={err}>
          <Input id="finding-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="For example, sign-in took 140 s with 19 enabled items." />
        </Field>
        <Field label="Level" htmlFor="finding-level">
          <Select id="finding-level" value={level} onChange={(e) => setLevel(e.target.value as Level)}>
            <option value="info">Info</option>
            <option value="notice">Notice</option>
            <option value="concern">Concern</option>
          </Select>
        </Field>
        <Field label="Source" htmlFor="finding-source">
          <Input id="finding-source" value={source} onChange={(e) => setSource(e.target.value)} />
        </Field>
        <Button type="submit" variant="secondary">
          <Plus size={15} aria-hidden /> Add
        </Button>
      </form>
    </Panel>
  );
}

function MeasurementsPanel({ session, run }: { session: Session; run: Run }) {
  const [metric, setMetric] = useState(METRICS[0].key as string);
  const [phase, setPhase] = useState<Phase>('before');
  const [value, setValue] = useState('');
  const [conditions, setConditions] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const def = METRIC_BY_KEY[metric as keyof typeof METRIC_BY_KEY];

  const add = async (e: FormEvent) => {
    e.preventDefault();
    const n = Number(value);
    if (value.trim() === '' || !Number.isFinite(n)) {
      setErr(`Enter a number for ${def.label.toLowerCase()}, in ${def.unit}.`);
      return;
    }
    if (n < 0) {
      setErr('Measurements cannot be negative. Recheck the value.');
      return;
    }
    setErr(null);
    await run((s) => {
      s.measurements.push({ id: uid(), at: nowIso(), metric: def.key, value: n, phase, conditions: conditions.trim(), note: note.trim() });
      s.log.push(logEntry('diagnosis', `Measured ${def.label.toLowerCase()} (${phase} changes): ${n} ${def.unit}.`));
    });
    setValue('');
    setNote('');
  };

  const sorted = [...session.measurements].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <Panel
      title="Measurements"
      description="Record each value with its conditions. Two values only compare fairly when the conditions match."
      actions={
        <Link to="/performance" className="inline-flex h-8 items-center gap-1.5 text-[13px] font-medium text-accent hover:underline">
          <Gauge size={14} aria-hidden /> Compare before and after
        </Link>
      }
    >
      <form onSubmit={add} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.2fr_0.8fr_0.7fr_1.4fr_auto] lg:items-end">
        <Field label="Measurement" htmlFor="m-metric">
          <Select id="m-metric" value={metric} onChange={(e) => setMetric(e.target.value)}>
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label} ({m.unit})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Taken" htmlFor="m-phase">
          <Select id="m-phase" value={phase} onChange={(e) => setPhase(e.target.value as Phase)}>
            <option value="before">Before changes</option>
            <option value="after">After changes</option>
          </Select>
        </Field>
        <Field label={`Value (${def.unit})`} htmlFor="m-value" error={err} hint={def.help}>
          <Input id="m-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
        </Field>
        <Field label="Conditions" htmlFor="m-cond" hint="Open programs, scene, settings, time. Keep the wording identical for before and after.">
          <Input id="m-cond" value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="Idle, browser closed, 15:00" />
        </Field>
        <Button type="submit" variant="secondary">
          <Plus size={15} aria-hidden /> Add
        </Button>
      </form>

      <div className="mt-5 overflow-x-auto">
        {sorted.length === 0 ? (
          <p className="text-sm text-muted">No measurements yet.</p>
        ) : (
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-3 font-medium">Measurement</th>
                <th className="py-2 pr-3 font-medium">Taken</th>
                <th className="py-2 pr-3 text-right font-medium">Value</th>
                <th className="py-2 pr-3 font-medium">Conditions</th>
                <th className="py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sorted.map((m) => {
                const d = METRIC_BY_KEY[m.metric];
                return (
                  <tr key={m.id} className="align-top">
                    <td className="py-2.5 pr-3 text-ink">{d?.label ?? m.metric}</td>
                    <td className="py-2.5 pr-3">
                      <Badge tone={m.phase === 'after' ? 'brand' : 'neutral'}>{m.phase === 'after' ? 'After' : 'Before'}</Badge>
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-ink">{d ? formatWithUnit(m.value, d.unit) : m.value}</td>
                    <td className="py-2.5 pr-3 text-muted">{m.conditions || <span className="text-caution">No conditions recorded</span>}</td>
                    <td className="py-2.5 text-right">
                      <ConfirmButton
                        label="Delete"
                        confirmLabel="Confirm"
                        onConfirm={() => run((s) => void (s.measurements = s.measurements.filter((x) => x.id !== m.id)))}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </Panel>
  );
}

function ActionsPanel({ session, run }: { session: Session; run: Run }) {
  const [description, setDescription] = useState('');
  const [procedureId, setProcedureId] = useState('');
  const [softwareId, setSoftwareId] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const toolOptions = [...SOFTWARE.map((s) => ({ id: s.id, name: s.name })), ...PENDING_TOOLS.map((t) => ({ id: t.id, name: t.name }))];

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setErr('Describe what you did, for example “Disabled two updater entries in Autoruns”.');
      return;
    }
    setErr(null);
    await run((s) => {
      s.actions.push({ id: uid(), at: nowIso(), description: description.trim(), procedureId: procedureId || undefined, softwareId: softwareId || undefined });
      s.log.push(logEntry('action', `Work performed: ${description.trim()}`));
    });
    setDescription('');
  };

  return (
    <Panel title="Work performed" description="Every action taken on the machine. The report lists these in order.">
      {session.actions.length === 0 ? (
        <p className="mb-4 text-sm text-muted">No actions recorded yet.</p>
      ) : (
        <ol className="mb-5 divide-y divide-line">
          {session.actions.map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm text-ink">{a.description}</p>
                <p className="text-xs text-muted">
                  {formatDateTime(a.at)}
                  {a.softwareId && `, ${toolName(a.softwareId)}`}
                  {a.procedureId && `, ${PROCEDURES.find((p) => p.id === a.procedureId)?.title ?? a.procedureId}`}
                </p>
              </div>
              <ConfirmButton label="Remove" confirmLabel="Confirm" onConfirm={() => run((s) => void (s.actions = s.actions.filter((x) => x.id !== a.id)))} />
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={add} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2">
        <Field label="What you did" htmlFor="act-desc" error={err} className="sm:col-span-2">
          <Input id="act-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Procedure (optional)" htmlFor="act-proc">
          <Select id="act-proc" value={procedureId} onChange={(e) => setProcedureId(e.target.value)}>
            <option value="">None</option>
            {PROCEDURES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tool used (optional)" htmlFor="act-tool">
          <Select id="act-tool" value={softwareId} onChange={(e) => setSoftwareId(e.target.value)}>
            <option value="">None</option>
            {toolOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" variant="secondary">
            <Plus size={15} aria-hidden /> Add action
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function SettingsPanel({ session, run }: { session: Session; run: Run }) {
  const [draft, setDraft] = useState({ setting: '', before: '', after: '', reversal: '' });
  const [err, setErr] = useState<string | null>(null);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.setting.trim() || !draft.after.trim()) {
      setErr('Name the setting and the value you set it to.');
      return;
    }
    setErr(null);
    await run((s) => {
      s.settingsChanged.push({ id: uid(), at: nowIso(), setting: draft.setting.trim(), before: draft.before.trim(), after: draft.after.trim(), reversal: draft.reversal.trim() });
      s.log.push(logEntry('action', `Setting changed: ${draft.setting.trim()} → ${draft.after.trim()}`));
    });
    setDraft({ setting: '', before: '', after: '', reversal: '' });
  };

  return (
    <Panel title="Settings changed" description="Record the original value and how to revert it. The report uses this list.">
      {session.settingsChanged.length === 0 ? (
        <p className="mb-4 text-sm text-muted">No settings changed in this session.</p>
      ) : (
        <ul className="mb-5 divide-y divide-line">
          {session.settingsChanged.map((c) => (
            <li key={c.id} className="flex items-start gap-3 py-2.5">
              <div className="min-w-0 flex-1 text-sm">
                <p className="text-ink">{c.setting}</p>
                <p className="text-muted">
                  {c.before ? `${c.before} → ` : ''}
                  {c.after}
                </p>
                {c.reversal && <p className="text-xs text-muted">Revert: {c.reversal}</p>}
              </div>
              <ConfirmButton label="Remove" confirmLabel="Confirm" onConfirm={() => run((s) => void (s.settingsChanged = s.settingsChanged.filter((x) => x.id !== c.id)))} />
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Setting" htmlFor="set-name" error={err}>
          <Input id="set-name" value={draft.setting} onChange={(e) => setDraft({ ...draft, setting: e.target.value })} placeholder="Autoruns: Updater entry" />
        </Field>
        <Field label="Was" htmlFor="set-before">
          <Input id="set-before" value={draft.before} onChange={(e) => setDraft({ ...draft, before: e.target.value })} placeholder="Enabled" />
        </Field>
        <Field label="Now" htmlFor="set-after">
          <Input id="set-after" value={draft.after} onChange={(e) => setDraft({ ...draft, after: e.target.value })} placeholder="Disabled" />
        </Field>
        <Field label="How to revert" htmlFor="set-rev">
          <Input id="set-rev" value={draft.reversal} onChange={(e) => setDraft({ ...draft, reversal: e.target.value })} placeholder="Tick the checkbox" />
        </Field>
        <div className="sm:col-span-2 lg:col-span-4">
          <Button type="submit" variant="secondary">
            <Plus size={15} aria-hidden /> Add setting change
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function ProcedureProgressPanel({ session }: { session: Session }) {
  return (
    <Panel title="Procedures" description="Checked steps are saved to the session that is active when you work through a procedure.">
      <ul className="divide-y divide-line">
        {PROCEDURES.map((p) => {
          const total = p.preparation.length + p.steps.length;
          const done = (session.procedureProgress[p.id] ?? []).length;
          return (
            <li key={p.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4">
              <Link to={`/procedures/${p.id}`} className="min-w-0 flex-1 text-sm font-medium text-ink hover:text-accent">
                {p.title}
              </Link>
              <div className="sm:w-72">
                <ProgressBar value={done} max={total} label={`${p.title} progress`} />
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function VerificationPanel({ session, run }: { session: Session; run: Run }) {
  const [check, setCheck] = useState('');
  const [result, setResult] = useState<VerificationResult>('not-tested');
  const [detail, setDetail] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const labels: Record<VerificationResult, string> = { passed: 'Passed', failed: 'Failed', 'not-tested': 'Not tested' };
  const tone = { passed: 'ok', failed: 'concern', 'not-tested': 'neutral' } as const;

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!check.trim()) {
      setErr('Name what was checked, for example “Sign-in time under 60 s”.');
      return;
    }
    setErr(null);
    await run((s) => {
      s.verifications.push({ id: uid(), at: nowIso(), check: check.trim(), result, detail: detail.trim() });
      s.log.push(logEntry('verification', `Verification (${labels[result]}): ${check.trim()}`));
    });
    setCheck('');
    setDetail('');
  };

  return (
    <Panel title="Verification" description="Confirm each fix under comparable conditions. A change that was not checked is listed as not tested.">
      {session.verifications.length === 0 ? (
        <p className="mb-4 text-sm text-muted">Nothing verified yet.</p>
      ) : (
        <ul className="mb-5 divide-y divide-line">
          {session.verifications.map((v) => (
            <li key={v.id} className="flex items-start gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={tone[v.result]}>{labels[v.result]}</Badge>
                  <span className="text-sm text-ink">{v.check}</span>
                </div>
                {v.detail && <p className="mt-1 text-sm text-muted">{v.detail}</p>}
              </div>
              <ConfirmButton label="Remove" confirmLabel="Confirm" onConfirm={() => run((s) => void (s.verifications = s.verifications.filter((x) => x.id !== v.id)))} />
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1.4fr_0.8fr_1fr_auto] sm:items-end">
        <Field label="Check" htmlFor="ver-check" error={err}>
          <Input id="ver-check" value={check} onChange={(e) => setCheck(e.target.value)} />
        </Field>
        <Field label="Result" htmlFor="ver-result">
          <Select id="ver-result" value={result} onChange={(e) => setResult(e.target.value as VerificationResult)}>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
            <option value="not-tested">Not tested</option>
          </Select>
        </Field>
        <Field label="Detail" htmlFor="ver-detail">
          <Input id="ver-detail" value={detail} onChange={(e) => setDetail(e.target.value)} />
        </Field>
        <Button type="submit" variant="secondary">
          <Target size={15} aria-hidden /> Add check
        </Button>
      </form>
    </Panel>
  );
}

function ConcernsPanel({ session, run }: { session: Session; run: Run }) {
  const [concerns, setConcerns] = useState(session.remainingConcerns);
  const [maintenance, setMaintenance] = useState(session.maintenance);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    await run((s) => {
      s.remainingConcerns = concerns.trim();
      s.maintenance = maintenance.trim();
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  return (
    <Panel
      title="Remaining concerns and maintenance"
      description="What is still open, and what the customer should do to keep the machine in good shape."
      actions={
        <Button variant="primary" size="sm" onClick={save}>
          {saved ? 'Saved' : 'Save'}
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Remaining concerns" htmlFor="concerns" hint="Anything not resolved, and what would resolve it.">
          <Textarea id="concerns" rows={4} value={concerns} onChange={(e) => setConcerns(e.target.value)} />
        </Field>
        <Field label="Recommended maintenance" htmlFor="maint" hint="For example, a drive check in six months, or a backup schedule.">
          <Textarea id="maint" rows={4} value={maintenance} onChange={(e) => setMaintenance(e.target.value)} />
        </Field>
      </div>
    </Panel>
  );
}

function NotesPanel({ session, run }: { session: Session; run: Run }) {
  const [notes, setNotes] = useState(session.notes);
  const [line, setLine] = useState('');
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await run((s) => {
      s.notes = notes;
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const addLine = async (e: FormEvent) => {
    e.preventDefault();
    if (!line.trim()) return;
    await run((s) => {
      s.log.push(logEntry('note', line.trim()));
    });
    setLine('');
  };

  const log = [...session.log].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 60);
  const kindLabel: Record<string, string> = { system: 'System', diagnosis: 'Diagnosis', action: 'Action', verification: 'Verification', note: 'Note' };

  return (
    <Panel title="Notes and activity" description="Free notes for this case, and a timeline of what happened in it.">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Field label="Notes" htmlFor="notes" hint="Do not paste passwords, tokens, or personal files here.">
            <Textarea id="notes" rows={8} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div>
            <Button variant="secondary" size="sm" onClick={save}>
              {saved ? 'Saved' : 'Save notes'}
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <form onSubmit={addLine} className="flex gap-2">
            <Field label="Add a timeline note" htmlFor="log-line" className="flex-1">
              <Input id="log-line" value={line} onChange={(e) => setLine(e.target.value)} placeholder="Customer called back about the fan noise" />
            </Field>
            <div className="flex items-end">
              <Button type="submit" variant="secondary">
                Add
              </Button>
            </div>
          </form>
          <ol className="max-h-80 divide-y divide-line overflow-y-auto rounded-control border border-line">
            {log.map((l) => (
              <li key={l.id} className="px-3 py-2">
                <p className="text-xs text-muted">
                  {kindLabel[l.kind] ?? l.kind}, {formatDateTime(l.at)}
                </p>
                <p className="text-sm text-ink">{l.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Panel>
  );
}
