// Input matrix for the golden master: every combination of the dimensions the
// legacy method branches on, plus quantity boundaries found by mutation testing.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { FakeDb, FakeNotifier, type Seed } from '../../src/infra/fakes.ts';
import type { Category, Contract, Country, CustomerType, PriceResult } from '../../src/infra/ports.ts';

export interface Combo {
  type: CustomerType;
  country: Country;
  category: Category;
  contract: Contract;
  promo: string | null;
  quantity: number;
  firstOrder: boolean;
}

const QUANTITIES: Record<string, number[]> = {
  // dimension values only: what a first golden master usually looks like
  coarse: [1, 10, 50],
  // + the boundaries the surviving mutants pointed at
  full: [1, 9, 10, 20, 21, 49, 50],
};

export type MatrixName = 'coarse' | 'full';
export const MATRIX: MatrixName = process.env.MATRIX === 'coarse' ? 'coarse' : 'full';

export const DIMENSIONS = {
  type: ['retail', 'business', 'vip'] as CustomerType[],
  country: ['UA', 'PL', 'DE', 'US'] as Country[],
  category: ['software', 'hardware', 'service'] as Category[],
  contract: ['none', 'annual', 'multiYear'] as Contract[],
  promo: [null, 'WELCOME10', 'BULK', 'BLACKFRIDAY', 'EXPIRED2019'] as (string | null)[],
  firstOrder: [true, false],
};

export const PRICES: Record<Category, number> = { software: 4999, hardware: 12999, service: 8350 };

export function* combos(matrix: MatrixName = MATRIX): Generator<Combo> {
  const d = DIMENSIONS;
  for (const type of d.type)
    for (const country of d.country)
      for (const category of d.category)
        for (const contract of d.contract)
          for (const promo of d.promo)
            for (const quantity of QUANTITIES[matrix])
              for (const firstOrder of d.firstOrder)
                yield { type, country, category, contract, promo, quantity, firstOrder };
}

export const keyOf = (c: Combo): string =>
  [c.type, c.country, c.category, c.contract, c.promo ?? '-', `q${c.quantity}`, c.firstOrder ? 'first' : 'repeat'].join('|');

export function seedFor(c: Combo): Seed {
  return {
    customers: [{ id: 'c1', type: c.type, country: c.country, email: 'c1@example.com', ordersCount: c.firstOrder ? 0 : 3, loyaltyPoints: 100 }],
    products: [{ id: 'p1', category: c.category, priceCents: PRICES[c.category] }],
    orders: [{ id: 'o1', customerId: 'c1', productId: 'p1', quantity: c.quantity, contract: c.contract, promoCode: c.promo, status: 'new' }],
  };
}

// Numeric boundaries that list prices × quantities never hit exactly; added after
// mutation testing showed `<` vs `<=` mutants surviving there. Plus a missing order.
function custom(c: Combo, priceCents: number, orderId = 'o1'): Seed {
  const s = seedFor(c);
  s.products[0].priceCents = priceCents;
  s.orders[0].id = orderId;
  return s;
}
const plain: Combo = { type: 'retail', country: 'US', category: 'software', contract: 'none', promo: null, quantity: 1, firstOrder: false };
export const BOUNDARY_CASES: { key: string; seed: Seed }[] = [
  { key: 'edge|UA hardware net=20000 (free shipping from)', seed: custom({ ...plain, country: 'UA', category: 'hardware' }, 20000) },
  { key: 'edge|UA hardware net=19999', seed: custom({ ...plain, country: 'UA', category: 'hardware' }, 19999) },
  { key: 'edge|US total=100000 (large-order alert above)', seed: custom(plain, 100000) },
  { key: 'edge|US total=100001', seed: custom(plain, 100001) },
  { key: 'edge|order not found', seed: custom(plain, 4999, 'other-order') },
];

export function* cases(matrix: MatrixName = MATRIX): Generator<{ key: string; seed: Seed }> {
  for (const c of combos(matrix)) yield { key: keyOf(c), seed: seedFor(c) };
  if (matrix === 'full') yield* BOUNDARY_CASES;
}

export interface Subject {
  price(orderId: string): Promise<PriceResult>;
  /** runs after the call, e.g. the outbox relay */
  after?(): Promise<unknown>;
}
export type SubjectFactory = (db: FakeDb, notifier: FakeNotifier) => Subject;

/** Everything observable from outside: return value, persisted rows, sent messages. */
export async function observe(seed: Seed, make: SubjectFactory) {
  const db = new FakeDb(seed);
  const notifier = new FakeNotifier();
  const subject = make(db, notifier);
  let result: unknown;
  try {
    result = await subject.price('o1');
  } catch (err) {
    result = { error: (err as Error).message };
  }
  await subject.after?.();
  return {
    result,
    order: db.state.orders.get('o1'),
    customer: db.state.customers.get('c1'),
    notifications: notifier.sent,
  };
}

// One JSON line per combination of the full matrix, gzipped (4.1 MB of text, ~120 kB
// compressed). The coarse matrix is a subset and reads the same file.
// `npm run golden:show -- <grep pattern>` prints matching lines for review.
export const GOLDEN_PATH = new URL('../golden/pricing.golden.jsonl.gz', import.meta.url);

export function readGolden(): Map<string, string> {
  const lines = gunzipSync(readFileSync(GOLDEN_PATH)).toString('utf8').trim().split('\n');
  return new Map(lines.map((l) => {
    const { k, o } = JSON.parse(l);
    return [k, JSON.stringify(o)];
  }));
}

export async function compareAll(make: SubjectFactory) {
  const golden = readGolden();
  const diffs: { key: string; expected: string; actual: string }[] = [];
  let compared = 0;
  let missing = 0;
  for (const { key: k, seed } of cases()) {
    const actual = JSON.stringify(await observe(seed, make));
    const expected = golden.get(k);
    compared++;
    if (expected === undefined) missing++;
    if (expected !== actual) diffs.push({ key: k, expected: expected ?? '<missing>', actual });
  }
  return { compared, missing, diffs };
}
