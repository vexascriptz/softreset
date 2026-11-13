import { deleteRow, getAll, getOne, putRow } from './db';
import { nowIso, uid } from './utils';
import type { Customer, Hardware, LogEntry, LogKind, Session, SessionStatus } from './types';

export const EMPTY_HARDWARE: Hardware = { device: '', cpu: '', gpu: '', ram: '', storage: '', displayHz: '' };

export function createSessionRecord(input: { customerId: string; serviceId: string; reportedIssue: string }): Session {
  const now = nowIso();
  return {
    id: uid(),
    customerId: input.customerId,
    serviceId: input.serviceId,
    status: 'open',
    reportedIssue: input.reportedIssue,
    initialCondition: '',
    windowsVersion: '',
    hardware: { ...EMPTY_HARDWARE },
    findings: [],
    measurements: [],
    actions: [],
    settingsChanged: [],
    verifications: [],
    procedureProgress: {},
    workflow: null,
    remainingConcerns: '',
    maintenance: '',
    notes: '',
    log: [{ id: uid(), at: now, kind: 'system', text: 'Session opened.' }],
    openedAt: now,
    updatedAt: now,
  };
}

export function createCustomerRecord(input: Pick<Customer, 'name' | 'reference' | 'contact' | 'notes'>): Customer {
  const now = nowIso();
  return { id: uid(), ...input, createdAt: now, updatedAt: now };
}

export function logEntry(kind: LogKind, text: string): LogEntry {
  return { id: uid(), at: nowIso(), kind, text };
}

/** Reads a session, applies a change to a copy, and saves it. The change is never applied to a stale object. */
export async function updateSession(id: string, change: (draft: Session) => void): Promise<Session> {
  const current = await getOne<Session>('sessions', id);
  if (!current) throw new Error('This session no longer exists. It may have been deleted in another tab.');
  const draft = structuredClone(current);
  change(draft);
  draft.updatedAt = nowIso();
  await putRow('sessions', draft);
  return draft;
}

export async function setSessionStatus(id: string, status: SessionStatus): Promise<void> {
  const labels: Record<SessionStatus, string> = { open: 'Session resumed.', paused: 'Session paused.', completed: 'Session marked completed.' };
  await updateSession(id, (s) => {
    s.status = status;
    if (status === 'completed') s.completedAt = nowIso();
    else delete s.completedAt;
    s.log.push(logEntry('system', labels[status]));
  });
}

/** Removes a customer and every session that belongs to them. */
export async function deleteCustomerCascade(customerId: string): Promise<void> {
  const sessions = await getAll<Session>('sessions');
  for (const s of sessions) {
    if (s.customerId === customerId) await deleteRow('sessions', s.id);
  }
  await deleteRow('customers', customerId);
}

export function sessionTitle(s: Session, customers: Customer[]): string {
  const name = customers.find((c) => c.id === s.customerId)?.name ?? 'Unknown customer';
  return name;
}
