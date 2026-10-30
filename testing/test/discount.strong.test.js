'use strict';
// STRONG: exact values and the boundary (99 / 100) on both sides of each condition.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { discount } = require('../src/discount');

const cases = [
  // [total, isMember, expected]
  [150, true, 135],
  [100, true, 90],    // boundary: >= not >
  [99, true, 99],
  [150, false, 150],  // member flag matters
  [50, false, 50],
];

for (const [total, isMember, expected] of cases) {
  test(`discount(${total}, ${isMember}) === ${expected}`, () => {
    assert.equal(discount(total, isMember), expected);
  });
}
