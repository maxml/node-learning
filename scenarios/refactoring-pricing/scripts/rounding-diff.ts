// What would switching the money policy from legacy float rounding to exact
// integer half-up rounding change? This is the behaviour-change PR, measured
// before anyone writes it: the count goes into the PR description and the
// changed golden lines go to finance for sign-off.
import { decide } from '../src/pricing/decide.ts';
import { exactMoney, legacyMoney } from '../src/pricing/money.ts';
import { DEFAULT_POLICY } from '../src/pricing/rules.ts';
import { combos, keyOf, PRICES } from '../test/support/matrix.ts';

let total = 0;
const changed: string[] = [];
for (const c of combos('full')) {
  total++;
  const input = {
    customer: { type: c.type, country: c.country, firstOrder: c.firstOrder },
    product: { category: c.category, unitPrice: PRICES[c.category] },
    quantity: c.quantity,
    contract: c.contract,
    promoCode: c.promo,
  };
  const a = decide(input, { ...DEFAULT_POLICY, money: legacyMoney });
  const b = decide(input, { ...DEFAULT_POLICY, money: exactMoney });
  if (a.eligible && b.eligible && (a.net !== b.net || a.tax !== b.tax)) {
    changed.push(`${keyOf(c)}  net ${a.net}->${b.net}  tax ${a.tax}->${b.tax}`);
  }
}
console.log(`${changed.length} of ${total} combinations change by switching ${legacyMoney.name} -> ${exactMoney.name}`);
for (const line of changed.slice(0, 5)) console.log('  ' + line);

// The matrix uses three list prices, so it can miss rare amounts. Scan every
// amount up to 10 000.00 against every percentage the rules use.
const percents = [...new Set(DEFAULT_POLICY.stages.flatMap((s) => s.rows.map((r) => r.percent)))].sort((x, y) => x - y);
let checked = 0;
const disagree: string[] = [];
for (let amount = 1; amount <= 1_000_000; amount++) {
  for (const p of percents) {
    checked++;
    const l = legacyMoney.percentOff(amount, p);
    const e = exactMoney.percentOff(amount, p);
    if (l !== e) disagree.push(`${amount} -${p}%: float ${amount * (1 - p / 100)} -> legacy ${l}, exact ${e}`);
  }
}
console.log(`amount scan: ${disagree.length} of ${checked} (amount, percent) pairs disagree; percents=${percents.join(',')}`);
for (const line of disagree.slice(0, 3)) console.log('  ' + line);
