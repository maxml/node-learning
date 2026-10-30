'use strict';
// Primitive vs object: identity, property access through ToObject, pass by sharing.
// Run: node 01-primitives-vs-objects.js

const log = (label, value) => console.log(label.padEnd(44), value);

console.log('--- 1. typeof for every language type ---');
const samples = [
  ['undefined', undefined],
  ['null', null],
  ['true', true],
  ['42', 42],
  ['42n', 42n],
  ["'s'", 's'],
  ["Symbol('x')", Symbol('x')],
  ['{}', {}],
  ['[]', []],
  ['function () {}', function () {}],
  ['class A {}', class A {}],
  ['new String("s")', new String('s')],
];
for (const [src, v] of samples) log(`typeof ${src}`, typeof v);

console.log('\n--- 2. identity: equal content is not the same object ---');
log("'abc' === 'ab' + 'c'", 'abc' === 'ab' + 'c');
log('{a:1} === {a:1}', { a: 1 } === { a: 1 });
const o = { a: 1 };
const alias = o;
alias.a = 2;
log('alias.a = 2 -> o.a', o.a);

console.log('\n--- 3. primitives have no own properties; access goes via ToObject ---');
const s = 'hello';
log('s.length', s.length);
log('Object.getPrototypeOf(s) === String.prototype', Object.getPrototypeOf(s) === String.prototype);
try {
  s.extra = 1; // strict mode: ToObject(s) creates a temporary wrapper, Set fails
  log('s.extra = 1 (strict)', 'no error');
} catch (e) {
  log('s.extra = 1 (strict)', `${e.constructor.name}: ${e.message}`);
}
log('s.extra afterwards', s.extra);
// Function() bodies are sloppy mode even inside a strict file
const sloppySet = Function('p', 'p.extra = 1; return p.extra;');
log('sloppy: p.extra = 1; p.extra', sloppySet('hello'));
String.prototype.whoAmI = function () { return typeof this; };
log("'x'.whoAmI() in strict mode (this not boxed)", 'x'.whoAmI());
String.prototype.whoAmISloppy = Function('return typeof this;');
log("'x'.whoAmISloppy() sloppy (this boxed)", 'x'.whoAmISloppy());
delete String.prototype.whoAmI;
delete String.prototype.whoAmISloppy;
try {
  null.foo;
} catch (e) {
  log('null.foo', `${e.constructor.name}: ${e.message}`);
}

console.log('\n--- 4. wrapper objects are objects ---');
const w = new String('a');
log("typeof new String('a')", typeof w);
log("new String('a') === 'a'", w === 'a');
log("new String('a') == 'a'", w == 'a');
log("new String('a') === new String('a')", new String('a') === new String('a'));
log('Boolean(new Boolean(false))', Boolean(new Boolean(false)));
log("typeof String(123) (no new = conversion)", typeof String(123));
try {
  new Symbol('x');
} catch (e) {
  log("new Symbol('x')", `${e.constructor.name}: ${e.message}`);
}
try {
  new BigInt(1);
} catch (e) {
  log('new BigInt(1)', `${e.constructor.name}: ${e.message}`);
}

console.log('\n--- 5. pass by sharing (call by sharing), not by reference ---');
function mutate(obj) { obj.touched = true; }
function reassign(obj) { obj = { replaced: true }; return obj; }
function bump(n) { n += 1; return n; }
const target = {};
mutate(target);
log('mutate(target) -> target', JSON.stringify(target));
reassign(target);
log('reassign(target) -> target', JSON.stringify(target));
let n = 1;
bump(n);
log('bump(n) -> n', n);
function swap(a, b) { const t = a; a = b; b = t; }
let x = { id: 'x' }, y = { id: 'y' };
swap(x, y);
log('swap(x, y) -> x.id, y.id', `${x.id}, ${y.id}`);

console.log('\n--- 6. const freezes the binding, not the value ---');
const cfg = { port: 80 };
cfg.port = 8080;
log('const cfg; cfg.port = 8080 -> cfg.port', cfg.port);
const frozen = Object.freeze({ inner: { v: 1 } });
frozen.inner.v = 2; // freeze is shallow
log('Object.freeze is shallow: frozen.inner.v', frozen.inner.v);
try {
  frozen.added = 1;
} catch (e) {
  log('frozen.added = 1 (strict)', `${e.constructor.name}`);
}

console.log('\n--- 7. collections compare objects by identity ---');
const m = new Map();
m.set({ id: 1 }, 'a');
log('map.get({id:1}) with a new literal', m.get({ id: 1 }));
const key = { id: 1 };
m.set(key, 'b');
log('map.get(sameKey)', m.get(key));
log('new Set([{a:1},{a:1}]).size', new Set([{ a: 1 }, { a: 1 }]).size);
log("new Set(['a','a']).size", new Set(['a', 'a']).size);
log('[{a:1}].includes({a:1})', [{ a: 1 }].includes({ a: 1 }));
const item = { a: 1 };
log('[item].includes(item)', [item].includes(item));
