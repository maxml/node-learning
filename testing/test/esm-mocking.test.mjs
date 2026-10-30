// Why mocking ES modules is harder than CommonJS, and what node:test mock.module does.
// Run without the flag:  node --test test/esm-mocking.test.mjs
// Run with module mocks: node --test --experimental-test-module-mocks test/esm-mocking.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as clock from '../src/esm/clock.mjs';
import { greet as greetStatic } from '../src/esm/greeting.mjs';

const flag = process.execArgv.includes('--experimental-test-module-mocks');
const clockUrl = new URL('../src/esm/clock.mjs', import.meta.url).href;
const greetingUrl = new URL('../src/esm/greeting.mjs', import.meta.url).href;

test('a module namespace object cannot be patched (mock.method throws)', (t) => {
  const desc = Object.getOwnPropertyDescriptor(clock, 'hour');
  t.diagnostic(`namespace 'hour' descriptor: writable=${desc.writable} configurable=${desc.configurable}; frozen-like: isExtensible=${Object.isExtensible(clock)}`);
  assert.throws(() => t.mock.method(clock, 'hour', () => 9), (err) => {
    t.diagnostic(`mock.method on namespace: ${err.name}: ${err.message}`);
    return err instanceof TypeError;
  });
});

test('mock.module exists only with the flag', (t) => {
  t.diagnostic(`flag=${flag} typeof t.mock.module=${typeof t.mock.module}`);
});

test('mock.module: modules linked before the mock keep the real dependency', { skip: !flag && 'needs --experimental-test-module-mocks' }, async (t) => {
  // `namedExports` is the option Node 24.14 understands. Node 24.15+ adds `exports`
  // and deprecates `namedExports`; on 24.14 an `exports` option is silently ignored
  // and the mock has no exports at all (SyntaxError on link). Early-development API.
  const m = t.mock.module(clockUrl, { namedExports: { hour: () => 9 } });

  // greeting.mjs was linked by the static import at the top of this file: unaffected.
  const staticResult = greetStatic('Ann');
  // A plain dynamic import returns the SAME cached greeting.mjs instance: also unaffected.
  const cached = await import(greetingUrl);
  // A fresh instance (cache-busting query) is linked now, against the mock.
  const fresh = await import(`${greetingUrl}?mocked`);

  t.diagnostic(`static import: "${staticResult}" | cached dynamic: "${cached.greet('Ann')}" | fresh: "${fresh.greet('Ann')}"`);
  assert.equal(fresh.greet('Ann'), 'Good morning, Ann');
  assert.equal(cached.greet, greetStatic);
  m.restore();
});
