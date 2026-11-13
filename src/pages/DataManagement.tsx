import { useEffect, useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button, ConfirmButton, ErrorBanner, PageHeader, Panel, SegmentedControl } from '../components/ui';
import { useActiveSession } from '../lib/activeSession';
import { exportBundle, importBundle, storageEstimate, wipeAll } from '../lib/db';
import { useCollection } from '../lib/hooks';
import type { Customer, ExportBundle, Session } from '../lib/types';
import { downloadText } from '../lib/utils';

type ImportMode = 'merge' | 'replace';

function isBundle(value: unknown): value is ExportBundle {
  if (!value || typeof value !== 'object') return false;
  const b = value as Partial<ExportBundle>;
  return b.app === 'softreset' && b.schemaVersion === 1 && Array.isArray(b.customers) && Array.isArray(b.sessions);
}

export default function DataManagement() {
  const { items: customers } = useCollection<Customer>('customers');
  const { items: sessions } = useCollection<Session>('sessions');
  const { setActiveId } = useActiveSession();
  const [estimate, setEstimate] = useState<{ usedMb: number; quotaMb: number } | null>(null);
  const [mode, setMode] = useState<ImportMode>('merge');
  const [pending, setPending] = useState<{ name: string; bundle: ExportBundle } | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    storageEstimate()
      .then(setEstimate)
      .catch(() => setEstimate(null));
  }, [customers.length, sessions.length]);

  async function exportAll() {
    setError('');
    setMessage('');
    try {
      const bundle = await exportBundle();
      downloadText(`softreset-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(bundle, null, 2));
      setMessage(
        `Exported ${bundle.customers.length} customers and ${bundle.sessions.length} sessions. The file contains customer names and contact details, so store it securely.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The backup could not be exported.');
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    setError('');
    setMessage('');
    setPending(null);
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isBundle(parsed)) {
        setError('This file is not a softreset backup. Choose a file made with Export backup in this app.');
        return;
      }
      setPending({ name: file.name, bundle: parsed });
    } catch {
      setError('This file could not be read. Check that it is a JSON backup.');
    }
  }

  async function applyImport() {
    if (!pending) return;
    setError('');
    try {
      await importBundle(pending.bundle, mode);
      if (mode === 'replace') setActiveId(null);
      setMessage(
        `Imported ${pending.bundle.customers.length} customers and ${pending.bundle.sessions.length} sessions. ${
          mode === 'replace' ? 'Existing data was replaced.' : 'Existing data was kept and merged.'
        }`,
      );
      setPending(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The backup could not be imported.');
    }
  }

  async function wipe() {
    setError('');
    setMessage('');
    try {
      await wipeAll();
      setActiveId(null);
      setPending(null);
      setMessage('All local data was deleted from this browser.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The data could not be deleted.');
    }
  }

  return (
    <>
      <PageHeader
        title="Data"
        description="Everything is stored in this browser. Back up regularly, and before clearing browser data or moving to another computer."
      />

      {error && (
        <div className="mb-5">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}
      {message && (
        <p role="status" className="mb-5 text-sm text-ink">
          {message}
        </p>
      )}

      <div className="grid gap-5">
        <Panel title="Storage" description="What this browser holds for softreset.">
          <dl className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">Customers</dt>
              <dd className="mt-1 tabular-nums text-ink">{customers.length}</dd>
            </div>
            <div>
              <dt className="text-muted">Sessions</dt>
              <dd className="mt-1 tabular-nums text-ink">{sessions.length}</dd>
            </div>
            <div>
              <dt className="text-muted">Space used</dt>
              <dd className="mt-1 tabular-nums text-ink">{estimate ? `${estimate.usedMb.toFixed(1)} MB` : 'Not available'}</dd>
            </div>
          </dl>
          {estimate && (
            <p className="mt-3 text-xs text-muted">The browser reports about {estimate.quotaMb.toFixed(0)} MB available to this site. That limit can change.</p>
          )}
        </Panel>

        <Panel title="Export a backup" description="Saves every customer and session in one JSON file.">
          <Button variant="secondary" onClick={exportAll}>
            Export backup
          </Button>
        </Panel>

        <Panel title="Import a backup" description="Choose a file made by Export backup. Nothing changes until you confirm.">
          <div className="flex flex-col gap-4">
            <SegmentedControl<ImportMode>
              label="Import mode"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'merge', label: 'Merge with existing data' },
                { value: 'replace', label: 'Replace existing data' },
              ]}
            />
            <p className="max-w-[68ch] text-sm text-muted">
              Merge keeps what is here and adds or updates records from the file. Replace deletes everything here first.
            </p>
            <input
              type="file"
              accept="application/json,.json"
              onChange={onFile}
              className="text-sm text-ink file:mr-3 file:rounded-control file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-sm file:text-ink"
            />
            {pending && (
              <div className="flex flex-col gap-3 rounded-control border border-line bg-surface-2 p-4 text-sm">
                <p className="text-ink">
                  {pending.name}: {pending.bundle.customers.length} customers and {pending.bundle.sessions.length} sessions, exported{' '}
                  {new Date(pending.bundle.exportedAt).toLocaleString()}.
                </p>
                <div>
                  <ConfirmButton
                    onConfirm={applyImport}
                    label={mode === 'replace' ? 'Replace existing data' : 'Merge into this browser'}
                    confirmLabel="Confirm import"
                  />
                </div>
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Delete all local data" description="Removes every customer and session from this browser. Export a backup first if you might need them.">
          <ConfirmButton onConfirm={wipe} label="Delete all local data" confirmLabel="Confirm, delete everything" />
        </Panel>
      </div>

      <p className="mt-6 text-sm text-muted">
        Appearance and shortcuts are on the{' '}
        <Link to="/settings" className="font-medium text-accent hover:underline">
          settings page
        </Link>
        .
      </p>
    </>
  );
}
