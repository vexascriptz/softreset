import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Badge, Button, EmptyState, ErrorBanner, PageHeader, Panel, ProgressBar } from '../components/ui';
import { PROCEDURE_BY_ID } from '../data/procedures';
import { toolName } from '../data/software';
import { useActiveSession } from '../lib/activeSession';
import { pushRecent } from '../lib/hooks';
import { logEntry, updateSession } from '../lib/sessions';
import { nowIso, uid } from '../lib/utils';

export default function ProcedureRunner() {
  const { procedureId = '' } = useParams();
  const procedure = PROCEDURE_BY_ID[procedureId];
  const { activeId, session, ready } = useActiveSession();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // Checks show the click at once. Saving to IndexedDB is asynchronous, so the stored value catches up behind them.
  const [local, setLocal] = useState<Record<string, boolean>>({});

  const title = procedure?.title ?? '';

  useEffect(() => {
    if (title) pushRecent({ kind: 'procedure', id: procedureId, title, href: `/procedures/${procedureId}` });
  }, [procedureId, title]);

  useEffect(() => {
    setLocal({});
  }, [procedureId]);

  if (!procedure) {
    return (
      <EmptyState
        title="No procedure with this name"
        action={
          <Link to="/procedures" className="text-sm font-medium text-accent hover:underline">
            Back to procedures
          </Link>
        }
      >
        The link may be out of date. Browse the list of procedures.
      </EmptyState>
    );
  }

  const p = procedure;
  const tool = toolName(p.softwareId);
  const prepKeys = p.preparation.map((_, i) => `prep-${i}`);
  const stepKeys = p.steps.map((_, i) => `step-${i}`);
  const allKeys = [...prepKeys, ...stepKeys];
  const saved = new Set(session?.procedureProgress[p.id] ?? []);
  const isChecked = (key: string) => (key in local ? local[key] : saved.has(key));
  const completed = allKeys.filter(isChecked).length;
  const canSave = Boolean(session && activeId);

  async function toggle(key: string) {
    if (!activeId) return;
    const next = !isChecked(key);
    setError('');
    setNotice('');
    setLocal((prev) => ({ ...prev, [key]: next }));
    try {
      await updateSession(activeId, (s) => {
        const checks = new Set(s.procedureProgress[p.id] ?? []);
        if (next) checks.add(key);
        else checks.delete(key);
        s.procedureProgress[p.id] = [...checks];
      });
    } catch (e) {
      setLocal((prev) => ({ ...prev, [key]: !next }));
      setError(e instanceof Error ? e.message : 'The check could not be saved.');
    }
  }

  async function clearChecks() {
    if (!activeId) return;
    setError('');
    try {
      await updateSession(activeId, (s) => {
        delete s.procedureProgress[p.id];
      });
      setLocal({});
      setNotice('Checks cleared for this session.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The checks could not be cleared.');
    }
  }

  async function logWork() {
    if (!activeId) return;
    setError('');
    const summary = `Ran procedure: ${p.title}. ${completed} of ${allKeys.length} items checked.`;
    try {
      await updateSession(activeId, (s) => {
        s.actions.push({ id: uid(), at: nowIso(), description: summary, procedureId: p.id, softwareId: p.softwareId });
        s.log.push(logEntry('action', summary));
      });
      setNotice('Logged to the session. It appears under Actions and in the timeline.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The work could not be logged.');
    }
  }

  return (
    <>
      <PageHeader title={p.title} description={p.purpose} actions={<Badge tone="brand">{tool}</Badge>} />

      <p className="-mt-3 mb-6 inline-flex items-center gap-1.5 text-sm text-muted">
        <Clock size={14} aria-hidden /> About {p.estimatedMinutes} minutes
      </p>

      {ready && !session && (
        <Panel title="No open session" className="mb-6">
          <p className="max-w-[68ch] text-sm text-muted">
            Checks and the work log are saved to the active session. Open or resume a session to record this procedure. You can still read it here.
          </p>
          <p className="mt-3 text-sm">
            <Link to="/sessions/new" className="font-medium text-accent hover:underline">
              Start a session
            </Link>
          </p>
        </Panel>
      )}

      {canSave && (
        <Panel className="mb-6" bodyClassName="flex flex-col gap-4">
          <ProgressBar value={completed} max={allKeys.length} label="Items checked" />
          {error && <ErrorBanner>{error}</ErrorBanner>}
          {notice && <p role="status" className="text-sm text-ink">{notice}</p>}
        </Panel>
      )}

      {!canSave && error && <div className="mb-6"><ErrorBanner>{error}</ErrorBanner></div>}

      <div className="grid gap-5">
        <Section title="When to use it">
          <BulletList items={p.whenToUse} />
        </Section>

        {p.safety.length > 0 && (
          <Section title="Safety" tone="concern">
            <BulletList items={p.safety} tone="concern" />
          </Section>
        )}

        <Section title="Preparation" description="Check each item before starting. Checks save to the active session.">
          <ul className="flex list-none flex-col gap-3">
            {p.preparation.map((text, i) => {
              const key = `prep-${i}`;
              return (
                <CheckItem
                  key={key}
                  id={`${p.id}-${key}`}
                  text={text}
                  checked={isChecked(key)}
                  disabled={!canSave}
                  onToggle={() => toggle(key)}
                />
              );
            })}
          </ul>
        </Section>

        <Section title="Steps" description="Work through these in order. Open the technical detail only when you need it.">
          <ol className="flex list-decimal flex-col gap-4 pl-5 marker:font-medium marker:text-muted">
            {p.steps.map((step, i) => {
              const key = `step-${i}`;
              return (
                <CheckItem
                  key={key}
                  id={`${p.id}-${key}`}
                  text={step.text}
                  detail={step.detail}
                  checked={isChecked(key)}
                  disabled={!canSave}
                  onToggle={() => toggle(key)}
                  asListItem
                />
              );
            })}
          </ol>
        </Section>

        <Section title="Recommended settings">
          {p.recommendedSettings.length === 0 ? (
            <p className="text-sm text-muted">No settings are recommended for this procedure.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                <thead>
                  <tr className="text-muted">
                    <th scope="col" className="pb-2 pr-4 font-medium">
                      Setting
                    </th>
                    <th scope="col" className="pb-2 pr-4 font-medium">
                      Value
                    </th>
                    <th scope="col" className="pb-2 font-medium">
                      When
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {p.recommendedSettings.map((r) => (
                    <tr key={r.setting} className="border-t border-line align-top">
                      <th scope="row" className="py-2.5 pr-4 font-medium text-ink">
                        {r.setting}
                      </th>
                      <td className="py-2.5 pr-4 text-ink">{r.value}</td>
                      <td className="py-2.5 text-muted">{r.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Expected result">
          <BulletList items={p.expected} />
        </Section>

        <Section title="Interpretation" description="What the result means. Compare it with the baseline before drawing a conclusion.">
          <BulletList items={p.interpretation} />
        </Section>

        <Section title="Next steps">
          <BulletList items={p.nextSteps} />
        </Section>

        <Section title="Verification">
          <BulletList items={p.verification} />
        </Section>

        <Section title="Rollback" description="How to undo the change if it did not help or caused a problem.">
          <BulletList items={p.rollback} />
        </Section>

        <Panel title="Record this work" description="Adds an entry to the session’s actions and timeline, with the number of items checked.">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={logWork} disabled={!canSave}>
              Log as work performed
            </Button>
            <Button variant="ghost" onClick={clearChecks} disabled={!canSave || completed === 0}>
              Clear checks
            </Button>
          </div>
          {!canSave && <p className="mt-3 text-sm text-muted">Open a session to enable recording.</p>}
        </Panel>
      </div>
    </>
  );
}

function Section({ title, description, children, tone }: { title: string; description?: string; children: ReactNode; tone?: 'concern' }) {
  return (
    <Panel title={title} description={description}>
      <div className={tone === 'concern' ? 'text-concern' : undefined}>{children}</div>
    </Panel>
  );
}

function BulletList({ items, tone }: { items: string[]; tone?: 'concern' }) {
  return (
    <ul className={`flex list-disc flex-col gap-2 pl-5 text-sm marker:text-muted ${tone === 'concern' ? 'text-concern' : 'text-ink'}`}>
      {items.map((s) => (
        <li key={s}>{s}</li>
      ))}
    </ul>
  );
}

function CheckItem({
  id,
  text,
  detail,
  checked,
  disabled,
  onToggle,
  asListItem = false,
}: {
  id: string;
  text: string;
  detail?: string;
  checked: boolean;
  disabled: boolean;
  onToggle: () => void;
  asListItem?: boolean;
}) {
  return (
    <li className={asListItem ? 'pl-1' : undefined}>
      <label htmlFor={id} className={`flex items-start gap-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onToggle}
          className="mt-1 size-4 shrink-0 accent-accent disabled:cursor-not-allowed"
        />
        <span className={`text-sm ${checked ? 'text-muted' : 'text-ink'}`}>{text}</span>
      </label>
      {detail && (
        <details className="ml-7 mt-2 text-sm text-muted">
          <summary className="w-fit cursor-pointer text-accent hover:underline">Technical detail</summary>
          <p className="mt-2 max-w-[68ch] text-ink">{detail}</p>
        </details>
      )}
    </li>
  );
}
