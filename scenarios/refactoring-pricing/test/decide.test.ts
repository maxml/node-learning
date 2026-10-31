// Unit tests of the functional core: plain values in, plain values out.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../src/pricing/decide.ts';
import type { PricingInput } from '../src/pricing/model.ts';
import { DISCOUNT_STAGES, ELIGIBILITY } from '../src/pricing/rules.ts';

const base: PricingInput = {
  customer: { type: 'business', country: 'PL', firstOrder: false },
  product: { category: 'software', unitPrice: 4999 },
  quantity: 10,
  contract: 'annual',
  promoCode: 'BULK',
};

test('the breakdown explains every step, in the order applied', () => {
  const d = decide(base);
  assert.equal(d.eligible, true);
  assert.deepEqual(d.applied.map((a) => a.rule), [
    'customer.business.volume', 'partner.pl-software-annual', 'contract.annual', 'promo.bulk.10', 'tax.PL',
  ]);
  if (!d.eligible) return;
  // each step starts from the previous one's rounded result
  for (let i = 1; i < 4; i++) assert.equal(d.applied[i].before, d.applied[i - 1].after);
  assert.equal(d.applied[3].after, d.net);
  assert.equal(d.total, d.net + d.tax + d.shipping);
});

// The breakdown is NEW behaviour: the legacy golden master cannot see it (legacy
// had no breakdown), so it needs its own assertions. Values computed by hand:
// 49990 -8% = 45990.8 -> 45991; -2% = 45071.18 -> 45071; -5% = 42817.45 -> 42817;
// -6% = 40247.98 -> 40248; PL VAT 23% = 9257.04 -> 9257.
test('full breakdown for business / PL / software / annual / BULK x10', () => {
  assert.deepEqual(decide(base).applied, [
    { rule: 'customer.business.volume', stage: 'customer', effect: '-8%', before: 49990, after: 45991 },
    { rule: 'partner.pl-software-annual', stage: 'partner', effect: '-2%', before: 45991, after: 45071 },
    { rule: 'contract.annual', stage: 'contract', effect: '-5%', before: 45071, after: 42817 },
    { rule: 'promo.bulk.10', stage: 'promo', effect: '-6%', before: 42817, after: 40248 },
    { rule: 'tax.PL', effect: '2300 bp', after: 9257 },
  ]);
});

test('breakdown records normalisation, cap, shipping and rejection', () => {
  const retail = decide({ ...base, customer: { type: 'retail', country: 'UA', firstOrder: false }, contract: 'multiYear', promoCode: null, quantity: 1, product: { category: 'hardware', unitPrice: 12999 } });
  assert.deepEqual(retail.applied, [
    { rule: 'contract.retail-no-multiyear', effect: 'multiYear -> annual' },
    { rule: 'tax.UA', effect: '2000 bp', after: 2600 },
    { rule: 'shipping', effect: 'charged', after: 500 },
  ]);
  const capped = decide({ ...base, customer: { type: 'vip', country: 'DE', firstOrder: false }, contract: 'multiYear', promoCode: 'BLACKFRIDAY', product: { category: 'service', unitPrice: 8350 } });
  assert.deepEqual(capped.applied.find((a) => a.rule === 'cap.max-discount'), {
    rule: 'cap.max-discount', effect: 'clamped to 6500 bp of list', before: 51102, after: 54275, // 83500 -15% -10% -20% = 51102 < 65% of 83500

  });
  const rejected = decide({ ...base, customer: { type: 'retail', country: 'DE', firstOrder: true }, product: { category: 'service', unitPrice: 8350 } });
  assert.deepEqual(rejected.applied, [{ rule: 'eligibility.SERVICE_NOT_AVAILABLE', effect: 'rejected' }]);
});

test('rule ids are non-empty and unique (the audit trail refers to them)', () => {
  const ids = [...ELIGIBILITY.map((r) => r.id), ...DISCOUNT_STAGES.flatMap((s) => [s.stage, ...s.rows.map((r) => r.id)])];
  assert.ok(ids.every((id) => id.length > 0));
  assert.equal(new Set(ids).size, ids.length);
});

test('BLACKFRIDAY replaces the contract discount (stacking policy), except for services', () => {
  const soft = decide({ ...base, promoCode: 'BLACKFRIDAY' });
  const svc = decide({ ...base, promoCode: 'BLACKFRIDAY', product: { category: 'service', unitPrice: 8350 } });
  assert.ok(!soft.applied.some((a) => a.rule.startsWith('contract.')));
  assert.ok(svc.applied.some((a) => a.rule === 'contract.annual'));
});

test('the 35% cap is visible in the breakdown when it fires', () => {
  const d = decide({ ...base, customer: { type: 'vip', country: 'DE', firstOrder: false }, contract: 'multiYear', promoCode: 'BLACKFRIDAY', product: { category: 'service', unitPrice: 8350 } });
  assert.ok(d.eligible);
  const cap = d.applied.find((a) => a.rule === 'cap.max-discount');
  assert.ok(cap, 'cap rule must be reported');
  assert.equal(d.net, Math.round(8350 * 10 * 0.65));
});

test('rejection names the rule and emits one event, no price', () => {
  const d = decide({ ...base, customer: { type: 'retail', country: 'US', firstOrder: true }, product: { category: 'hardware', unitPrice: 12999 } });
  assert.deepEqual({ eligible: d.eligible, events: d.events }, { eligible: false, events: [{ type: 'OrderRejected', reason: 'HARDWARE_EXPORT' }] });
});

test('decide does not mutate its input (retail multiYear is normalised on a copy)', () => {
  const input: PricingInput = { ...base, customer: { type: 'retail', country: 'UA', firstOrder: true }, contract: 'multiYear' };
  const before = structuredClone(input);
  const d = decide(input);
  assert.deepEqual(input, before);
  assert.ok(d.eligible && d.contract === 'annual');
});
