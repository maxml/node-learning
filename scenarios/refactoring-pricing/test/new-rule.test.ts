// Adding a business rule after the refactor = one row in one table (rules.ts).
// The test proves the blast radius: exactly the combinations the new rule's
// specification selects change, and nothing else.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide } from '../src/pricing/decide.ts';
import { DEFAULT_POLICY, DISCOUNT_STAGES, type PricingPolicy } from '../src/pricing/rules.ts';
import { all, categoryIs, countryIs, customerIs } from '../src/pricing/spec.ts';
import type { PricingInput } from '../src/pricing/model.ts';
import { combos, PRICES, type Combo } from './support/matrix.ts';

// The whole change, as it would appear in the diff of rules.ts (partner stage):
const NEW_ROW = { id: 'partner.ua-hardware-business', when: all(customerIs('business'), countryIs('UA'), categoryIs('hardware')), percent: 4 };

const withNewRule: PricingPolicy = {
  ...DEFAULT_POLICY,
  stages: DISCOUNT_STAGES.map((s) => (s.stage === 'partner' ? { ...s, rows: [...s.rows, NEW_ROW] } : s)),
};

const toInput = (c: Combo): PricingInput => ({
  customer: { type: c.type, country: c.country, firstOrder: c.firstOrder },
  product: { category: c.category, unitPrice: PRICES[c.category] },
  quantity: c.quantity,
  contract: c.contract,
  promoCode: c.promo,
});

test('a new rule changes exactly the combinations its specification selects', (t) => {
  let changed = 0;
  let selected = 0;
  let total = 0;
  for (const c of combos()) {
    total++;
    const input = toInput(c);
    if (NEW_ROW.when(input)) selected++;
    const before = JSON.stringify(decide(input).eligible ? (decide(input) as { net: number }).net : null);
    const after = JSON.stringify(decide(input, withNewRule).eligible ? (decide(input, withNewRule) as { net: number }).net : null);
    if (before !== after) {
      changed++;
      assert.ok(NEW_ROW.when(input), `changed outside the rule: ${JSON.stringify(c)}`);
    }
  }
  t.diagnostic(`${total} combinations, rule selects ${selected}, net changed in ${changed}`);
  assert.equal(changed, selected);
});
