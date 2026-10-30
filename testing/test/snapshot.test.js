'use strict';
// Snapshot testing in node:test (stable since Node 23.4). First run:
//   node --test --test-update-snapshots test/snapshot.test.js   (writes test/snapshot.test.js.snapshot)
// Later runs compare against the committed file.
const { test } = require('node:test');

function renderInvoice(order) {
  return {
    number: `INV-${order.id}`,
    lines: order.items.map((i) => `${i.qty} x ${i.sku} @ ${i.price}`),
    total: order.items.reduce((s, i) => s + i.qty * i.price, 0),
  };
}

test('invoice rendering is stable', (t) => {
  const order = { id: 7, items: [{ sku: 'A', qty: 2, price: 30 }, { sku: 'B', qty: 1, price: 40 }] };
  // Volatile fields (timestamps, random ids) must be removed or fixed before a snapshot,
  // otherwise every run differs and people learn to run --test-update-snapshots blindly.
  t.assert.snapshot(renderInvoice(order));
});
