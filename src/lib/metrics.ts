import type { Measurement, MetricKey } from './types';

export interface MetricDef {
  key: MetricKey;
  label: string;
  unit: string;
  better: 'lower' | 'higher';
  group: 'Startup' | 'Memory' | 'Processor' | 'Storage' | 'Gaming';
  help: string;
}

export const METRICS: MetricDef[] = [
  { key: 'boot-seconds', label: 'Sign-in to usable desktop', unit: 's', better: 'lower', group: 'Startup', help: 'Measured with a stopwatch from the desktop appearing until the taskbar and tray respond without delay.' },
  { key: 'startup-items', label: 'Enabled startup items', unit: 'items', better: 'lower', group: 'Startup', help: 'Rows with status Enabled in Task Manager > Startup apps.' },
  { key: 'ram-idle-pct', label: 'Memory in use at idle', unit: '%', better: 'lower', group: 'Memory', help: 'The "In use" value in Task Manager > Performance > Memory, after closing the customer\'s programs.' },
  { key: 'ram-peak-pct', label: 'Memory in use under load', unit: '%', better: 'lower', group: 'Memory', help: 'The highest "In use" value during the slowdown.' },
  { key: 'cpu-idle-pct', label: 'Processor use at idle', unit: '%', better: 'lower', group: 'Processor', help: 'Typical CPU value over two idle minutes.' },
  { key: 'disk-idle-pct', label: 'Disk activity at idle', unit: '%', better: 'lower', group: 'Storage', help: 'Typical disk active time over two idle minutes.' },
  { key: 'free-space-gb', label: 'Free space on the drive', unit: 'GB', better: 'higher', group: 'Storage', help: 'Free space as shown in File Explorer for the same drive.' },
  { key: 'avg-fps', label: 'Average frame rate', unit: 'fps', better: 'higher', group: 'Gaming', help: 'Average over the same repeatable capture.' },
  { key: 'low-1pct-fps', label: '1% low frame rate', unit: 'fps', better: 'higher', group: 'Gaming', help: 'Frame rate of the slowest 1% of frames in the same capture.' },
  { key: 'frametime-ms', label: 'Average frame time', unit: 'ms', better: 'lower', group: 'Gaming', help: 'Average time between frames in the same capture.' },
];

export const METRIC_BY_KEY = Object.fromEntries(METRICS.map((m) => [m.key, m])) as Record<MetricKey, MetricDef>;

export type ComparisonStatus = 'measured' | 'not-comparable' | 'waiting-before' | 'waiting-after' | 'none';

export interface Comparison {
  metric: MetricDef;
  before?: Measurement;
  after?: Measurement;
  status: ComparisonStatus;
  reason: string;
  delta?: number;
  pct?: number | null;
  improved?: boolean;
}

function latest(rows: Measurement[]): Measurement | undefined {
  return [...rows].sort((a, b) => b.at.localeCompare(a.at))[0];
}

export function normalizeConditions(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Compares the latest "before" and "after" value for each metric.
 * A change is only called "measured" when both values record the same non-empty conditions.
 * Otherwise it is shown as indicative, and no percentage is claimed as a result.
 */
export function compareMeasurements(list: Measurement[]): Comparison[] {
  return METRICS.map((metric): Comparison => {
    const rows = list.filter((m) => m.metric === metric.key);
    const before = latest(rows.filter((r) => r.phase === 'before'));
    const after = latest(rows.filter((r) => r.phase === 'after'));

    if (!before && !after) return { metric, status: 'none', reason: 'No values recorded yet.' };
    if (!before) return { metric, after, status: 'waiting-before', reason: 'Record a before value to compare against.' };
    if (!after) return { metric, before, status: 'waiting-after', reason: 'Record an after value under the same conditions.' };

    const delta = after.value - before.value;
    const pct = before.value === 0 ? null : (delta / Math.abs(before.value)) * 100;
    const improved = delta === 0 ? false : metric.better === 'lower' ? delta < 0 : delta > 0;
    const conditionsRecorded = normalizeConditions(before.conditions) !== '';
    const sameConditions = conditionsRecorded && normalizeConditions(before.conditions) === normalizeConditions(after.conditions);

    if (!sameConditions) {
      return {
        metric,
        before,
        after,
        status: 'not-comparable',
        reason: 'The conditions are missing or differ between the two values. Treat this change as indicative only.',
        delta,
        pct,
        improved,
      };
    }
    return {
      metric,
      before,
      after,
      status: 'measured',
      reason: 'Both values were recorded under the same conditions.',
      delta,
      pct,
      improved,
    };
  });
}
