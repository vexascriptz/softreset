import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, buttonStyles, Button, EmptyState, PageHeader } from '../components/ui';
import { PROCEDURE_BY_ID } from '../data/procedures';
import { SERVICE_BY_ID } from '../data/services';
import { toolName } from '../data/software';
import { useRecord } from '../lib/hooks';
import { compareMeasurements, type Comparison } from '../lib/metrics';
import type { Customer, Session } from '../lib/types';
import { formatDate, formatDateTime, formatWithUnit } from '../lib/utils';

const LEVEL_TONE = { info: 'neutral', notice: 'caution', concern: 'concern' } as const;
const LEVEL_LABEL = { info: 'Information', notice: 'Notice', concern: 'Concern' } as const;
const RESULT_TONE = { passed: 'ok', failed: 'concern', 'not-tested': 'neutral' } as const;
const RESULT_LABEL = { passed: 'Passed', failed: 'Failed', 'not-tested': 'Not tested' } as const;

function unique(values: (string | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))];
}

function customerSummary(session: Session, customer: Customer | undefined, comparisons: Comparison[]): string {
  const measuredLines = comparisons.flatMap((c) => {
    if (c.status !== 'measured' || !c.before || !c.after) return [];
    return [
      `${c.metric.label}: ${formatWithUnit(c.before.value, c.metric.unit)} before, ${formatWithUnit(c.after.value, c.metric.unit)} after, measured under the same conditions.`,
    ];
  });
  const lines = [
    `Service summary for ${customer?.name ?? 'the customer'}`,
    session.reportedIssue ? `Reported issue: ${session.reportedIssue}` : '',
    `Work recorded: ${session.actions.length} ${session.actions.length === 1 ? 'action' : 'actions'}.`,
    ...measuredLines,
    measuredLines.length === 0 ? 'No change was measured under the same conditions, so no improvement is claimed.' : '',
    session.remainingConcerns ? `Remaining concerns: ${session.remainingConcerns}` : '',
  ];
  return lines.filter(Boolean).join('\n');
}

