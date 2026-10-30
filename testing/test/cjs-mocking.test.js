'use strict';
// CommonJS: patching a property of module.exports works only for callers that look the
// property up at call time. "Mock where it is used, not where it is defined."
const { test } = require('node:test');
const assert = require('node:assert/strict');
const mailer = require('../src/cjs/mailer');
const notify = require('../src/cjs/notify');

test('mock.method on module.exports reaches mailer.send(...) callers', async (t) => {
  t.mock.method(mailer, 'send', async () => 'sent');
  assert.equal(await notify.notifyViaObject('a@example.test'), 'sent');
  assert.equal(mailer.send.mock.callCount(), 1);
});

test('...but not callers that destructured send at require time', async (t) => {
  t.mock.method(mailer, 'send', async () => 'sent');
  await assert.rejects(notify.notifyViaDestructured('a@example.test'), /real mailer called/);
  assert.equal(mailer.send.mock.callCount(), 0);
});
