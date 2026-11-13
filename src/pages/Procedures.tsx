import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Search, Star } from 'lucide-react';
import { Badge, Input, PageHeader, Panel } from '../components/ui';
import { PROCEDURES } from '../data/procedures';
import { toolName } from '../data/software';
import { useFavorites } from '../lib/hooks';

export default function Procedures() {
  const [query, setQuery] = useState('');
  const { has, toggle } = useFavorites();

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROCEDURES.filter((p) => !q || `${p.title} ${p.purpose} ${toolName(p.softwareId)}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <>
      <PageHeader
        title="Procedures"
        description="Step-by-step guides for working in a customer session. Each one lists preparation, exact steps, recommended settings, interpretation, verification, and how to roll back."
      />
      <div className="mb-5 max-w-sm">
        <label className="relative block">
          <span className="sr-only">Search procedures</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search procedures" className="pl-9" />
        </label>
      </div>
      <Panel bodyClassName="-my-2">
        {list.length === 0 && <p className="py-3 text-sm text-muted">No procedure matches “{query}”.</p>}
        <ul className="divide-y divide-line">
          {list.map((p) => (
            <li key={p.id} className="flex items-start gap-3 py-3.5">
              <div className="min-w-0 flex-1">
                <Link to={`/procedures/${p.id}`} className="font-medium text-ink hover:text-accent">
                  {p.title}
                </Link>
                <p className="mt-0.5 max-w-[68ch] text-sm text-muted">{p.purpose}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge tone="neutral">{toolName(p.softwareId)}</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Clock size={12} aria-hidden /> About {p.estimatedMinutes} min
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={has(p.id)}
                aria-label={has(p.id) ? `Remove ${p.title} from favorites` : `Add ${p.title} to favorites`}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-muted hover:bg-surface-2 hover:text-caution"
              >
                <Star size={16} fill={has(p.id) ? 'currentColor' : 'none'} className={has(p.id) ? 'text-caution' : ''} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
