// The test that would have caught the incident: concurrent requests from different tenants,
// every response checked for foreign rows. Needs the database (`npm run db:up && npm run setup`).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { burst, startVariant } from '../dist/harness.js';

async function run(variant, rounds, concurrency) {
  const app = await startVariant(variant);
  try { return await burst(app.port, rounds, concurrency); } finally { await app.stop(); }
}

for (const variant of ['explicit', 'request', 'als', 'cls', 'durable', 'rls']) {
  test(`${variant}: 0 cross-tenant responses under concurrency`, async () => {
    const r = await run(variant, 10, 30);
    assert.equal(r.total, 300);
    assert.equal(r.errors, 0);
    assert.equal(r.wrongCount, 0, 'each tenant must get exactly its 5 rows');
    assert.equal(r.leaks, 0);
  });
}

// The same test is not vacuous: it goes red on the original design...
test('singleton tenantId field: the concurrent test detects the leak', async () => {
  const r = await run('singleton', 10, 30);
  assert.ok(r.leaks > 0, `expected leaks, got ${JSON.stringify(r)}`);
});

// ...and RLS fed from the same racy field enforces the wrong tenant.
test('RLS does not fix a wrong tenant source', async () => {
  const r = await run('rls-singleton', 10, 30);
  assert.ok(r.leaks > 0, `expected leaks, got ${JSON.stringify(r)}`);
});

// Why the bug survives ordinary tests: one request at a time never leaks.
test('singleton tenantId field: sequential requests never show the bug', async () => {
  const r = await run('singleton', 100, 1);
  assert.equal(r.leaks, 0);
});
