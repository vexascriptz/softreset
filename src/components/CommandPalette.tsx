import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useCollection } from '../lib/hooks';
import type { Customer } from '../lib/types';
import { PROBLEMS } from '../data/problems';
import { SOFTWARE, PENDING_TOOLS } from '../data/software';
import { PROCEDURES } from '../data/procedures';
import { WINDOWS_SETTINGS } from '../data/windowsSettings';
import { cn } from '../lib/utils';
import { Kbd } from './ui';

interface Result {
  key: string;
  group: 'Pages' | 'Diagnose' | 'Tools' | 'Procedures' | 'Windows settings' | 'Customers';
  title: string;
  detail?: string;
  href: string;
  haystack: string;
}

const PAGES: Result[] = [
  { key: 'p-dash', group: 'Pages', title: 'Dashboard', href: '/', detail: 'Start from the customer’s words', haystack: 'dashboard home start' },
  { key: 'p-new', group: 'Pages', title: 'New session', href: '/sessions/new', detail: 'Open a case for a customer', haystack: 'new session start case' },
  { key: 'p-active', group: 'Pages', title: 'Active sessions', href: '/sessions', detail: 'Open, paused, and completed cases', haystack: 'active sessions open paused' },
  { key: 'p-reports', group: 'Pages', title: 'Reports', href: '/reports', detail: 'Printable customer reports', haystack: 'reports print pdf' },
  { key: 'p-perf', group: 'Pages', title: 'Performance analysis', href: '/performance', detail: 'Before and after comparisons', haystack: 'performance analysis before after chart' },
  { key: 'p-settings', group: 'Pages', title: 'Windows settings', href: '/windows-settings', detail: 'Setting guides with context', haystack: 'windows settings storage sense startup power game mode virtual memory' },
  { key: 'p-data', group: 'Pages', title: 'Data management', href: '/data', detail: 'Export, import, and delete local data', haystack: 'data export import delete backup' },
];

function matches(haystack: string, query: string): boolean {
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { items: customers } = useCollection<Customer>('customers');

  const all = useMemo<Result[]>(() => {
    const diagnose: Result[] = PROBLEMS.filter((p) => p.workflowId).map((p) => ({
      key: `d-${p.id}`,
      group: 'Diagnose',
      title: p.title,
      detail: p.category,
      href: `/diagnose/${p.id}`,
      haystack: `${p.title} ${p.category} ${p.customerWords ?? ''} diagnose`.toLowerCase(),
    }));
    const tools: Result[] = [
      ...SOFTWARE.map((s) => ({ key: `t-${s.id}`, group: 'Tools' as const, title: s.name, detail: s.purpose, href: `/library/${s.id}`, haystack: `${s.name} ${s.purpose} ${s.category}`.toLowerCase() })),
      ...PENDING_TOOLS.map((t) => ({ key: `t-${t.id}`, group: 'Tools' as const, title: t.name, detail: 'Entry not written yet', href: `/library/${t.id}`, haystack: `${t.name} ${t.category}`.toLowerCase() })),
    ];
    const procedures: Result[] = PROCEDURES.map((p) => ({ key: `r-${p.id}`, group: 'Procedures', title: p.title, detail: p.purpose, href: `/procedures/${p.id}`, haystack: `${p.title} ${p.purpose}`.toLowerCase() }));
    const windows: Result[] = WINDOWS_SETTINGS.map((w) => ({ key: `w-${w.id}`, group: 'Windows settings', title: w.title, detail: w.purpose, href: '/windows-settings', haystack: `${w.title} ${w.purpose}`.toLowerCase() }));
    const people: Result[] = customers.map((c) => ({ key: `c-${c.id}`, group: 'Customers', title: c.name, detail: c.reference || undefined, href: `/customers/${c.id}`, haystack: `${c.name} ${c.reference} customer`.toLowerCase() }));
    return [...PAGES, ...diagnose, ...tools, ...procedures, ...windows, ...people];
  }, [customers]);

  const results = useMemo(() => {
    const q = query.trim();
    const hits = q ? all.filter((r) => matches(r.haystack, q)) : PAGES;
    return hits.slice(0, 40);
  }, [all, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => setActive(0), [query]);

  if (!open) return null;

  const choose = (r: Result) => {
    onClose();
    navigate(r.href);
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      choose(results[active]);
    }
  };

  let lastGroup = '';
  return (
    <div className="no-print fixed inset-0 z-50 flex items-start justify-center bg-ink/25 px-4 pt-[12vh]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Search softreset" className="w-full max-w-xl overflow-hidden rounded-panel border border-line bg-surface shadow-float">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search size={17} className="text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search tools, procedures, problems, customers"
            aria-label="Search"
            aria-controls="palette-results"
            aria-activedescendant={results[active] ? `palette-${results[active].key}` : undefined}
            className="h-12 flex-1 bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
          />
          <Kbd>Esc</Kbd>
        </div>
        <ul id="palette-results" role="listbox" className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Nothing matches “{query}”. Try a tool name, a problem, or a customer.</li>}
          {results.map((r, i) => {
            const header = r.group !== lastGroup ? r.group : null;
            lastGroup = r.group;
            return (
              <li key={r.key} role="presentation">
                {header && <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">{header}</p>}
                <button
                  id={`palette-${r.key}`}
                  role="option"
                  aria-selected={i === active}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(r)}
                  className={cn('flex w-full items-center gap-3 rounded-control px-3 py-2 text-left', i === active ? 'bg-brand-soft' : 'hover:bg-surface-2')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-ink">{r.title}</span>
                    {r.detail && <span className="block truncate text-xs text-muted">{r.detail}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