export default function Report() {
  const { sessionId = '' } = useParams();
  const { item: session, ready } = useRecord<Session>('sessions', sessionId);
  const { item: customer } = useRecord<Customer>('customers', session?.customerId);
  const [copied, setCopied] = useState(false);
  const comparisons = useMemo(() => (session ? compareMeasurements(session.measurements) : []), [session]);

  if (!ready) return null;

  if (!session) {
    return (
      <EmptyState
        title="No report for this session"
        action={
          <Link to="/reports" className="text-sm font-medium text-accent hover:underline">
            Back to reports
          </Link>
        }
      >
        The session may have been deleted in another tab.
      </EmptyState>
    );
  }

  const service = SERVICE_BY_ID[session.serviceId]?.label ?? 'Service not recorded';
  const apps = unique(session.actions.map((a) => a.softwareId)).map((id) => toolName(id));
  const procedures = unique(session.actions.map((a) => a.procedureId)).map((id) => PROCEDURE_BY_ID[id]?.title ?? id);
  const compared = comparisons.filter((c) => c.before || c.after);
  const statusNote = session.status === 'completed' ? `Completed ${formatDate(session.completedAt)}` : 'Not completed. This is a preview.';

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(customerSummary(session, customer, comparisons));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Service report"
          description="Review the report, then print it or save it as a PDF from the browser. Only changes measured under the same conditions are described as measured."
          actions={
            <>
              <Link to="/reports" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>
                Back to reports
              </Link>
              <Button variant="secondary" size="sm" onClick={copySummary}>
                {copied ? 'Copied' : 'Copy customer summary'}
              </Button>
              <Button variant="primary" size="sm" onClick={() => window.print()}>
                Print or save as PDF
              </Button>
            </>
          }
        />
      </div>

      <article className="print-flat rounded-panel border border-line bg-surface p-6 sm:p-8">
        <header className="mb-8 border-b border-line pb-5">
          <p className="text-sm text-muted">{statusNote}</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{customer?.name ?? 'Customer'}</h2>
          <p className="mt-1 text-sm text-muted">{service}</p>
        </header>

        <Section title="Customer">
          <Facts
            items={[
              ['Reference', customer?.reference],
              ['Contact', customer?.contact],
              ['Session opened', formatDateTime(session.openedAt)],
              ['Session completed', session.completedAt ? formatDateTime(session.completedAt) : undefined],
            ]}
          />
        </Section>

        <Section title="Computer">
          <Facts
            items={[
              ['Device', session.hardware.device],
              ['Processor', session.hardware.cpu],
              ['Graphics', session.hardware.gpu],
              ['Memory', session.hardware.ram],
              ['Storage', session.hardware.storage],
              ['Display refresh rate', session.hardware.displayHz],
              ['Windows version', session.windowsVersion],
            ]}
          />
        </Section>

        <Section title="Reported issue">
          <Paragraph text={session.reportedIssue} />
        </Section>

        <Section title="Initial condition">
          <Paragraph text={session.initialCondition} />
        </Section>

        <Section title="Findings">
          {session.findings.length === 0 ? (
            <None>No findings recorded.</None>
          ) : (
            <ul className="flex flex-col gap-3">
              {session.findings.map((f) => (
                <li key={f.id} className="text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={LEVEL_TONE[f.level]}>{LEVEL_LABEL[f.level]}</Badge>
                    <span className="text-muted">{f.source}</span>
                  </div>
                  <p className="mt-1 text-ink">{f.text}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Work performed">
          {session.actions.length === 0 ? (
            <None>No work recorded.</None>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {session.actions.map((a) => (
                <li key={a.id} className="text-ink">
                  <span className="tabular-nums text-muted">{formatDateTime(a.at)}. </span>
                  {a.description}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Applications and procedures used">
          {apps.length === 0 && procedures.length === 0 ? (
            <None>None recorded.</None>
          ) : (
            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-medium text-ink">Applications</p>
                <p className="mt-1 text-muted">{apps.length ? apps.join(', ') : 'None recorded'}</p>
              </div>
              <div>
                <p className="font-medium text-ink">Procedures</p>
                <p className="mt-1 text-muted">{procedures.length ? procedures.join(', ') : 'None recorded'}</p>
              </div>
            </div>
          )}
        </Section>

        <Section title="Settings changed">
          {session.settingsChanged.length === 0 ? (
            <None>No settings were changed.</None>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-left text-sm">
                <thead>
                  <tr className="text-muted">
                    <th scope="col" className="pb-2 pr-4 font-medium">
                      Setting
                    </th>
                    <th scope="col" className="pb-2 pr-4 font-medium">
                      Before
                    </th>
                    <th scope="col" className="pb-2 pr-4 font-medium">
                      After
                    </th>
                    <th scope="col" className="pb-2 font-medium">
                      Reversal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {session.settingsChanged.map((s) => (
                    <tr key={s.id} className="border-t border-line align-top">
                      <th scope="row" className="py-2.5 pr-4 font-medium text-ink">
                        {s.setting}
                      </th>
                      <td className="py-2.5 pr-4 text-ink">{s.before || 'Not recorded'}</td>
                      <td className="py-2.5 pr-4 text-ink">{s.after || 'Not recorded'}</td>
                      <td className="py-2.5 text-muted">{s.reversal || 'Not recorded'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Before and after">
          {compared.length === 0 ? (
            <None>No readings recorded.</None>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="text-muted">
                      <th scope="col" className="pb-2 pr-4 font-medium">
                        Measure
                      </th>
                      <th scope="col" className="pb-2 pr-4 font-medium">
                        Before
                      </th>
                      <th scope="col" className="pb-2 pr-4 font-medium">
                        After
                      </th>
                      <th scope="col" className="pb-2 pr-4 font-medium">
                        Change
                      </th>
                      <th scope="col" className="pb-2 font-medium">
                        Basis
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {compared.map((c) => (
                      <tr key={c.metric.key} className="border-t border-line align-top">
                        <th scope="row" className="py-2.5 pr-4 font-medium text-ink">
                          {c.metric.label}
                        </th>
                        <td className="py-2.5 pr-4 tabular-nums text-ink">{c.before ? formatWithUnit(c.before.value, c.metric.unit) : 'Not recorded'}</td>
                        <td className="py-2.5 pr-4 tabular-nums text-ink">{c.after ? formatWithUnit(c.after.value, c.metric.unit) : 'Not recorded'}</td>
                        <td className="py-2.5 pr-4 tabular-nums text-ink">{c.delta !== undefined ? formatWithUnit(c.delta, c.metric.unit) : '—'}</td>
                        <td className="py-2.5 text-muted">{basisText(c)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-xs text-muted">Changes are described as measured only when both readings were taken under the same conditions.</p>
            </>
          )}
        </Section>

        <Section title="Verified outcomes">
          {session.verifications.length === 0 ? (
            <None>No checks recorded.</None>
          ) : (
            <ul className="flex flex-col gap-3 text-sm">
              {session.verifications.map((v) => (
                <li key={v.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={RESULT_TONE[v.result]}>{RESULT_LABEL[v.result]}</Badge>
                    <span className="text-ink">{v.check}</span>
                  </div>
                  {v.detail && <p className="mt-1 text-muted">{v.detail}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Remaining concerns">
          <Paragraph text={session.remainingConcerns} empty="None recorded." />
        </Section>

        <Section title="Maintenance">
          <Paragraph text={session.maintenance} empty="None recorded." />
        </Section>

        <p className="border-t border-line pt-4 text-xs text-muted">
          Prepared with softreset from the session record. Items that were not measured are not reported as improvements.
        </p>
      </article>
    </>
  );
}

function basisText(c: Comparison): string {
  switch (c.status) {
    case 'measured':
      return 'Same conditions';
    case 'not-comparable':
      return 'Different conditions, indicative only';
    case 'waiting-before':
      return 'Missing the before reading';
    case 'waiting-after':
      return 'Missing the after reading';
    default:
      return 'Not measured';
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h3 className="mb-3 text-base font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

function Facts({ items }: { items: [string, string | undefined][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted">{label}</dt>
          <dd className="mt-0.5 text-ink">{value?.trim() ? value : 'Not recorded'}</dd>
        </div>
      ))}
    </dl>
  );
}

function Paragraph({ text, empty = 'Not recorded.' }: { text: string; empty?: string }) {
  return text.trim() ? <p className="max-w-[68ch] whitespace-pre-line text-sm text-ink">{text}</p> : <None>{empty}</None>;
}

function None({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted">{children}</p>;
}
