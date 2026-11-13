import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Users } from 'lucide-react';
import { Button, EmptyState, Field, Input, PageHeader, Panel, Textarea } from '../components/ui';
import { useCollection } from '../lib/hooks';
import { putRow } from '../lib/db';
import { createCustomerRecord } from '../lib/sessions';
import type { Customer, Session } from '../lib/types';
import { formatDate } from '../lib/utils';

export default function Customers() {
  const navigate = useNavigate();
  const { items: customers, ready, error } = useCollection<Customer>('customers');
  const { items: sessions } = useCollection<Session>('sessions');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: '', reference: '', contact: '', notes: '' });
  const [formError, setFormError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers
      .filter((c) => !q || `${c.name} ${c.reference}`.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, query]);

  const sessionCount = (id: string) => sessions.filter((s) => s.customerId === id).length;

  const save = async () => {
    if (!draft.name.trim()) {
      setFormError('Enter a name or identifier for the customer.');
      return;
    }
    const c = createCustomerRecord({ name: draft.name.trim(), reference: draft.reference.trim(), contact: draft.contact.trim(), notes: draft.notes.trim() });
    await putRow('customers', c);
    navigate(`/customers/${c.id}`);
  };

  return (
    <>
      <PageHeader
        title="Customers"
        description="Each customer can have several sessions. Keep identifiers short. Avoid storing personal details the work does not need."
        actions={
          <Button variant="primary" onClick={() => setAdding((v) => !v)}>
            <Plus size={16} aria-hidden /> {adding ? 'Close' : 'New customer'}
          </Button>
        }
      />

      {error && <p className="mb-4 rounded-control bg-concern-soft px-4 py-3 text-sm text-concern">{error}</p>}

      {adding && (
        <Panel title="New customer" className="mb-5" bodyClassName="grid gap-4 sm:grid-cols-2">
          <Field label="Name or identifier" htmlFor="c-name" error={formError}>
            <Input id="c-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="For example, Garcia, office laptop" autoComplete="off" />
          </Field>
          <Field label="Reference" htmlFor="c-ref" hint="A short internal code, such as C-014.">
            <Input id="c-ref" value={draft.reference} onChange={(e) => setDraft({ ...draft, reference: e.target.value })} placeholder="C-014" autoComplete="off" />
          </Field>
          <Field label="Contact (optional)" htmlFor="c-contact" hint="Only what you need to reach them. This is stored on this device only.">
            <Input id="c-contact" value={draft.contact} onChange={(e) => setDraft({ ...draft, contact: e.target.value })} autoComplete="off" />
          </Field>
          <Field label="Notes (optional)" htmlFor="c-notes">
            <Textarea id="c-notes" rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </Field>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
            <Button variant="primary" onClick={save}>
              Save customer
            </Button>
            <p className="text-xs text-muted">Never store passwords, tokens, or private files here.</p>
          </div>
        </Panel>
      )}

      <div className="mb-4 max-w-sm">
        <label className="relative block">
          <span className="sr-only">Search customers</span>
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or reference" className="pl-9" />
        </label>
      </div>

      {ready && customers.length === 0 && (
        <EmptyState icon={Users} title="No customers yet" action={<Button variant="primary" onClick={() => setAdding(true)}>Add a customer</Button>}>
          Customers are saved in this browser only. Export your data from Data management to keep a copy.
        </EmptyState>
      )}

      {filtered.length > 0 && (
        <Panel bodyClassName="-my-2">
          <ul className="divide-y divide-line">
            {filtered.map((c) => (
              <li key={c.id}>
                <Link to={`/customers/${c.id}`} className="flex items-center gap-4 py-3 hover:text-accent">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">{c.name}</span>
                    <span className="block truncate text-xs text-muted">
                      {c.reference ? `${c.reference}, ` : ''}
                      {sessionCount(c.id)} {sessionCount(c.id) === 1 ? 'session' : 'sessions'}, added {formatDate(c.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
      {ready && customers.length > 0 && filtered.length === 0 && <p className="text-sm text-muted">No customer matches “{query}”.</p>}
    </>
  );
}
