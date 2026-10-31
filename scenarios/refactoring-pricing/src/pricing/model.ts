// Input and output of the pure decision. No ids of DB rows, no entities, no ports:
// everything decide() needs is in PricingInput, everything it concludes is in Decision.
import type { Category, Contract, Country, CustomerType } from '../infra/ports.ts';
import type { Minor } from './money.ts';

export interface PricingInput {
  customer: { type: CustomerType; country: Country; firstOrder: boolean };
  product: { category: Category; unitPrice: Minor };
  quantity: number;
  contract: Contract;
  promoCode: string | null;
}

/** One line of the explanation: which rule fired and what it did to the amount. */
export interface AppliedRule {
  rule: string;
  stage?: string;
  effect: string;
  before?: Minor;
  after?: Minor;
}

export type DomainEvent =
  | { type: 'OrderRejected'; reason: string }
  | { type: 'LargeOrderPriced'; total: Minor }
  | { type: 'VipOrderPriced' };

export type Decision =
  | { eligible: false; reason: string; applied: AppliedRule[]; events: DomainEvent[] }
  | {
      eligible: true;
      contract: Contract; // effective contract after normalisation
      list: Minor;
      net: Minor;
      tax: Minor;
      shipping: Minor;
      total: Minor;
      loyaltyPoints: number;
      applied: AppliedRule[];
      events: DomainEvent[];
    };
