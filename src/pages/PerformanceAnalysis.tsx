import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, EmptyState, Field, PageHeader, Panel, Select } from '../components/ui';
import { useActiveSession } from '../lib/activeSession';
import { useCollection } from '../lib/hooks';
import { compareMeasurements, type Comparison, type ComparisonStatus } from '../lib/metrics';
import type { Customer, Session } from '../lib/types';
import { formatDate, formatWithUnit } from '../lib/utils';

const STATUS: Record<ComparisonStatus, { tone: 'ok' | 'caution' | 'neutral'; label: string }> = {
  measured: { tone: 'ok', label: 'Measured' },
  'not-comparable': { tone: 'caution', label: 'Indicative only' },
  'waiting-before': { tone: 'neutral', label: 'Needs a before reading' },
  'waiting-after': { tone: 'neutral', label: 'Needs an after reading' },
  none: { tone: 'neutral', label: 'Not measured' },
};

const DESCRIPTION =
  'A change counts as measured only when the before and after readings were taken under the same conditions. Anything else is shown as indicative, waiting for a reading, or assumed.';

function signed(value: number, unit: string): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${formatWithUnit(Math.abs(value), unit)}`;
}

export default function PerformanceAnalysis() {
  const { activeId } = useActiveSession();
  const { items: sessions, ready } = useCollection<Session>('sessions');
  const { items: customers } = useCollection<Customer>('customers');
  const [picked, setPicked] = useState<string | null>(null);

  const ordered = useMemo(() => [...sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [sessions]);
  const selectedId = picked ?? activeId ?? ordered[0]?.id ?? null;
  const session = ordered.find((s) => s.id === selectedId);
  const comparisons = useMemo(() => (session ? compareMeasurements(session.measurements) : []), [session]);

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? 'Unknown customer';
  const measured = comparisons.filter((c) => c.status === 'measured');
  const indicative = comparisons.filter((c) => c.status === 'not-comparable');
  const waiting = comparisons.filter((c) => c.status === 'waiting-before' || c.status === 'waiting-after');
  const storage = comparisons.find((c) => c.metric.key === 'free-space-gb');

  if (ready && ordered.length === 0) {
    return (
      <>
        <PageHeader title="Performance analysis" description={DESCRIPTION} />
        <EmptyState
          title="No sessions to analyze"
          action={
            <Link to="/sessions/new" className="text-sm font-medium text-accent hover:underline">
              Start a session
            </Link>
          }
        >
          Before and after results come from measurements recorded in a session. Start a session and take a before reading first.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Performance analysis" description={DESCRIPTION} />

      <div className="mb-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Panel title="Session">
          <Field label="Session" htmlFor="perf-session">
            <Select id="perf-session" value={selectedId ?? ''} onChange={(e) => setPicked(e.target.value)}>
              {ordered.map((s) => (
                <option key={s.id} value={s.id}>
                  {customerName(s.customerId)}, opened {formatDate(s.openedAt)}
                </option>
              ))}
            </Select>
          </Field>
          {session && <p className="mt-3 text-sm text-muted">Reported issue: {session.reportedIssue || 'Not recorded'}</p>}
        </Panel>
        <Panel title="Storage recovered" description="Measured as the change in free space on the drive.">
          <StorageSummary comparison={storage} />
        </Panel>
      </div>

      {!session ? (
        <p className="text-sm text-muted">Choose a session to see its results.</p>
      ) : (
        <div className="grid gap-5">
          <Panel title="Measured" description="Taken under the same conditions before and after. These changes can be stated.">
            {measured.length === 0 ? (
              <p className="text-sm text-muted">No measured change yet. Record a before and an after reading for the same metric, under the same conditions.</p>
            ) : (
              <CardGrid items={measured} />
            )}
          </Panel>

          <Panel title="Indicative only" description="The conditions differ, so the change may not come from the work. Do not state it as a result.">
            {indicative.length === 0 ? (
              <p className="text-sm text-muted">Nothing is indicative only.</p>
            ) : (
              <CardGrid items={indicative} />
            )}
          </Panel>

          <Panel title="Waiting for a reading" description="A before or after value is still missing.">
            {waiting.length === 0 ? (
              <p className="text-sm text-muted">No readings are missing.</p>
            ) : (
              <CardGrid items={waiting} />
            )}
          </Panel>

          <Panel title="Assumed" description="Changes made without a measurement that confirms them. Their effect is an expectation until a reading shows it.">
            {session.settingsChanged.length === 0 ? (
              <p className="text-sm text-muted">No settings were changed in this session.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-line">
                {session.settingsChanged.map((s) => (
                  <li key={s.id} className="py-3 text-sm">
                    <p className="text-ink">
                      {s.setting}, changed from {s.before || 'not recorded'} to {s.after || 'not recorded'}.
                    </p>
                    <p className="mt-1 text-muted">Effect not measured. Reversal: {s.reversal || 'not recorded'}.</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}

function StorageSummary({ comparison }: { comparison?: Comparison }) {
  if (!comparison) return <p className="text-sm text-muted">No free-space readings recorded.</p>;
  if (comparison.status === 'measured' && comparison.delta !== undefined) {
    const gained = comparison.delta >= 0;
    return (
      <p className="text-sm text-ink">
        Free space {gained ? 'rose' : 'fell'} by {formatWithUnit(Math.abs(comparison.delta), comparison.metric.unit)} under the same conditions. This counts only
        free space on the drive.
      </p>
    );
  }
  return <p className="text-sm text-muted">{comparison.reason}</p>;
}

function CardGrid({ items }: { items: Comparison[] }) {
  return <div className="grid gap-4 md:grid-cols-2">{items.map((c) => <ComparisonCard key={c.metric.key} c={c} />)}</div>;
}

function ComparisonCard({ c }: { c: Comparison }) {
  const unit = c.metric.unit;
  const status = STATUS[c.status];
  const better = c.improved === undefined ? '' : c.improved ? 'better' : 'worse';
  return (
    <article className="flex flex-col gap-3 rounded-control border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-medium text-ink">{c.metric.label}</h3>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-muted">Before</dt>
          <dd className="tabular-nums text-ink">{c.before ? formatWithUnit(c.before.value, unit) : 'Not recorded'}</dd>
        </div>
        <div>
          <dt className="text-muted">After</dt>
          <dd className="tabular-nums text-ink">{c.after ? formatWithUnit(c.after.value, unit) : 'Not recorded'}</dd>
        </div>
      </dl>
      {c.delta !== undefined && (
        <p className="text-sm tabular-nums text-ink">
          Change {signed(c.delta, unit)}
          {c.pct != null && <span className="text-muted"> ({signed(c.pct, '%')})</span>}
          {better && <span className="text-muted">, {better}</span>}
        </p>
      )}
      <ChangeChart c={c} />
      <p className="text-xs text-muted">{c.reason}</p>
      {c.before && c.after && (
        <p className="text-xs text-muted">
          Before: {c.before.conditions || 'conditions not recorded'}. After: {c.after.conditions || 'conditions not recorded'}.
        </p>
      )}
    </article>
  );
}

function ChangeChart({ c }: { c: Comparison }) {
  if (!c.before || !c.after) return null;
  const unit = c.metric.unit;
  const data = [
    { name: 'Before', value: c.before.value },
    { name: 'After', value: c.after.value },
  ];
  const label = `${c.metric.label}: before ${formatWithUnit(c.before.value, unit)}, after ${formatWithUnit(c.after.value, unit)}`;
  return (
    <div role="img" aria-label={label} className="h-32 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#5b6c80', fontSize: 12 }} />
          <YAxis hide domain={[0, 'auto']} />
          <Tooltip cursor={{ fill: 'transparent' }} formatter={(v) => formatWithUnit(Number(v), unit)} />
          <Bar dataKey="value" barSize={40} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            <Cell fill="#9aabbd" />
            <Cell fill="#6ba7da" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
