// Practices that rest on runtime behaviour: strict mode, Error objects vs thrown strings,
// error cause, defensive copies at boundaries. Run: node 01-strict-and-errors.js
// This file is CommonJS (sloppy by default); the strict parts run inside functions with 'use strict'.

// 1. Implicit globals: sloppy mode silently creates a global, strict mode throws.
function sloppy() { totl = 1; } // typo of `total`
sloppy();
console.log('sloppy: typo created globalThis.totl =', globalThis.totl);
function strict() { 'use strict'; totall = 1; }
try { strict(); } catch (e) { console.log('strict: typo ->', e.constructor.name + ':', e.message); }

// 2. Silent failures become exceptions in strict mode.
const frozen = Object.freeze({ a: 1 });
(function () { frozen.a = 2; })();
console.log('sloppy write to frozen: no error, value still', frozen.a);
try { (function () { 'use strict'; frozen.a = 2; })(); } catch (e) { console.log('strict write to frozen ->', e.constructor.name); }
console.log('sloppy this in plain call:', typeof (function () { return this; })(), '| strict:', (function () { 'use strict'; return this; })());

// 3. throw 'string' loses the stack and breaks `instanceof Error` checks.
function failWithString() { throw 'db down'; } // eslint-disable-line no-throw-literal
try { failWithString(); } catch (e) {
  console.log('thrown string: typeof', typeof e, '| stack:', e.stack, '| instanceof Error:', e instanceof Error);
}

// 4. Error cause (ES2022) keeps the low-level error when re-throwing with context.
function readConfig() {
  try { JSON.parse('{bad json'); } catch (err) {
    throw new Error('config: cannot parse settings.json', { cause: err });
  }
}
try { readConfig(); } catch (e) {
  console.log('wrapped:', e.message, '| cause:', e.cause.constructor.name + ':', e.cause.message.split('\n')[0]);
}

// 5. Error.isError (ES2026) vs instanceof across realms (vm context = another realm, like an iframe).
const vm = require('node:vm');
const foreign = vm.runInNewContext('new Error("from another realm")');
console.log('foreign instanceof Error:', foreign instanceof Error,
  '| Error.isError(foreign):', typeof Error.isError === 'function' ? Error.isError(foreign) : 'n/a');

// 6. Defensive copy at a boundary: the caller keeps a reference and mutates it later.
class Order {
  #items;
  constructor(items) { this.#items = structuredClone(items); }   // copy IN
  get items() { return structuredClone(this.#items); }            // copy OUT
}
const input = [{ sku: 'A', qty: 1 }];
const order = new Order(input);
input[0].qty = 999;               // caller mutates its own array later
order.items[0].qty = 500;         // reader mutates what it got
console.log('order still has qty:', order.items[0].qty);
const src = { nested: { qty: 1 } };
const copy = { ...src };
console.log('spread is shallow: copy.nested === src.nested ->', copy.nested === src.nested);
