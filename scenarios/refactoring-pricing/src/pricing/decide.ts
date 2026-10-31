// Functional core: a pure function from PricingInput to Decision. No DB, no clock,
// no notifier, no mutation of the input. It returns what to change and which domain
// events happened; the shell (pricing.service.ts) performs the effects.
import type { AppliedRule, Decision, DomainEvent, PricingInput } from './model.ts';
import { DEFAULT_POLICY, LARGE_ORDER_THRESHOLD, loyaltyPointsFor, shippingFor, type PricingPolicy } from './rules.ts';

export function decide(raw: PricingInput, policy: PricingPolicy = DEFAULT_POLICY): Decision {
  const applied: AppliedRule[] = [];

  const rejected = policy.eligibility.find((row) => row.when(raw));
  if (rejected) {
    applied.push({ rule: `eligibility.${rejected.id}`, effect: 'rejected' });
    return { eligible: false, reason: rejected.id, applied, events: [{ type: 'OrderRejected', reason: rejected.id }] };
  }

  const input = normalise(raw, applied);
  const { money } = policy;
  const list = input.product.unitPrice * input.quantity;
  let net = list;

  for (const { stage, rows } of policy.stages) {
    const row = rows.find((r) => r.when(input));
    if (!row) continue;
    const before = net;
    net = money.percentOff(net, row.percent);
    applied.push({ rule: row.id, stage, effect: `-${row.percent}%`, before, after: net });
  }

  const floor = money.share(list, 10000 - policy.maxDiscountBp);
  if (net < floor) {
    applied.push({ rule: 'cap.max-discount', effect: `clamped to ${10000 - policy.maxDiscountBp} bp of list`, before: net, after: floor });
    net = floor;
  }

  const vatBp = policy.vatBp[input.customer.country];
  const tax = money.share(net, vatBp);
  applied.push({ rule: `tax.${input.customer.country}`, effect: `${vatBp} bp`, after: tax });

  const shipping = shippingFor(input, net);
  if (shipping > 0) applied.push({ rule: 'shipping', effect: 'charged', after: shipping });

  const total = net + tax + shipping;
  const events: DomainEvent[] = [];
  if (total > LARGE_ORDER_THRESHOLD) events.push({ type: 'LargeOrderPriced', total });
  if (input.customer.type === 'vip') events.push({ type: 'VipOrderPriced' });

  return {
    eligible: true,
    contract: input.contract,
    list,
    net,
    tax,
    shipping,
    total,
    loyaltyPoints: loyaltyPointsFor(input, total),
    applied,
    events,
  };
}

function normalise(i: PricingInput, applied: AppliedRule[]): PricingInput {
  if (i.contract === 'multiYear' && i.customer.type === 'retail') {
    applied.push({ rule: 'contract.retail-no-multiyear', effect: 'multiYear -> annual' });
    return { ...i, contract: 'annual' };
  }
  return i;
}
