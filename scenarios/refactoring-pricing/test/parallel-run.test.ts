// Parallel run (shadow mode) behind a flag: legacy stays authoritative, the new
// core runs on the same input without side effects, mismatches are reported.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FakeDb, FakeNotifier } from '../src/infra/fakes.ts';
import { decide } from '../src/pricing/decide.ts';
import { createPricing, type Mismatch } from '../src/pricing/pricing.router.ts';
import { toResult } from '../src/pricing/pricing.service.ts';
import { DEFAULT_POLICY, DISCOUNT_STAGES, type PricingPolicy } from '../src/pricing/rules.ts';
import { combos, keyOf, seedFor } from './support/matrix.ts';

async function shadowRun(candidatePolicy: PricingPolicy = DEFAULT_POLICY) {
  const mismatches: Mismatch[] = [];
  let sideEffectsDiffer = 0;
  for (const c of combos()) {
    const db = new FakeDb(seedFor(c));
    const n = new FakeNotifier();
    const shadow = createPricing(db, n, () => 'shadow', (m) => mismatches.push({ ...m, orderId: keyOf(c) }), candidatePolicy);
    await shadow.price('o1');

    // same combination through legacy alone: the shadow must not add any effect
    const db2 = new FakeDb(seedFor(c));
    const n2 = new FakeNotifier();
    await createPricing(db2, n2, () => 'legacy', () => {}).price('o1');
    if (JSON.stringify([db.state, n.sent]) !== JSON.stringify([db2.state, n2.sent])) sideEffectsDiffer++;
  }
  return { mismatches, sideEffectsDiffer };
}

test('shadow mode: 0 mismatches and no extra side effects on the whole matrix', async (t) => {
  const { mismatches, sideEffectsDiffer } = await shadowRun();
  t.diagnostic(`mismatches=${mismatches.length} sideEffectsDiffer=${sideEffectsDiffer}`);
  assert.equal(mismatches.length, 0);
  assert.equal(sideEffectsDiffer, 0);
});

test('shadow mode catches a wrong candidate while customers still get legacy prices', async (t) => {
  // candidate bug: promo stage moved before the customer stage (stacking order)
  const [customer, partner, contract, promo] = DISCOUNT_STAGES;
  const reordered = { ...DEFAULT_POLICY, stages: [promo, customer, partner, contract] };
  const { mismatches, sideEffectsDiffer } = await shadowRun(reordered);
  t.diagnostic(`reordered stages: mismatches=${mismatches.length}`);
  assert.ok(mismatches.length > 0);
  assert.equal(sideEffectsDiffer, 0);
});

test('naive shadow that reads the input AFTER legacy ran reports false mismatches', async (t) => {
  const falseAlarms: string[] = [];
  for (const c of combos()) {
    const db = new FakeDb(seedFor(c));
    const router = createPricing(db, new FakeNotifier(), () => 'legacy', () => {});
    const legacy = await router.legacy.calculatePrice('o1');
    const { input } = await router.next.loadInput('o1'); // legacy already bumped ordersCount
    if (JSON.stringify(toResult(decide(input))) !== JSON.stringify(legacy)) falseAlarms.push(keyOf(c));
  }
  t.diagnostic(`false mismatches=${falseAlarms.length}`);
  assert.ok(falseAlarms.length > 0);
  assert.ok(falseAlarms.every((k) => k.includes('|WELCOME10|') && k.endsWith('|first')));
});
