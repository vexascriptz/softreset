import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Field, Input, PageHeader, Panel, Select, Textarea } from '../components/ui';
import { useCollection } from '../lib/hooks';
import { useActiveSession } from '../lib/activeSession';
import { createCustomerRecord, createSessionRecord } from '../lib/sessions';
import { putRow } from '../lib/db';
import type { Customer } from '../lib/types';
import { SERVICES, SERVICE_BY_ID } from '../data/services';
import { ErrorBanner } from '../components/ui';

const NEW = '__new__';

export default function NewSession() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { setActiveId } = useActiveSession();
  const { items: customers, ready } = useCollection<Customer>('customers');

  const [customerChoice, setCustomerChoice] = useState<string>(params.get('customer') ?? (customers[0]?.id ?? NEW));
  const [newName, setNewName] = useState('');
  const [newReference, setNewReference] = useState('');
  const [serviceId, setServiceId] = useState(SERVICES[0].id);
  const [reportedIssue, setReportedIssue] = useState(SERVICES[0].defaultIssue);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const service = SERVICE_BY_ID[serviceId];
  const effectiveChoice = ready && customers.length === 0 ? NEW : customerChoice;
  const creatingCustomer = effectiveChoice === NEW;

  const suggested = useMemo(() => service.suggestedProblemIds, [service]);

  const pickService = (id: string) => {
    setServiceId(id);
    const template = SERVICE_BY_ID[id];
    if (!reportedIssue.trim() || SERVICES.some((s) => s.defaultIssue === reportedIssue)) setReportedIssue(template.defaultIssue);
  };

  const submit = async () => {
    setError(null);
    if (creatingCustomer && !newName.trim()) {
      setError('Enter the customer’s name or an identifier you will recognize, such as “Garcia, office laptop”.');
      return;
    }
    if (!reportedIssue.trim()) {
      setError('Describe what the customer reports, in their words. The report and diagnosis start from this.');
      return;
    }
    setSaving(true);
    try {
      let customerId = effectiveChoice;
      if (creatingCustomer) {
        const c = createCustomerRecord({ name: newName.trim(), reference: newReference.trim(), contact: '', notes: '' });
        await putRow('customers', c);
        customerId = c.id;
      }
      const s = createSessionRecord({ customerId, serviceId, reportedIssue: reportedIssue.trim() });
      await putRow('sessions', s);
      setActiveId(s.id);
      navigate(`/sessions/${s.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The session could not be saved. Try again.');
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="New session" description="A session holds one customer’s case. It becomes the place where findings, measurements, and the report are saved." />
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Panel>
          <div className="flex flex-col gap-6">
            <Field label="Customer" htmlFor="customer">
              <Select id="customer" value={effectiveChoice} onChange={(e) => setCustomerChoice(e.target.value)} disabled={customers.length === 0}>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.reference ? ` (${c.reference})` : ''}
                  </option>
                ))}
                <option value={NEW}>New customer</option>
              </Select>
            </Field>

            {creatingCustomer && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name or identifier" htmlFor="new-name" hint="Use a name or a short label. Avoid home addresses and account details.">
                  <Input id="new-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="For example, Garcia, office laptop" autoComplete="off" />
                </Field>
                <Field label="Reference (optional)" htmlFor="new-ref" hint="A code you use internally, such as C-014.">
                  <Input id="new-ref" value={newReference} onChange={(e) => setNewReference(e.target.value)} placeholder="C-014" autoComplete="off" />
                </Field>
              </div>
            )}

            <Field label="Service" htmlFor="service" hint={service.description}>
              <Select id="service" value={serviceId} onChange={(e) => pickService(e.target.value)}>
                {SERVICES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="What the customer reports" htmlFor="issue" hint="Their words, lightly edited. Do not paste passwords, tokens, or private files here.">
              <Textarea id="issue" rows={3} value={reportedIssue} onChange={(e) => setReportedIssue(e.target.value)} />
            </Field>

            {error && <ErrorBanner>{error}</ErrorBanner>}

            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={submit} disabled={saving}>
                {saving ? 'Creating…' : 'Create session'}
              </Button>
              <Button variant="ghost" onClick={() => navigate('/')}>
                Cancel
              </Button>
            </div>
          </div>
        </Panel>

        <Panel title="Ask the customer" description={`Useful questions for ${service.label.toLowerCase()}.`}>
          {service.intake.length === 0 ? (
            <p className="text-sm text-muted">Start from the customer’s description. Add questions to the session notes as they come up.</p>
          ) : (
            <ul className="flex list-disc flex-col gap-2.5 pl-4 text-sm text-ink marker:text-muted">
              {service.intake.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          )}
          {suggested.length > 0 && (
            <p className="mt-5 text-xs text-muted">Suggested diagnosis: {suggested.map((id) => id.replace(/-/g, ' ')).join(', ')}.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
