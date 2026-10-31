// Imperative shell: load -> decide (pure) -> apply in ONE transaction (entities +
// outbox + audit) -> notifications go out from the outbox only after commit.
import type { Customer, Db, Order, OutboxRow, PriceResult, Product } from '../infra/ports.ts';
import { decide } from './decide.ts';
import type { Decision, DomainEvent, PricingInput } from './model.ts';
import { DEFAULT_POLICY, type PricingPolicy } from './rules.ts';

type DomainEventRow = Omit<OutboxRow, 'id' | 'sentAt'>;

export function toPricingInput(order: Order, customer: Customer, product: Product): PricingInput {
  return {
    customer: { type: customer.type, country: customer.country, firstOrder: customer.ordersCount === 0 },
    product: { category: product.category, unitPrice: product.priceCents },
    quantity: order.quantity,
    contract: order.contract,
    promoCode: order.promoCode,
  };
}

export function toResult(d: Decision): PriceResult {
  return d.eligible
    ? { eligible: true, net: d.net, tax: d.tax, shipping: d.shipping, total: d.total }
    : { eligible: false, reason: d.reason };
}

/** Pure: the new rows to persist. Inputs are not mutated. */
export function applyDecision(order: Order, customer: Customer, d: Decision): { order: Order; customer?: Customer } {
  if (!d.eligible) return { order: { ...order, status: 'rejected', rejectReason: d.reason } };
  return {
    order: {
      ...order,
      contract: d.contract,
      status: 'priced',
      netCents: d.net,
      taxCents: d.tax,
      shippingCents: d.shipping,
      totalCents: d.total,
    },
    customer: {
      ...customer,
      loyaltyPoints: customer.loyaltyPoints + d.loyaltyPoints,
      ordersCount: customer.ordersCount + 1,
    },
  };
}

/** Domain events -> outbox rows. Which template goes to whom is decided here, once. */
export function toOutbox(events: DomainEvent[], order: Order, customer: Customer): DomainEventRow[] {
  return events.map((e) => {
    switch (e.type) {
      case 'OrderRejected':
        return { type: e.type, to: customer.email, template: 'order-rejected', data: { orderId: order.id, reason: e.reason } };
      case 'LargeOrderPriced':
        return { type: e.type, to: 'sales@example.com', template: 'large-order', data: { orderId: order.id, total: e.total } };
      case 'VipOrderPriced':
        return { type: e.type, to: customer.email, template: 'vip-thanks', data: { orderId: order.id } };
    }
  });
}

export class PricingService {
  db: Db;
  policy: PricingPolicy;

  constructor(db: Db, policy: PricingPolicy = DEFAULT_POLICY) {
    this.db = db;
    this.policy = policy;
  }

  async loadInput(orderId: string): Promise<{ order: Order; customer: Customer; input: PricingInput }> {
    const order = await this.db.findOrder(orderId);
    if (!order) throw new Error('Order not found: ' + orderId);
    const customer = await this.db.findCustomer(order.customerId);
    const product = await this.db.findProduct(order.productId);
    return { order, customer, input: toPricingInput(order, customer, product) };
  }

  async price(orderId: string): Promise<PriceResult> {
    const { order, customer, input } = await this.loadInput(orderId);
    const decision = decide(input, this.policy);
    const next = applyDecision(order, customer, decision);
    await this.db.transaction(async (tx) => {
      await tx.saveOrder(next.order);
      if (next.customer) await tx.saveCustomer(next.customer);
      await tx.insertOutbox(toOutbox(decision.events, order, customer));
      await tx.insertAudit({ orderId, breakdown: decision.applied });
    });
    return toResult(decision);
  }
}
