import { readLocal, writeLocal } from './hooks';

export type ThemeMode = 'system' | 'light' | 'dark';
export const THEME_KEY = 'softreset.theme';

function resolve(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyTheme(mode: ThemeMode): void {
  document.documentElement.classList.toggle('dark', resolve(mode));
}

export function setTheme(mode: ThemeMode): void {
  writeLocal(THEME_KEY, mode);
  applyTheme(mode);
}

/** Applied once before the first render, and kept in sync with the OS when mode is "system". */
export function applyStoredTheme(): void {
  const mode = readLocal<ThemeMode>(THEME_KEY, 'system');
  applyTheme(mode);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readLocal<ThemeMode>(THEME_KEY, 'system') === 'system') applyTheme('system');
  });
}
