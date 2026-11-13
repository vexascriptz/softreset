import { Link } from 'react-router-dom';
import { Panel, Select, Button, Badge } from './ui';
import { useActiveSession } from '../lib/activeSession';
import { useCollection } from '../lib/hooks';
import type { Customer, Session } from '../lib/types';
import { SERVICE_BY_ID } from '../data/services';
import { formatDateTime } from '../lib/utils';

/** Shows which session findings are being saved to, and lets the technician switch or stop. */
export function SessionBanner() {
  const { activeId, setActiveId, session, customer } = useActiveSession();
  const { items: sessions } = useCollection<Session>('sessions');
  const { items: customers } = useCollection<Customer>('customers');

  const choices = sessions
    .filter((s) => s.status !== 'completed')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const label = (s: Session) => {
    const name = customers.find((c) => c.id === s.customerId)?.name ?? 'Unknown customer';
    return `${name}: ${SERVICE_BY_ID[s.serviceId]?.label ?? 'Session'}, ${formatDateTime(s.openedAt)}`;
  };

  if (session) {
    return (
      <Panel bodyClassName="flex flex-wrap items-center gap-x-4 gap-y-3" className="border-brand">
        <p className="text-sm text-ink">
          Saving to <span className="font-semibold">{customer?.name ?? 'customer'}</span>
          <span className="text-muted">, {SERVICE_BY_ID[session.serviceId]?.label ?? 'Session'}</span>
        </p>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Link to={`/sessions/${session.id}`} className="text-sm font-medium text-accent hover:underline">
            Open session
          </Link>
          {choices.length > 1 && (
            <Select aria-label="Switch session" value={activeId ?? ''} onChange={(e) => setActiveId(e.target.value)} className="w-auto max-w-xs">
              {choices.map((s) => (
                <option key={s.id} value={s.id}>
                  {label(s)}
                </option>
              ))}
            </Select>
          )}
          <Button size="sm" variant="ghost" onClick={() => setActiveId(null)}>
            Stop saving here
          </Button>
        </div>
      </Panel>
    );
  }

  return (
    <Panel bodyClassName="flex flex-wrap items-center gap-3">
      <p className="text-sm text-muted">No session is open. Findings and measurements will stay on screen only.</p>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {choices.length > 0 && (
          <Select aria-label="Choose an open session" value="" onChange={(e) => e.target.value && setActiveId(e.target.value)} className="w-auto max-w-xs">
            <option value="">Choose an open session…</option>
            {choices.map((s) => (
              <option key={s.id} value={s.id}>
                {label(s)}
              </option>
            ))}
          </Select>
        )}
        <Link to="/sessions/new" className="inline-flex h-8 items-center rounded-control bg-brand px-3 text-[13px] font-medium text-on-brand hover:bg-brand-strong">
          New session
        </Link>
      </div>
    </Panel>
  );
}

export function StatusBadge({ status }: { status: Session['status'] }) {
  if (status === 'completed') return <Badge tone="neutral">Completed</Badge>;
  if (status === 'paused') return <Badge tone="caution">Paused</Badge>;
  return <Badge tone="ok">Open</Badge>;
}
