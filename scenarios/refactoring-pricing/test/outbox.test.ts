// Side-effect ordering. Legacy notifies, then saves: a failed save still sends the
// message. The new shell writes entities + outbox in one transaction; messages
// leave only from committed outbox rows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeDb, FakeNotifier } from '../src/infra/fakes.ts';
import { LegacyPricingService } from '../src/legacy/pricing.service.ts';
import { flushOutbox } from '../src/pricing/outbox-relay.ts';
import { PricingService } from '../src/pricing/pricing.service.ts';
import { seedFor, type Combo } from './support/matrix.ts';

const vipBigOrder: Combo = { type: 'vip', country: 'DE', category: 'hardware', contract: 'none', promo: null, quantity: 50, firstOrder: false };

test('legacy: save fails, the customer is still thanked and sales still alerted', async () => {
  const db = new FakeDb(seedFor(vipBigOrder));
  db.failOn = 'saveCustomer';
  const n = new FakeNotifier();
  await assert.rejects(new LegacyPricingService(db, n).calculatePrice('o1'));
  assert.deepEqual(n.sent.map((m) => m.template), ['large-order', 'vip-thanks']);
  assert.equal(db.state.orders.get('o1')!.status, 'priced'); // and the order half-saved
  assert.equal(db.state.customers.get('c1')!.ordersCount, 3); // customer not
});

test('new: save fails, transaction rolls back, outbox empty, nothing sent', async () => {
  const db = new FakeDb(seedFor(vipBigOrder));
  db.failOn = 'saveCustomer';
  const n = new FakeNotifier();
  await assert.rejects(new PricingService(db).price('o1'));
  assert.equal(await flushOutbox(db, n), 0);
  assert.deepEqual(n.sent, []);
  assert.equal(db.state.orders.get('o1')!.status, 'new');
  assert.equal(db.state.audit.length, 0);
});

test('new: on success the audit row holds the breakdown support can read', async () => {
  const db = new FakeDb(seedFor(vipBigOrder));
  await new PricingService(db).price('o1');
  assert.deepEqual((db.state.audit[0].breakdown as { rule: string }[]).map((a) => a.rule), ['customer.vip', 'tax.DE']);
  assert.equal(await flushOutbox(db, new FakeNotifier()), 2);
});
