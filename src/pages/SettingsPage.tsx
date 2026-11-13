import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Kbd, PageHeader, Panel, SegmentedControl } from '../components/ui';
import { readLocal } from '../lib/hooks';
import { setTheme, THEME_KEY, type ThemeMode } from '../lib/theme';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Match system' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const SHORTCUTS: { keys: string[]; action: string }[] = [
  { keys: ['Ctrl', 'K'], action: 'Open search. On a Mac, use Cmd K.' },
  { keys: ['/'], action: 'Move to the search box in the software library' },
  { keys: ['Esc'], action: 'Close search' },
  { keys: ['↑', '↓'], action: 'Move through search results' },
  { keys: ['←', '→'], action: 'Move between choices in a segmented control' },
];

export default function SettingsPage() {
  const [theme, setThemeState] = useState<ThemeMode>(() => readLocal<ThemeMode>(THEME_KEY, 'system'));

  const choose = (mode: ThemeMode) => {
    setTheme(mode);
    setThemeState(mode);
  };

  return (
    <>
      <PageHeader title="Settings" description="Preferences for this browser. None of them change anything on a customer’s computer." />

      <div className="grid gap-5">
        <Panel title="Appearance" description="Dark mode changes the colors of this app only.">
          <SegmentedControl<ThemeMode> label="Color theme" value={theme} onChange={choose} options={THEME_OPTIONS} />
        </Panel>

        <Panel title="Keyboard shortcuts">
          <ul className="flex flex-col divide-y divide-line">
            {SHORTCUTS.map((s) => (
              <li key={s.action} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-ink">{s.action}</span>
                <span className="flex gap-1.5">
                  {s.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Privacy and storage">
          <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-ink marker:text-muted">
            <li>Customers, sessions, and measurements are stored in this browser’s IndexedDB storage. The app does not send them to a server.</li>
            <li>Favorites, recent items, the active session, and the theme are kept in this browser’s local storage.</li>
            <li>Storage belongs to this browser on this computer. Another browser or another computer starts empty.</li>
            <li>Clearing site data in the browser deletes everything in softreset. Export a backup first.</li>
          </ul>
          <p className="mt-4 text-sm">
            <Link to="/data" className="font-medium text-accent hover:underline">
              Back up or restore data
            </Link>
          </p>
        </Panel>
      </div>
    </>
  );
}
