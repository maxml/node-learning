// Relay: reads committed outbox rows and sends them. A crash between send and
// mark-as-sent resends the row (at-least-once), so templates must be idempotent
// on the receiving side. In production this is a worker polling the outbox table.
import type { Notifier } from '../infra/ports.ts';
import type { FakeDb } from '../infra/fakes.ts';

export async function flushOutbox(db: FakeDb, notifier: Notifier, now = () => new Date().toISOString()): Promise<number> {
  let sent = 0;
  for (const row of db.state.outbox) {
    if (row.sentAt) continue;
    await notifier.send(row.to, row.template, row.data);
    row.sentAt = now();
    sent++;
  }
  return sent;
}
