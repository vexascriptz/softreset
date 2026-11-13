import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Pause, Play, CheckCircle2 } from 'lucide-react';
import { Button, EmptyState, PageHeader, Panel, SegmentedControl } from '../components/ui';
import { StatusBadge } from '../components/SessionBanner';
import { useCollection } from '../lib/hooks';
import { useActiveSession } from '../lib/activeSession';
import { setSessionStatus } from '../lib/sessions';
import type { Customer, Session } from '../lib/types';
import { SERVICE_BY_ID } from '../data/services';
import { formatDateTime } from '../lib/utils';

type Filter = 'active' | 'completed' | 'all';

export default function ActiveSessions() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('active');
  const { items: sessions, ready } = useCollection<Session>('sessions');
  const { items: customers } = useCollection<Customer>('customers');
  const { activeId, setActiveId } = useActiveSession();

  const visible = sessions
    .filter((s) => (filter === 'all' ? true : filter === 'active' ? s.status !== 'completed' : s.status === 'completed'))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const nameOf = (id: string) => customers.find((c) => c.id === id)?.name ?? 'Unknown customer';

  const open = (s: Session) => {
    setActiveId(s.id);
    navigate(`/sessions/${s.id}`);
  };

  return (
    <>
      <PageHeader
        title="Active sessions"
        description="Pause a case to set it aside, and resume it later. Pausing keeps its findings, measurements, and progress."
        actions={
          <Button variant="primary" onClick={() => navigate('/sessions/new')}>
            New session
          </Button>
        }
      />
      <div className="mb-5">
        <SegmentedControl<Filter>
          label="Filter sessions"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'active', label: 'Open and paused' },
            { value: 'completed', label: 'Completed' },
            { value: 'all', label: 'All' },
          ]}
        />
      </div>

      {ready && visible.length === 0 && (
        <EmptyState title={filter === 'completed' ? 'No completed sessions yet' : 'No sessions here yet'} action={<Button variant="primary" onClick={() => navigate('/sessions/new')}>Start a session</Button>}>
          A session holds one customer’s case. Each one records findings, measurements, actions, and verification.
        </EmptyState>
      )}

      {visible.length > 0 && (
        <Panel bodyClassName="-my-2">
          <ul className="divide-y divide-line">
            {visible.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <Link to={`/sessions/${s.id}`} className="block truncate font-medium text-ink hover:text-accent">
                    {nameOf(s.customerId)}
                  </Link>
                  <p className="truncate text-sm text-muted">
                    {SERVICE_BY_ID[s.serviceId]?.label ?? 'Session'}, updated {formatDateTime(s.updatedAt)}
                    {s.id === activeId && ', saving here'}
                  </p>
                </div>
                <StatusBadge status={s.status} />
                <div className="flex flex-wrap gap-2">
                  {s.status !== 'completed' && (
                    <Button size="sm" onClick={() => open(s)}>
                      Open
                    </Button>
                  )}
                  {s.status === 'open' && (
                    <Button size="sm" variant="ghost" onClick={() => setSessionStatus(s.id, 'paused')} aria-label={`Pause ${nameOf(s.customerId)}`}>
                      <Pause size={14} aria-hidden /> Pause
                    </Button>
                  )}
                  {s.status === 'paused' && (
                    <Button size="sm" variant="ghost" onClick={() => setSessionStatus(s.id, 'open')} aria-label={`Resume ${nameOf(s.customerId)}`}>
                      <Play size={14} aria-hidden /> Resume
                    </Button>
                  )}
                  {s.status !== 'completed' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await setSessionStatus(s.id, 'completed');
                        if (s.id === activeId) setActiveId(null);
                      }}
                    >
                      <CheckCircle2 size={14} aria-hidden /> Complete
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}
