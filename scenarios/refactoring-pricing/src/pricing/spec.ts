// Specification (Evans & Fowler): a named, composable predicate over the input.
// Rules below are built from these, so "who is eligible for what" reads as data.
import type { Category, Contract, Country, CustomerType } from '../infra/ports.ts';
import type { PricingInput } from './model.ts';

export type Spec = (i: PricingInput) => boolean;

export const all = (...specs: Spec[]): Spec => (i) => specs.every((s) => s(i));
export const any = (...specs: Spec[]): Spec => (i) => specs.some((s) => s(i));
export const not = (spec: Spec): Spec => (i) => !spec(i);

export const customerIs = (t: CustomerType): Spec => (i) => i.customer.type === t;
export const countryIs = (c: Country): Spec => (i) => i.customer.country === c;
export const categoryIs = (c: Category): Spec => (i) => i.product.category === c;
export const contractIs = (c: Contract): Spec => (i) => i.contract === c;
export const promoIs = (code: string): Spec => (i) => i.promoCode === code;
export const quantityAtLeast = (n: number): Spec => (i) => i.quantity >= n;
export const firstOrder: Spec = (i) => i.customer.firstOrder;
