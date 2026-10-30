// Runs as-is under Node 24 type stripping: `node --test test/typed.test.ts`.
// Types are erased, NOT checked: the wrong annotation below is never reported.
// Type checking is a separate step (tsc --noEmit).
//
// A .ts file follows the nearest package.json "type" exactly like .js. This package is
// "type": "commonjs", so `import ... from` in a .ts file fails with
// "Cannot use import statement outside a module"; use require() here, or name the file
// .mts, or set "type": "module".
const { test } = require('node:test');
const assert = require('node:assert/strict');

type Money = { amount: number; currency: 'UAH' | 'EUR' };

function add(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error('currency mismatch');
  return { amount: a.amount + b.amount, currency: a.currency };
}

test('erasable TypeScript runs without a build step', () => {
  const wrong: string = 42 as unknown as string; // a type lie: stripping does not care
  assert.equal(typeof wrong, 'number');
  assert.deepEqual(add({ amount: 1, currency: 'UAH' }, { amount: 2, currency: 'UAH' }), { amount: 3, currency: 'UAH' });
});
