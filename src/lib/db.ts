import type { Customer, ExportBundle, Session } from './types';

// Everything is stored in this browser's IndexedDB. Nothing is sent to a server.
const DB_NAME = 'softreset';
const DB_VERSION = 1;
export const DATA_EVENT = 'softreset:data';

export type StoreName = 'customers' | 'sessions';
const STORES: StoreName[] = ['customers', 'sessions'];

interface Row {
  id: string;
}

let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!('indexedDB' in globalThis)) {
    return Promise.reject(new Error('This browser does not support IndexedDB, so softreset cannot save data here.'));
  }
  if (!opening) {
    opening = new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const name of STORES) {
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        opening = null;
        reject(req.error ?? new Error('Could not open the local database.'));
      };
    });
  }
  return opening;
}

function notify(): void {
  window.dispatchEvent(new Event(DATA_EVENT));
}

function run<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error ?? new Error('Database write failed.'));
        tx.onabort = () => reject(tx.error ?? new Error('Database transaction was aborted.'));
      }),
  );
}

export function getAll<T extends Row>(store: StoreName): Promise<T[]> {
  return run<T[]>(store, 'readonly', (s) => s.getAll());
}

export function getOne<T extends Row>(store: StoreName, id: string): Promise<T | undefined> {
  return run<T | undefined>(store, 'readonly', (s) => s.get(id));
}

export async function putRow<T extends Row>(store: StoreName, row: T): Promise<void> {
  await run(store, 'readwrite', (s) => s.put(row));
  notify();
}

export async function deleteRow(store: StoreName, id: string): Promise<void> {
  await run(store, 'readwrite', (s) => s.delete(id));
  notify();
}

export async function exportBundle(): Promise<ExportBundle> {
  const [customers, sessions] = await Promise.all([getAll<Customer>('customers'), getAll<Session>('sessions')]);
  return { app: 'softreset', schemaVersion: 1, exportedAt: new Date().toISOString(), customers, sessions };
}

/** Writes customers and sessions in one transaction. "replace" clears both stores first. */
export async function importBundle(bundle: ExportBundle, mode: 'replace' | 'merge'): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES, 'readwrite');
    if (mode === 'replace') {
      for (const name of STORES) tx.objectStore(name).clear();
    }
    for (const c of bundle.customers) tx.objectStore('customers').put(c);
    for (const s of bundle.sessions) tx.objectStore('sessions').put(s);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Import failed.'));
    tx.onabort = () => reject(tx.error ?? new Error('Import was aborted.'));
  });
  notify();
}

export async function wipeAll(): Promise<void> {
  const db = await open();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES, 'readwrite');
    for (const name of STORES) tx.objectStore(name).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Could not clear data.'));
  });
  notify();
}

export async function storageEstimate(): Promise<{ usedMb: number; quotaMb: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const est = await navigator.storage.estimate();
  return { usedMb: (est.usage ?? 0) / 1_048_576, quotaMb: (est.quota ?? 0) / 1_048_576 };
}
