// The refactored shell + core must produce the same observable behaviour as the
// legacy golden master on every combination: result, persisted rows, messages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flushOutbox } from '../src/pricing/outbox-relay.ts';
import { PricingService } from '../src/pricing/pricing.service.ts';
import { compareAll, MATRIX } from './support/matrix.ts';

test(`refactored pricing is equivalent to legacy on the whole matrix (matrix=${MATRIX})`, async (t) => {
  const { compared, missing, diffs } = await compareAll((db, n) => {
    const svc = new PricingService(db);
    return { price: (id) => svc.price(id), after: () => flushOutbox(db, n) };
  });
  t.diagnostic(`compared ${compared} combinations, ${diffs.length} differ`);
  assert.equal(missing, 0);
  assert.deepEqual(diffs.slice(0, 3), [], `${diffs.length} of ${compared} cases differ`);
});
