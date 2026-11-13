import { useLocal, useRecord, useCollection } from './hooks';
import type { Customer, Session } from './types';

export const ACTIVE_KEY = 'softreset.activeSession';

/**
 * The session the technician is working in right now. Diagnostic findings, measurements,
 * and procedure progress are saved to it. A completed session is not treated as active.
 */
export function useActiveSession() {
  const [activeId, setActiveId] = useLocal<string | null>(ACTIVE_KEY, null);
  const { item, ready } = useRecord<Session>('sessions', activeId ?? undefined);
  const { items: customers } = useCollection<Customer>('customers');
  const session = item && item.status !== 'completed' ? item : undefined;
  const customer = session ? customers.find((c) => c.id === session.customerId) : undefined;
  return { activeId, setActiveId, session, customer, ready };
}
