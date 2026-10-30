'use strict';
// Async pitfalls. Every test here is WRONG on purpose; the point is what the runner reports.
// Run: node --test --test-reporter=spec pitfalls/async.test.js ; echo "exit=$?"
const { test } = require('node:test');
const assert = require('node:assert/strict');

const resolvesFine = () => Promise.resolve(42);

test('1. forgotten await on assert.rejects', () => {
  // resolvesFine() does NOT reject, so this assertion fails, but nobody awaits it.
  assert.rejects(resolvesFine(), /never/);
});

test('2. assertion inside a callback that runs after the test returned', () => {
  setTimeout(() => assert.equal(1, 2), 10);
});

test('3. fire-and-forget rejection inside code under test', () => {
  const saveAudit = async () => { throw new Error('audit write failed'); };
  saveAudit(); // floating promise
  assert.ok(true);
});

test('4. correct: awaited assert.rejects fails the test itself', async () => {
  await assert.rejects(resolvesFine(), /never/);
});
