'use strict';
// WEAK on purpose: 100% line, branch and function coverage, yet it pins almost nothing.
// Coverage proves the lines RAN, not that a wrong result would be NOTICED.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { discount } = require('../src/discount');

test('member with a big order gets some discount', () => {
  assert.ok(discount(150, true) < 150);
});

test('non-member pays something', () => {
  assert.ok(discount(50, false) > 0);
});
