import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Star } from 'lucide-react';
import { Badge, Field, Input, PageHeader, Panel, Select, SegmentedControl } from '../components/ui';
import { WORKFLOW_TOOL_PLANS } from '../data/problems';
import { SOFTWARE, PENDING_TOOLS, toolName, type SoftwareCategory, type SoftwareEntry } from '../data/software';
import { useFavorites } from '../lib/hooks';

type CategoryFilter = 'all' | SoftwareCategory;

const LICENSE_BADGE = {
  free: { tone: 'ok', label: 'Free to use' },
  restricted: { tone: 'caution', label: 'Business license needed' },
  check: { tone: 'neutral', label: 'Check license' },
} as const;

const WORKFLOW_TITLES: Record<string, string> = {
  'general-slowdown': 'General system slowdown',
  'gaming-low-fps': 'Low FPS, stutter, or frame-time spikes',
  'low-disk-space': 'Low disk space',
};

export default function Library() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [workflow, setWorkflow] = useState<string>('general-slowdown');
  const { has, toggle } = useFavorites();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))) return;
      e.preventDefault();
      document.getElementById('lib-search')?.focus();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SOFTWARE.filter((s) => (category === 'all' || s.category === category) && (!q || `${s.name} ${s.purpose}`.toLowerCase().includes(q))).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [query, category]);

  const pending = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PENDING_TOOLS.filter((t) => (category === 'all' || t.category === category) && (!q || t.name.toLowerCase().includes(q)));
  }, [query, category]);

  const plan = WORKFLOW_TOOL_PLANS[workflow];

  return (
    <>
      <PageHeader
        title="Software library"
        description="Each entry says when a tool is the right choice, when it is not, and how to check the result. Some tools need a business license before you use them on a customer’s computer."
      />

      <Panel title="Which tools for this problem" description="The primary tool does the job. Alternatives cover the same job differently. Tools marked not needed are left out on purpose." className="mb-6">
        <div className="mb-5 max-w-sm">
          <Field label="Workflow" htmlFor="plan-workflow">
            <Select id="plan-workflow" value={workflow} onChange={(e) => setWorkflow(e.target.value)}>
              {Object.keys(WORKFLOW_TOOL_PLANS).map((id) => (
                <option key={id} value={id}>
                  {WORKFLOW_TITLES[id] ?? id}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {plan && (
          <div className="flex flex-col gap-5">
            <p className="max-w-[68ch] text-sm text-muted">{plan.reasoning}</p>
            <div className="grid gap-5 md:grid-cols-3">
              <PlanList title="Primary" ids={plan.primary} />
              <PlanList title="Alternatives" ids={plan.alternatives} />
              <PlanList title="Advanced, when the simple route is not enough" ids={plan.advanced} />
            </div>
            {plan.unnecessary.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-ink">Not needed for this problem</p>
                <ul className="divide-y divide-line">
                  {plan.unnecessary.map((u) => (
                    <li key={u.id} className="py-2">
                      <p className="text-sm text-ink">{toolName(u.id)}</p>
                      <p className="text-xs text-muted">{u.reason}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}          </div>
        )}
      </Panel>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full max-w-sm">
          <span className="sr-only">Search the library</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <Input id="lib-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tools" className="pl-9" />
        </label>
        <SegmentedControl<CategoryFilter>
          label="Category"
          value={category}
          onChange={setCategory}
          options={[
            { value: 'all', label: 'All' },
            { value: 'Cleanup and storage', label: 'Cleanup and storage' },
            { value: 'Diagnostics and performance', label: 'Diagnostics' },
            { value: 'Built into Windows', label: 'Built into Windows' },
          ]}
        />
      </div>

      <Panel bodyClassName="-my-2">
        {entries.length === 0 && pending.length === 0 && <p className="py-3 text-sm text-muted">No tool matches “{query}”.</p>}
        <ul className="divide-y divide-line">
          {entries.map((s) => (
            <ToolRow key={s.id} entry={s} favorite={has(s.id)} onToggle={() => toggle(s.id)} />
          ))}
        </ul>
      </Panel>

      {pending.length > 0 && (
        <Panel
          title="Not written yet"
          description="These tools are in the planned catalog. They are listed by name only, and they are not described until their entries are written and checked."
          className="mt-6"
        >
          <ul className="grid gap-x-6 gap-y-1.5 text-sm text-muted sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{t.name}</span>
                <span className="shrink-0 text-xs">Pending</span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

function PlanList({ title, ids }: { title: string; ids: string[] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink">{title}</p>
      {ids.length === 0 ? (
        <p className="text-sm text-muted">None</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {ids.map((id) => (
            <li key={id}>
              {SOFTWARE.some((s) => s.id === id) ? (
                <Link to={`/library/${id}`} className="text-sm text-accent hover:underline">
                  {toolName(id)}
                </Link>
              ) : (
                <span className="text-sm text-muted">{toolName(id)} (not written yet)</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ToolRow({ entry, favorite, onToggle }: { entry: SoftwareEntry; favorite: boolean; onToggle: () => void }) {
  const badge = LICENSE_BADGE[entry.commercialUse];
  return (
    <li className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <Link to={`/library/${entry.id}`} className="font-medium text-ink hover:text-accent">
          {entry.name}
        </Link>
        <p className="mt-0.5 max-w-[68ch] text-sm text-muted">{entry.purpose}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">{entry.category}</Badge>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={favorite}
        aria-label={favorite ? `Remove ${entry.name} from favorites` : `Add ${entry.name} to favorites`}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control text-muted hover:bg-surface-2 hover:text-caution"
      >
        <Star size={16} fill={favorite ? 'currentColor' : 'none'} className={favorite ? 'text-caution' : ''} aria-hidden />
      </button>
    </li>
  );
}
