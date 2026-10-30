'use strict';
// Assumes the default; passes alone and under process isolation, fails after isolation-a in one process.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const registry = require('../src/registry');

test('b: default currency is UAH', () => {
  assert.equal(registry.get('currency'), 'UAH');
});
