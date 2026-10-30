'use strict';
// Order-dependent tests: the second test relies on state left by the first.
// Green in declaration order, red under --test-randomize (Node >= 24.16) with some seeds.
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const cart = []; // shared mutable fixture at module level: the defect

describe('cart', () => {
  it('adds an item', () => {
    cart.push({ sku: 'A', qty: 1 });
    assert.equal(cart.length, 1);
  });
  it('total counts the item added above', () => {
    assert.equal(cart.reduce((s, i) => s + i.qty, 0), 1);
  });
  it('clear empties the cart', () => {
    cart.length = 0;
    assert.equal(cart.length, 0);
  });
});
