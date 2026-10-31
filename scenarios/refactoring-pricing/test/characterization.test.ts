// Characterization test (Feathers): pins what the legacy method does today on the
// whole input matrix. It asserts current behaviour, not correct behaviour.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LegacyPricingService } from '../src/legacy/pricing.service.ts';
import { compareAll, MATRIX } from './support/matrix.ts';

test(`legacy matches the approved golden master (matrix=${MATRIX})`, async () => {
  const { missing, diffs, compared } = await compareAll((db, n) => {
    const svc = new LegacyPricingService(db, n);
    return { price: (id) => svc.calculatePrice(id) };
  });
  assert.equal(missing, 0, 'combinations without an approved golden line');
  assert.deepEqual(diffs.slice(0, 3), [], `${diffs.length} of ${compared} cases differ`);
});
