import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink, Star } from 'lucide-react';
import { Badge, EmptyState, PageHeader, Panel } from '../components/ui';
import { resolveTool, type SoftwareEntry } from '../data/software';
import { PROCEDURE_BY_ID } from '../data/procedures';
import { PROBLEM_BY_ID } from '../data/problems';
import { useFavorites, pushRecent } from '../lib/hooks';

const LICENSE_BADGE = {
  free: { tone: 'ok', label: 'Free to use' },
  restricted: { tone: 'caution', label: 'Business license needed' },
  check: { tone: 'neutral', label: 'Check license' },
} as const;

function isUrl(text: string): boolean {
  return /^https?:\/\//.test(text);
}

export default function SoftwareDetail() {
  const { toolId = '' } = useParams();
  const resolved = resolveTool(toolId);
  const { has, toggle } = useFavorites();

  const title = resolved ? (resolved.kind === 'entry' ? resolved.entry.name : resolved.name) : '';

  useEffect(() => {
    if (title) pushRecent({ kind: 'tool', id: toolId, title, href: `/library/${toolId}` });
  }, [toolId, title]);

  if (!resolved) {
    return (
      <EmptyState title="No tool with this name" action={<Link to="/library" className="text-sm font-medium text-accent hover:underline">Back to the library</Link>}>
        The link may be out of date. Search the library for the tool.
      </EmptyState>
    );
  }

  if (resolved.kind === 'pending') {
    return (
      <>
        <PageHeader title={resolved.name} description="This entry has not been written yet." />
        <EmptyState title="Entry not written yet" action={<Link to="/library" className="text-sm font-medium text-accent hover:underline">Back to the library</Link>}>
          softreset describes a tool only after its entry is written and its licensing and procedures have been checked. Until then, the name is listed here without guidance.
        </EmptyState>
      </>
    );
  }

  const e: SoftwareEntry = resolved.entry;
  const badge = LICENSE_BADGE[e.commercialUse];
  const favorite = has(e.id);

  return (
    <>
      <PageHeader
        title={e.name}
        description={e.purpose}
        actions={
          <>
            <Badge tone="neutral">{e.category}</Badge>
            <button
              type="button"
              onClick={() => toggle(e.id)}
              aria-pressed={favorite}
              className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-[13px] font-medium text-ink hover:bg-surface-2"
            >
              <Star size={14} fill={favorite ? 'currentColor' : 'none'} className={favorite ? 'text-caution' : ''} aria-hidden />
              {favorite ? 'Favorited' : 'Favorite'}
            </button>
          </>
        }
      />

      <div className="grid gap-5">
        <Panel title="License and sources" description="Confirm the license before using a tool on a customer’s computer.">
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={badge.tone}>{badge.label}</Badge>
            </div>
            <p className="max-w-[68ch] text-ink">{e.license}</p>
            <p className="max-w-[68ch] text-muted">Download: {e.downloadSource}</p>
            <p className="text-muted">
              Official site:{' '}
              {isUrl(e.website) ? (
                <a href={e.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent hover:underline">
                  {e.website}
                  <ExternalLink size={12} aria-hidden />
                </a>
              ) : (
                e.website
              )}
            </p>
            {e.licenseSources.length > 0 && (
              <ul className="flex flex-col gap-1 text-muted">
                {e.licenseSources.map((s) => (
                  <li key={s}>
                    License reference:{' '}
                    <a href={s} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      {s}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-muted">Windows: {e.windows}</p>
          </div>
        </Panel>

        <div className="grid gap-5 md:grid-cols-2">
          <ListPanel title="When to use it" items={e.whenToUse} />
          <ListPanel title="When not to use it" items={e.whenNotToUse} />
        </div>

        <Panel title="Installation or portable use">
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-ink marker:text-muted">
            {e.install.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Panel>

        <Panel title="Recommended configuration">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-ink marker:text-muted">
            {e.recommendedConfig.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Panel>

        <Panel title="Exact usage">
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-ink marker:text-muted">
            {e.usage.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </Panel>

        <Panel title="What the numbers mean">
          <dl className="grid gap-4 sm:grid-cols-2">
            {e.metrics.map((m) => (
              <div key={m.name}>
                <dt className="text-sm font-medium text-ink">{m.name}</dt>
                <dd className="mt-1 text-sm text-muted">{m.meaning}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <div className="grid gap-5 md:grid-cols-2">
          <ListPanel title="Common mistakes" items={e.mistakes} />
          <ListPanel title="Safety" items={e.safety} tone="concern" />
        </div>

        <Panel title="Verification">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-ink marker:text-muted">
            {e.verification.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Panel>

        <Panel title="Related problems and alternatives">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Related problems</p>
              <ul className="flex flex-col gap-1.5 text-sm">
                {e.relatedProblems.map((id) => {
                  const p = PROBLEM_BY_ID[id];
                  return (
                    <li key={id}>
                      {p?.workflowId ? (
                        <Link to={`/diagnose/${id}`} className="text-accent hover:underline">
                          {p.title}
                        </Link>
                      ) : (
                        <span className="text-muted">{p?.title ?? id} (workflow planned)</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-ink">Alternatives</p>
              <ul className="flex flex-col gap-1.5 text-sm">
                {e.alternatives.map((id) => (
                  <li key={id}>
                    <Link to={`/library/${id}`} className="text-accent hover:underline">
                      {id.replace(/-/g, ' ')}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>

        <Panel title="Procedures">
          {e.procedureIds.length === 0 ? (
            <p className="text-sm text-muted">No procedure is written for this tool yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {e.procedureIds.map((id) => (
                <li key={id}>
                  <Link to={`/procedures/${id}`} className="text-sm text-accent hover:underline">
                    {PROCEDURE_BY_ID[id]?.title ?? id}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Not verified in this entry" description="Confirm these on the machine or with the vendor before relying on them.">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-caution marker:text-caution">
            {e.unverified.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function ListPanel({ title, items, tone }: { title: string; items: string[]; tone?: 'concern' }) {
  return (
    <Panel title={title}>
      <ul className={`flex list-disc flex-col gap-2 pl-5 text-sm marker:text-muted ${tone === 'concern' ? 'text-concern' : 'text-ink'}`}>
        {items.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
    </Panel>
  );
}
