'use strict';
// Fake timers with node:test MockTimers (stable since Node 23.1).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { retry, sleep, sleepCaptured, sleepViaModule } = require('../src/retry');

// Let pending promise continuations run, so the code under test reaches its next setTimeout.
const flush = () => new Promise((resolve) => setImmediate(resolve));

test('retry: 3 attempts with 1 s + 2 s backoff finish without real waiting', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  let calls = 0;
  const fn = async () => { calls += 1; if (calls < 3) throw new Error('boom'); return 'ok'; };

  const started = performance.now();
  const p = retry(fn);
  await flush();
  assert.equal(calls, 1);

  // tick() by the SUM of the backoffs (1000 + 2000) is not enough: the second
  // setTimeout does not exist yet when tick() runs. It is created only after the
  // promise continuation runs, at fake time 3000, so it is due at 5000.
  t.mock.timers.tick(3000);
  await flush();
  assert.equal(calls, 2, 'after tick(3000) only the first backoff has fired');

  t.mock.timers.tick(2000);
  await flush();
  assert.equal(await p, 'ok');
  assert.equal(calls, 3);
  assert.equal(Date.now(), 5000, 'Date moves together with the mocked timers');
  const realMs = performance.now() - started;
  t.diagnostic(`real elapsed ms: ${realMs.toFixed(1)} (fake elapsed: 5000)`);
  assert.ok(realMs < 200);
});

test('which sleep implementations the mock intercepts', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const fired = {};
  sleep(1000).then(() => { fired.global = true; });
  sleepViaModule(1000).then(() => { fired.moduleProperty = true; });
  sleepCaptured(1000).then(() => { fired.capturedAtLoad = true; });
  t.mock.timers.tick(1000);
  for (let i = 0; i < 3; i++) await Promise.resolve();
  t.diagnostic(`fired after fake tick: ${JSON.stringify(fired)}`);
  assert.equal(fired.global, true);
  assert.equal(fired.moduleProperty, true);
  assert.equal(fired.capturedAtLoad, undefined, 'a reference taken before enable() is the real timer');
  t.mock.timers.reset(); // the real 1 s timer of sleepCaptured is still pending; let it run out
});

test('flush helper: setImmediate must stay real when it is used to drain promises', async () => {
  // Sanity check for the helper above (no mocks enabled in this test).
  await flush();
});
