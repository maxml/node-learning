'use strict';
// Changes a module-level singleton and does not restore it.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const registry = require('../src/registry');

test('a: switches currency to EUR for its own scenario', () => {
  registry.set('currency', 'EUR');
  assert.equal(registry.get('currency'), 'EUR');
});
