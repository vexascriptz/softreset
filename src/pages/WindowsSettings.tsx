import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Panel, SegmentedControl } from '../components/ui';
import { PROBLEM_BY_ID } from '../data/problems';
import { WINDOWS_SETTINGS, type DeviceType, type DriveType, type PrimaryUse, type SettingContext } from '../data/windowsSettings';

const DEVICE_OPTIONS: { value: DeviceType; label: string }[] = [
  { value: 'laptop', label: 'Laptop' },
  { value: 'desktop', label: 'Desktop' },
];

const DRIVE_OPTIONS: { value: DriveType; label: string }[] = [
  { value: 'ssd', label: 'SSD' },
  { value: 'hdd', label: 'Hard drive' },
  { value: 'unknown', label: 'Not known' },
];

const USE_OPTIONS: { value: PrimaryUse; label: string }[] = [
  { value: 'office', label: 'Office and browsing' },
  { value: 'gaming', label: 'Games' },
  { value: 'mixed', label: 'Both' },
];

export default function WindowsSettings() {
  const [ctx, setCtx] = useState<SettingContext>({ device: 'laptop', drive: 'ssd', use: 'mixed' });

  return (
    <>
      <PageHeader
        title="Windows settings"
        description="Recommendations depend on the three answers below. Each card shows where the setting lives, what it does by default, and how to undo a change. Record every change in the session."
      />

      <Panel title="Customer context" className="mb-6" bodyClassName="grid gap-6 md:grid-cols-3">
        <ContextChoice label="Device">
          <SegmentedControl<DeviceType> label="Device type" value={ctx.device} onChange={(device) => setCtx({ ...ctx, device })} options={DEVICE_OPTIONS} />
        </ContextChoice>
        <ContextChoice label="Drive">
          <SegmentedControl<DriveType> label="Drive type" value={ctx.drive} onChange={(drive) => setCtx({ ...ctx, drive })} options={DRIVE_OPTIONS} />
        </ContextChoice>
        <ContextChoice label="Main use">
          <SegmentedControl<PrimaryUse> label="Main use" value={ctx.use} onChange={(use) => setCtx({ ...ctx, use })} options={USE_OPTIONS} />
        </ContextChoice>
      </Panel>

      <div className="flex flex-col gap-4">
        {WINDOWS_SETTINGS.map((g) => {
          const rec = g.recommend(ctx);
          return (
            <details key={g.id} className="group rounded-panel border border-line bg-surface">
              <summary className="flex cursor-pointer list-none flex-wrap items-start justify-between gap-3 p-5 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{g.title}</span>
                  <span className="mt-1 block text-sm text-muted">
                    Recommended for this customer: <span className="font-medium text-ink">{rec.value}</span>
                  </span>
                </span>
                <span className="shrink-0 text-sm text-accent group-open:hidden">Show details</span>
                <span className="hidden shrink-0 text-sm text-accent group-open:inline">Hide details</span>
              </summary>

              <div className="grid gap-5 border-t border-line p-5 md:grid-cols-2">
                <Detail label="Where to find it">{g.location}</Detail>
                <Detail label="What it does">{g.purpose}</Detail>
                <Detail label="Default behavior">{g.defaultBehavior}</Detail>
                <Detail label="When to change it">{g.whenToChange}</Detail>

                <div className="rounded-control bg-surface-2 p-4 md:col-span-2">
                  <p className="text-sm font-medium text-ink">Why this recommendation</p>
                  <p className="mt-1 text-sm text-ink">{rec.value}</p>
                  <p className="mt-1 text-sm text-muted">{rec.reason}</p>
                </div>

                <div className="md:col-span-2">
                  <p className="text-sm font-medium text-ink">Trade-offs</p>
                  <ul className="mt-1 flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted marker:text-muted">
                    {g.disadvantages.map((d) => (
                      <li key={d}>{d}</li>
                    ))}
                  </ul>
                </div>

                <Detail label="How to undo it">{g.revert}</Detail>

                <div>
                  <p className="text-sm font-medium text-ink">Related problems</p>
                  <ul className="mt-1 flex flex-col gap-1.5 text-sm">
                    {g.relatedProblemIds.map((id) => {
                      const problem = PROBLEM_BY_ID[id];
                      if (!problem) return null;
                      return (
                        <li key={id}>
                          {problem.workflowId ? (
                            <Link to={`/diagnose/${id}`} className="text-accent hover:underline">
                              {problem.title}
                            </Link>
                          ) : (
                            <span className="text-muted">{problem.title} (workflow planned)</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </details>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-muted">
        These are starting points, not rules. Check them against the customer’s own needs, and confirm where a setting sits on the customer’s Windows version,
        because menus change between releases.
      </p>
    </>
  );
}

function ContextChoice({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-ink">{label}</p>
      {children}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-ink">{label}</p>
      <p className="mt-1 max-w-[68ch] text-sm text-muted">{children}</p>
    </div>
  );
}
