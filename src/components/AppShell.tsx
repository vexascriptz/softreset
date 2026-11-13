import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  ClipboardCheck,
  Database,
  FileText,
  GraduationCap,
  Library,
  LayoutDashboard,
  ListChecks,
  Menu,
  Moon,
  NotebookPen,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  Stethoscope,
  Sun,
  SunMoon,
  Users,
  Gauge,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useLocal } from '../lib/hooks';
import { setTheme, type ThemeMode, THEME_KEY } from '../lib/theme';
import { useActiveSession } from '../lib/activeSession';
import { Kbd } from './ui';
import { CommandPalette } from './CommandPalette';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Activity;
  end?: boolean;
  planned?: boolean;
}

const NAV: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Workspace',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
      { to: '/sessions', label: 'Active sessions', icon: Activity },
      { to: '/customers', label: 'Customers', icon: Users },
      { to: '/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    heading: 'Technician tools',
    items: [
      { to: '/diagnose', label: 'Diagnose', icon: Stethoscope },
      { to: '/library', label: 'Software library', icon: Library },
      { to: '/procedures', label: 'Procedures', icon: ListChecks },
      { to: '/windows-settings', label: 'Windows settings', icon: SlidersHorizontal },
      { to: '/performance', label: 'Performance analysis', icon: Gauge },
    ],
  },
  {
    heading: 'Resources',
    items: [
      { to: '/resources/knowledge', label: 'Troubleshooting knowledge base', icon: BookOpen, planned: true },
      { to: '/resources/checklists', label: 'Maintenance checklists', icon: ClipboardCheck, planned: true },
      { to: '/resources/notes', label: 'Technician notes', icon: NotebookPen, planned: true },
      { to: '/resources/training', label: 'Training and practice', icon: GraduationCap, planned: true },
    ],
  },
  {
    heading: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: Settings },
      { to: '/data', label: 'Data management', icon: Database },
    ],
  },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-6 overflow-y-auto px-3 py-5">
      <div className="flex items-center gap-2.5 px-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-control bg-brand text-on-brand">
          <Activity size={18} strokeWidth={2} aria-hidden />
        </span>
        <span className="text-[17px] font-semibold tracking-tight text-ink">softreset</span>
      </div>
      {NAV.map((group) => (
        <div key={group.heading} className="flex flex-col gap-1">
          <p className="px-2.5 pb-1 text-xs font-medium text-muted">{group.heading}</p>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-control px-2.5 py-2 text-sm transition-colors',
                  isActive ? 'bg-brand-soft font-medium text-ink' : 'text-ink/80 hover:bg-surface-2 hover:text-ink',
                )
              }
            >
              <item.icon size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-muted" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.planned && <span className="rounded-full bg-surface-2 px-2 py-px text-[11px] text-muted">Planned</span>}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

function ThemeToggle() {
  const [mode, setMode] = useLocal<ThemeMode>(THEME_KEY, 'system');
  const next: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };
  const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : SunMoon;
  const label = mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'Match system';
  return (
    <button
      type="button"
      onClick={() => {
        setTheme(next[mode]);
        setMode(next[mode]);
      }}
      aria-label={`Theme: ${label}. Change theme`}
      title={`Theme: ${label}`}
      className="flex h-9 w-9 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      <Icon size={17} strokeWidth={1.75} aria-hidden />
    </button>
  );
}

function ActiveSessionChip() {
  const { session, customer } = useActiveSession();
  if (!session) return null;
  return (
    <NavLink
      to={`/sessions/${session.id}`}
      className="hidden min-w-0 items-center gap-2 rounded-control border border-line bg-surface px-3 py-1.5 text-sm text-ink hover:bg-surface-2 md:flex"
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-ok" aria-hidden />
      <span className="truncate">{customer?.name ?? 'Session'}</span>
      <span className="text-muted">{session.status === 'paused' ? 'paused' : 'open'}</span>
    </NavLink>
  );
}

function Topbar({ onMenu, onSearch }: { onMenu: () => void; onSearch: () => void }) {
  const navigate = useNavigate();
  return (
    <header className="no-print sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-canvas/90 px-4 backdrop-blur md:px-6">
      <button type="button" onClick={onMenu} aria-label="Open navigation" className="flex h-9 w-9 items-center justify-center rounded-control text-ink hover:bg-surface-2 lg:hidden">
        <Menu size={18} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onSearch}
        className="flex h-9 min-w-0 max-w-md flex-1 items-center gap-2 rounded-control border border-line bg-surface px-3 text-left text-sm text-muted hover:border-brand"
      >
        <Search size={15} aria-hidden />
        <span className="truncate">Search tools, procedures, customers</span>
        <span className="ml-auto hidden items-center gap-1 sm:flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
      <div className="ml-auto flex items-center gap-2">
        <ActiveSessionChip />
        <ThemeToggle />
        <button
          type="button"
          onClick={() => navigate('/sessions/new')}
          className="inline-flex h-9 items-center gap-1.5 rounded-control bg-brand px-3 text-sm font-medium text-on-brand transition-colors hover:bg-brand-strong"
        >
          <Plus size={16} aria-hidden />
          <span className="hidden sm:inline">New session</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>
    </header>
  );
}

export function AppShell(): ReactNode {
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setNavOpen(false), [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-line bg-surface lg:block">
        <Sidebar />
      </aside>

      {navOpen && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close navigation" onClick={() => setNavOpen(false)} className="absolute inset-0 bg-ink/30" />
          <aside className="absolute inset-y-0 left-0 w-64 border-r border-line bg-surface shadow-float">
            <div className="flex justify-end p-3">
              <button type="button" aria-label="Close navigation" onClick={() => setNavOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-control hover:bg-surface-2">
                <X size={18} aria-hidden />
              </button>
            </div>
            <Sidebar onNavigate={() => setNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="lg:pl-60">
        <Topbar onMenu={() => setNavOpen(true)} onSearch={() => setPaletteOpen(true)} />
        <main className="mx-auto w-full max-w-[1080px] px-4 py-8 md:px-8">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
