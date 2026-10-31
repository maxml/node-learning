// The business rules as data. Each table is read top to bottom; inside a stage the
// first matching row wins (DMN hit policy FIRST), and stages run in array order,
// each discount applied to the result of the previous one. That order IS the
// promo-stacking policy: change it here, nowhere else.
import type { Country } from '../infra/ports.ts';
import type { MoneyPolicy } from './money.ts';
import { legacyMoney } from './money.ts';
import type { PricingInput } from './model.ts';
import {
  all, any, categoryIs, contractIs, countryIs, customerIs, firstOrder, not,
  promoIs, quantityAtLeast, type Spec,
} from './spec.ts';

export interface EligibilityRow { id: string; when: Spec }
export interface DiscountRow { id: string; when: Spec; percent: number }
export interface DiscountStage { stage: string; rows: DiscountRow[] }

export interface PricingPolicy {
  eligibility: EligibilityRow[];
  stages: DiscountStage[];
  /** net never drops below list * (10000 - maxDiscountBp) / 10000 */
  maxDiscountBp: number;
  vatBp: Record<Country, number>;
  money: MoneyPolicy;
}

export const ELIGIBILITY: EligibilityRow[] = [
  { id: 'HARDWARE_EXPORT', when: all(countryIs('US'), categoryIs('hardware'), not(customerIs('business'))) },
  { id: 'SERVICE_NOT_AVAILABLE', when: all(countryIs('DE'), categoryIs('service'), customerIs('retail')) },
  { id: 'QUANTITY_LIMIT', when: all(categoryIs('hardware'), customerIs('retail'), quantityAtLeast(21)) },
];

// Contract discounts do not stack with BLACKFRIDAY, except on services.
const contractDiscountAllowed: Spec = all(
  not(categoryIs('hardware')),
  any(not(promoIs('BLACKFRIDAY')), categoryIs('service')),
);

export const DISCOUNT_STAGES: DiscountStage[] = [
  {
    stage: 'customer',
    rows: [
      { id: 'customer.vip', when: customerIs('vip'), percent: 15 },
      { id: 'customer.business.volume', when: all(customerIs('business'), quantityAtLeast(10)), percent: 8 },
      { id: 'customer.business', when: customerIs('business'), percent: 3 },
    ],
  },
  {
    stage: 'partner',
    rows: [
      {
        id: 'partner.pl-software-annual',
        when: all(customerIs('business'), countryIs('PL'), categoryIs('software'), contractIs('annual')),
        percent: 2,
      },
    ],
  },
  {
    stage: 'contract',
    rows: [
      { id: 'contract.annual', when: all(contractDiscountAllowed, contractIs('annual')), percent: 5 },
      { id: 'contract.multiYear', when: all(contractDiscountAllowed, contractIs('multiYear')), percent: 10 },
    ],
  },
  {
    stage: 'promo',
    rows: [
      { id: 'promo.welcome10', when: all(promoIs('WELCOME10'), firstOrder, customerIs('retail')), percent: 10 },
      { id: 'promo.bulk.vip50', when: all(promoIs('BULK'), customerIs('vip'), quantityAtLeast(50)), percent: 5 },
      { id: 'promo.bulk.50', when: all(promoIs('BULK'), not(customerIs('vip')), quantityAtLeast(50)), percent: 12 },
      { id: 'promo.bulk.10', when: all(promoIs('BULK'), not(customerIs('vip')), quantityAtLeast(10)), percent: 6 },
      { id: 'promo.blackfriday.hardware', when: all(promoIs('BLACKFRIDAY'), categoryIs('hardware')), percent: 10 },
      { id: 'promo.blackfriday', when: promoIs('BLACKFRIDAY'), percent: 20 },
    ],
  },
];

// Strategy per country, as a map. A new country is a compile error until it has a rate.
export const VAT_BP: Record<Country, number> = { UA: 2000, PL: 2300, DE: 1900, US: 0 };

export const DEFAULT_POLICY: PricingPolicy = {
  eligibility: ELIGIBILITY,
  stages: DISCOUNT_STAGES,
  maxDiscountBp: 3500,
  vatBp: VAT_BP,
  money: legacyMoney,
};

// Rules that are plain branching read better as guard clauses than as tables.

export function shippingFor(i: PricingInput, net: number): number {
  if (i.product.category !== 'hardware') return 0;
  if (i.customer.type === 'vip') return 0;
  if (i.customer.country !== 'UA') return 1500;
  return net < 20000 ? 500 : 0;
}

export function loyaltyPointsFor(i: PricingInput, total: number): number {
  if (i.customer.type === 'retail') return 0;
  const points = Math.floor(total / 1000);
  return i.customer.type === 'vip' ? points * 2 : points;
}

export const LARGE_ORDER_THRESHOLD = 100000;
