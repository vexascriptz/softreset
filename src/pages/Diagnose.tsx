import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Badge, Input, PageHeader, Panel } from '../components/ui';
import { SessionBanner } from '../components/SessionBanner';
import { PROBLEMS, PROBLEM_CATEGORIES } from '../data/problems';
import { getTree } from '../data/diagnostics';
import { pushRecent } from '../lib/hooks';

export default function Diagnose() {
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROBLEM_CATEGORIES.map((category) => ({
      category,
      items: PROBLEMS.filter((p) => p.category === category && (!q || `${p.title} ${p.customerWords ?? ''}`.toLowerCase().includes(q))),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  return (
    <>
      <PageHeader
        title="Diagnose"
        description="Choose the problem closest to what the customer describes. Each workflow asks about the symptoms, measures before it recommends anything, and says how sure it is."
      />
      <div className="mb-5">
        <SessionBanner />
      </div>
      <div className="mb-6 max-w-sm">
        <label className="relative block">
          <span className="sr-only">Filter problems</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter problems" className="pl-9" />
        </label>
      </div>

      <div className="flex flex-col gap-5">
        {groups.map((g) => (
          <Panel key={g.category} title={g.category} bodyClassName="-my-2">
            <ul className="divide-y divide-line">
              {g.items.map((p) => {
                const ready = Boolean(getTree(p.workflowId));
                const row = (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className={ready ? 'block text-sm font-medium text-ink' : 'block text-sm text-muted'}>{p.title}</span>
                      {p.customerWords && <span className="block text-xs text-muted">“{p.customerWords}”</span>}
                    </span>
                    {ready ? <Badge tone="ok">Workflow ready</Badge> : <Badge>Planned</Badge>}
                  </>
                );
                return (
                  <li key={p.id}>
                    {ready ? (
                      <Link
                        to={`/diagnose/${p.id}`}
                        onClick={() => pushRecent({ kind: 'problem', id: p.id, title: p.title, href: `/diagnose/${p.id}` })}
                        className="flex items-center gap-3 py-3 hover:text-accent"
                      >
                        {row}
                      </Link>
                    ) : (
                      <div aria-disabled="true" className="flex items-center gap-3 py-3 opacity-80">
                        {row}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        ))}
        {groups.length === 0 && <p className="text-sm text-muted">No problem matches “{query}”.</p>}
      </div>
    </>
  );
}
