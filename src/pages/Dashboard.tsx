import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Star, Plus, Activity, Clock } from 'lucide-react';
import { Button, EmptyState, Panel } from '../components/ui';
import { StatusBadge } from '../components/SessionBanner';
import { useActiveSession } from '../lib/activeSession';
import { useCollection, useFavorites, useRecent } from '../lib/hooks';
import type { Customer, Session } from '../lib/types';
import { PROBLEMS } from '../data/problems';
import { toolName } from '../data/software';
import { PROCEDURE_BY_ID } from '../data/procedures';
import { SERVICE_BY_ID } from '../data/services';
import { formatDateTime } from '../lib/utils';

const ENTRY_POINTS = PROBLEMS.filter((p) => p.customerWords && p.workflowId);

export default function Dashboard() {
  const navigate = useNavigate();
  const { session, customer } = useActiveSession();
  const { items: sessions } = useCollection<Session>('sessions');
  const { items: customers } = useCollection<Customer>('customers');
  const { ids: favIds, toggle } = useFavorites();
  const [recent] = useRecent();

  const openSessions = sessions
    .filter((s) => s.status !== 'completed')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 6);

  const customerName = (id: string) => customers.find((c) => c.id === id)?.name ?? 'Unknown customer';

  return (
    <div className="flex flex-col gap-10">
      <section className="flex flex-col gap-5">
        <div>
          <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-ink">What is the customer describing?</h1>
          <p className="mt-2 max-w-[60ch] text-sm text-muted">
            Start with their words. softreset opens the matching diagnostic workflow, which tells you which tools to use and what to measure.
          </p>
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {ENTRY_POINTS.map((p) => (
            <li key={p.id}>
              <Link to={`/diagnose/${p.id}`} className="group flex items-center gap-4 py-4 transition-colors hover:text-accent">
                <span className="min-w-0 flex-1">
                  <span className="block text-lg text-ink group-hover:text-accent">“{p.customerWords}”</span>
                  <span className="mt-0.5 block text-sm text-muted">Opens {p.title.toLowerCase()} diagnosis</span>
                </span>
                <ChevronRight size={18} className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">
          Other problems are listed in <Link to="/diagnose" className="text-accent hover:underline">Diagnose</Link>. Workflows for them are planned.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Active case" description={session ? 'Findings and measurements are being saved here.' : undefined}>
          {session && customer ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-ink">{customer.name}</p>
                <StatusBadge status={session.status} />
              </div>
              <p className="text-sm text-muted">{SERVICE_BY_ID[session.serviceId]?.label ?? 'Session'}</p>
              {session.reportedIssue && <p className="line-clamp-3 text-sm text-ink">{session.reportedIssue}</p>}
              <p className="text-xs text-muted">Last changed {formatDateTime(session.updatedAt)}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={() => navigate(`/sessions/${session.id}`)}>
                  Open session
                </Button>
                {session.workflow && !session.workflow.finished && (
                  <Button onClick={() => navigate(`/diagnose/${session.workflow!.problemId}`)}>Resume diagnosis</Button>
                )}
              </div>
            </div>
          ) : (
            <EmptyState
              icon={Activity}
              title="No case is open"
              action={
                <Button variant="primary" onClick={() => navigate('/sessions/new')}>
                  <Plus size={16} aria-hidden /> Start a session
                </Button>
              }
            >
              Open a session to save findings, measurements, and the customer report. Without one, diagnoses stay on screen only.
            </EmptyState>
          )}
        </Panel>

        <Panel title="Open cases" description="Sessions that are open or paused.">
          {openSessions.length === 0 ? (
            <p className="text-sm text-muted">No open cases. Completed sessions are listed under Reports.</p>
          ) : (
            <ul className="divide-y divide-line">
              {openSessions.map((s) => (
                <li key={s.id}>
                  <Link to={`/sessions/${s.id}`} className="flex items-center gap-3 py-2.5 hover:text-accent">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{customerName(s.customerId)}</span>
                      <span className="block truncate text-xs text-muted">{SERVICE_BY_ID[s.serviceId]?.label ?? 'Session'}</span>
                    </span>
                    <StatusBadge status={s.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Favorites" description="Tools and procedures you have starred.">
          {favIds.length === 0 ? (
            <p className="text-sm text-muted">Star a tool or procedure to pin it here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {favIds.map((id) => {
                const procedure = PROCEDURE_BY_ID[id];
                const href = procedure ? `/procedures/${id}` : `/library/${id}`;
                const label = procedure ? procedure.title : toolName(id);
                return (
                  <li key={id} className="flex items-center gap-2 py-2">
                    <Link to={href} className="min-w-0 flex-1 truncate text-sm text-ink hover:text-accent">
                      {label}
                    </Link>
                    <button
                      type="button"
                      aria-label={`Remove ${label} from favorites`}
                      onClick={() => toggle(id)}
                      className="flex h-8 w-8 items-center justify-center rounded-control text-caution hover:bg-surface-2"
                    >
                      <Star size={15} fill="currentColor" aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Recently used" description="The last eight tools and procedures you opened.">
          {recent.length === 0 ? (
            <p className="text-sm text-muted">Tools and procedures you open will appear here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.map((r) => (
                <li key={`${r.kind}-${r.id}`}>
                  <Link to={r.href} className="flex items-center gap-3 py-2.5 text-sm text-ink hover:text-accent">
                    <Clock size={14} className="shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{r.title}</span>
                    <span className="shrink-0 text-xs text-muted">{r.kind === 'procedure' ? 'Procedure' : r.kind === 'problem' ? 'Diagnosis' : 'Tool'}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
