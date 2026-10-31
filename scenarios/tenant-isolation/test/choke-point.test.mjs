// The tenant-scoped repository cannot be constructed without a verified TenantId.
// No database needed: the guard is in the constructor, before any query.
import 'reflect-metadata';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TenantId } from '../dist/shared.js';
import { TenantScopedOrders } from '../dist/variants/explicit.js';

const fakeDb = { query: async () => [] };

test('TenantId only from a verified user with a positive integer tenant', () => {
  assert.equal(TenantId.fromUser({ tenantId: 7 }).value, 7);
  for (const bad of [undefined, { tenantId: 0 }, { tenantId: -1 }, { tenantId: '7' }, { tenantId: 1.5 }]) {
    assert.throws(() => TenantId.fromUser(bad), /no verified tenant/);
  }
});

test('TenantScopedOrders rejects anything that is not a TenantId', () => {
  for (const bad of [undefined, 7, { value: 7 }, Object.create(null)]) {
    assert.throws(() => new TenantScopedOrders(fakeDb, bad), /requires a TenantId/);
  }
  assert.doesNotThrow(() => new TenantScopedOrders(fakeDb, TenantId.fromUser({ tenantId: 1 })));
});

test('TenantId is immutable', () => {
  const t = TenantId.fromUser({ tenantId: 1 });
  assert.throws(() => { t.value = 2; }, TypeError);
});
