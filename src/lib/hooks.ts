import { useCallback, useEffect, useState } from 'react';
import { DATA_EVENT, getAll, getOne, type StoreName } from './db';
import type { RecentItem } from './types';

const LOCAL_EVENT = 'softreset:local';

// ---- localStorage helpers (UI preferences only: theme, favorites, recents, active session)

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: key }));
}

export function useLocal<T>(key: string, fallback: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => readLocal(key, fallback));

  useEffect(() => {
    const onChange = (e: Event) => {
      if ((e as CustomEvent<string>).detail === key) setValue(readLocal(key, fallback));
    };
    window.addEventListener(LOCAL_EVENT, onChange);
    return () => window.removeEventListener(LOCAL_EVENT, onChange);
    // fallback is only the initial value; it is intentionally excluded from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const current = readLocal(key, fallback);
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(current) : next;
      writeLocal(key, resolved);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, set];
}

// ---- IndexedDB collections

export function useCollection<T extends { id: string }>(store: StoreName) {
  const [items, setItems] = useState<T[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    getAll<T>(store)
      .then((rows) => {
        setItems(rows);
        setError(null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not read local data.'))
      .finally(() => setReady(true));
  }, [store]);

  useEffect(() => {
    load();
    window.addEventListener(DATA_EVENT, load);
    return () => window.removeEventListener(DATA_EVENT, load);
  }, [load]);

  return { items, ready, error };
}

export function useRecord<T extends { id: string }>(store: StoreName, id: string | undefined) {
  const [item, setItem] = useState<T | undefined>(undefined);
  const [ready, setReady] = useState(false);

  const load = useCallback(() => {
    if (!id) {
      setItem(undefined);
      setReady(true);
      return;
    }
    getOne<T>(store, id)
      .then((row) => setItem(row))
      .finally(() => setReady(true));
  }, [store, id]);

  useEffect(() => {
    setReady(false);
    load();
    window.addEventListener(DATA_EVENT, load);
    return () => window.removeEventListener(DATA_EVENT, load);
  }, [load]);

  return { item, ready };
}

// ---- Preferences

export function useFavorites() {
  const [ids, setIds] = useLocal<string[]>('softreset.favorites', []);
  const toggle = useCallback(
    (id: string) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])),
    [setIds],
  );
  return { ids, toggle, has: (id: string) => ids.includes(id) };
}

export function pushRecent(item: Omit<RecentItem, 'at'>): void {
  const list = readLocal<RecentItem[]>('softreset.recent', []);
  const next = [{ ...item, at: new Date().toISOString() }, ...list.filter((r) => !(r.kind === item.kind && r.id === item.id))].slice(0, 8);
  writeLocal('softreset.recent', next);
}

export function useRecent() {
  return useLocal<RecentItem[]>('softreset.recent', []);
}
