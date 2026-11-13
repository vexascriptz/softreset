import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { buttonStyles, Button, ConfirmButton, EmptyState, ErrorBanner, Field, Input, PageHeader, Panel, Textarea } from '../components/ui';
import { StatusBadge } from '../components/SessionBanner';
import { useActiveSession } from '../lib/activeSession';
import { putRow } from '../lib/db';
import { useCollection, useRecord } from '../lib/hooks';
import { deleteCustomerCascade } from '../lib/sessions';
import type { Customer, Session } from '../lib/types';
import { formatDate, nowIso } from '../lib/utils';

export default function CustomerDetail() {
  const { customerId = '' } = useParams();
  const navigate = useNavigate();
  const { item: customer, ready } = useRecord<Customer>('customers', customerId);
  const { items: sessions } = useCollection<Session>('sessions');
  const { activeId, setActiveId } = useActiveSession();
  const [error, setError] = useState('');

  if (!ready) return null;

  if (!customer) {
    return (
      <EmptyState
        title="No customer with this record"
        action={
          <Link to="/customers" className="text-sm font-medium text-accent hover:underline">
            Back to customers
          </Link>
        }
      >
        It may have been deleted in another tab.
      </EmptyState>
    );
  }

  const mine = sessions.filter((s) => s.customerId === customer.id).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const removalNote = mine.length === 0 ? '' : ` and ${mine.length} ${mine.length === 1 ? 'session' : 'sessions'}`;

  const remove = async () => {
    setError('');
    try {
      await deleteCustomerCascade(customer.id);
      if (activeId && mine.some((s) => s.id === activeId)) setActiveId(null);
      navigate('/customers');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The customer could not be deleted.');
    }
  };

  return (
    <>
      <PageHeader
        title={customer.name}
        description={customer.reference ? `Reference: ${customer.reference}` : 'No reference recorded.'}
        actions={
          <Link to={`/sessions/new?customer=${customer.id}`} className={buttonStyles({ variant: 'primary', size: 'sm' })}>
            New session
          </Link>
        }
      />

      {error && (
        <div className="mb-5">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Details" description="Changes save when you select Save changes.">
          <CustomerForm customer={customer} />
        </Panel>

        <Panel
          title="Sessions"
          description={mine.length === 0 ? 'No sessions yet.' : `${mine.length} ${mine.length === 1 ? 'session' : 'sessions'} for this customer.`}
          bodyClassName="-my-2"
        >
          {mine.length === 0 ? (
            <p className="py-3 text-sm text-muted">Start a session to record work for this customer.</p>
          ) : (
            <ul className="divide-y divide-line">
              {mine.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link to={`/sessions/${s.id}`} className="text-sm font-medium text-ink hover:text-accent">
                      {s.reportedIssue ? s.reportedIssue.slice(0, 80) : 'Session without a reported issue'}
                    </Link>
                    <p className="text-xs text-muted">Opened {formatDate(s.openedAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={s.status} />
                    {s.status === 'completed' && (
                      <Link to={`/reports/${s.id}`} className="text-sm text-accent hover:underline">
                        Report
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel
        title="Delete customer"
        description={`Removes ${customer.name}${removalNote} that belong to them. This cannot be undone. Export a backup first if you might need the records.`}
        className="mt-5"
      >
        <ConfirmButton onConfirm={remove} label="Delete customer" confirmLabel="Confirm delete" />
      </Panel>
    </>
  );
}

function CustomerForm({ customer }: { customer: Customer }) {
  const [name, setName] = useState(customer.name);
  const [reference, setReference] = useState(customer.reference);
  const [contact, setContact] = useState(customer.contact);
  const [notes, setNotes] = useState(customer.notes);
  const [nameError, setNameError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [message, setMessage] = useState('');

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveError('');
    setMessage('');
    if (!name.trim()) {
      setNameError('Enter a name for this customer.');
      return;
    }
    setNameError('');
    try {
      await putRow('customers', {
        ...customer,
        name: name.trim(),
        reference: reference.trim(),
        contact: contact.trim(),
        notes: notes.trim(),
        updatedAt: nowIso(),
      });
      setMessage('Saved.');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'The customer could not be saved.');
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4" noValidate>
      <Field label="Name" htmlFor="cd-name" error={nameError || null}>
        <Input id="cd-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={Boolean(nameError)} />
      </Field>
      <Field label="Reference" htmlFor="cd-reference" hint="Your own label, such as a job or ticket number.">
        <Input id="cd-reference" value={reference} onChange={(e) => setReference(e.target.value)} />
      </Field>
      <Field label="Contact" htmlFor="cd-contact" hint="Only if the customer agreed to keep it here.">
        <Input id="cd-contact" value={contact} onChange={(e) => setContact(e.target.value)} />
      </Field>
      <Field label="Notes" htmlFor="cd-notes" hint="Do not store passwords, PINs, or access tokens.">
        <Textarea id="cd-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      {saveError && <ErrorBanner>{saveError}</ErrorBanner>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="primary">
          Save changes
        </Button>
        {message && (
          <span role="status" className="text-sm text-muted">
            {message}
          </span>
        )}
      </div>
    </form>
  );
}
