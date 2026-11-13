import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState, PageHeader, Panel, SegmentedControl } from '../components/ui';
import { StatusBadge } from '../components/SessionBanner';
import { useCollection } from '../lib/hooks';
import type { Customer, Session } from '../lib/types';
import { formatDate } from '../lib/utils';

type Filter = 'completed' | 'all';

export default function Reports() {
  const { items: sessions, ready } = useCollection<Session>('sessions');
  const { items: customers } = useCollection<Customer>('customers');
  const [filter, setFilter] = useState<Filter>('completed');

  const list = useMemo(
    () =>
      sessions
        .filter((s) => filter === 'all' || s.status === 'completed')
        .sort((a, b) => (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt)),
    [sessions, filter],
  );

  return (
    <>
      <PageHeader
        title="Reports"
        description="A customer report is built from a session’s findings, work, and measurements. Open one to review it, then print it or save it as a PDF from the browser."
        actions={
          <SegmentedControl<Filter>
            label="Show sessions"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'completed', label: 'Completed' },
              { value: 'all', label: 'All sessions' },
            ]}
          />
        }
      />

      {ready && list.length === 0 ? (
        <EmptyState
          title={filter === 'completed' ? 'No completed sessions yet' : 'No sessions yet'}
          action={
            <Link to="/sessions" className="text-sm font-medium text-accent hover:underline">
              Go to sessions
            </Link>
          }
        >
          {filter === 'completed'
            ? 'A report is created from a finished session. Mark a session completed, or switch to All sessions to preview one still in progress.'
            : 'Start a session to record work for a customer.'}
        </EmptyState>
      ) : (
        <Panel bodyClassName="-my-2">
          <ul className="divide-y divide-line">
            {list.map((s) => {
              const customer = customers.find((c) => c.id === s.customerId);
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <div className="min-w-0">
                    <Link to={`/reports/${s.id}`} className="font-medium text-ink hover:text-accent">
                      {customer?.name ?? 'Unknown customer'}
                    </Link>
                    <p className="mt-0.5 max-w-[68ch] truncate text-sm text-muted">{s.reportedIssue || 'No reported issue recorded'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.status} />
                    <span className="text-sm tabular-nums text-muted">{formatDate(s.completedAt ?? s.updatedAt)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
    </>
  );
}
