'use strict';
// Equality algorithms (IsStrictlyEqual, IsLooselyEqual, SameValue, SameValueZero) and copying.
// Run: node 02-equality-and-copying.js

const log = (label, value) => console.log(label.padEnd(46), value);
const show = (v) => {
  try { return JSON.stringify(v); } catch (e) { return `${e.constructor.name}: ${e.message.split('\n')[0]}`; }
};

console.log('--- 1. NaN and -0 under the four equality algorithms ---');
log('NaN === NaN', NaN === NaN);
log('Object.is(NaN, NaN)', Object.is(NaN, NaN));
log('0 === -0', 0 === -0);
log('Object.is(0, -0)', Object.is(0, -0));
log('[NaN].indexOf(NaN)  (===)', [NaN].indexOf(NaN));
log('[NaN].includes(NaN) (SameValueZero)', [NaN].includes(NaN));
log('new Set([0, -0, NaN, NaN]).size', new Set([0, -0, NaN, NaN]).size);
const m = new Map([[-0, 'zero']]);
log('new Map([[-0,...]]).keys() -> Object.is(k, -0)', Object.is([...m.keys()][0], -0));
log('1 / -0', 1 / -0);

console.log('\n--- 2. null and undefined under == ---');
log('null == undefined', null == undefined);
log('null == 0', null == 0);
log('null >= 0  (relational uses ToNumber)', null >= 0);
log('undefined == 0', undefined == 0);
log('x == null catches both', [null, undefined, 0, '', false].map((x) => x == null).join(','));

console.log('\n--- 3. shallow copies share nested objects ---');
const src = { name: 'a', nested: { n: 1 }, list: [1] };
const spread = { ...src };
const assigned = Object.assign({}, src);
src.nested.n = 2;
src.list.push(2);
log('spread.nested.n after src.nested.n = 2', spread.nested.n);
log('assigned.list after src.list.push(2)', show(assigned.list));
log('spread.nested === src.nested', spread.nested === src.nested);
const symKey = Symbol('k');
let getterCalls = 0;
const withExtras = { [symKey]: 1, get g() { getterCalls += 1; return 'v'; } };
const spreadExtras = { ...withExtras };
log('spread copies symbol-keyed props', spreadExtras[symKey] === 1);
log('spread invokes getter, copy is a data prop', `${'value' in Object.getOwnPropertyDescriptor(spreadExtras, 'g')}, calls=${getterCalls}`);
const vm = require('node:vm');
const foreignArray = vm.runInNewContext('[1, 2]');
log('array from another realm: instanceof Array', foreignArray instanceof Array);
log('array from another realm: Array.isArray', Array.isArray(foreignArray));

console.log('\n--- 4. structuredClone: deep, keeps cycles/Date/Map, drops prototypes ---');
class User {
  constructor(name) { this.name = name; this.created = new Date(0); }
  greet() { return `hi ${this.name}`; }
}
const u = new User('ann');
u.self = u; // cycle
u.tags = new Map([['k', new Set([1])]]);
const c = structuredClone(u);
log('clone !== original', c !== u);
log('cycle preserved: c.self === c', c.self === c);
log('Date preserved: c.created instanceof Date', c.created instanceof Date);
log('Map/Set preserved', c.tags instanceof Map && c.tags.get('k') instanceof Set);
log('prototype lost: c instanceof User', c instanceof User);
log('typeof c.greet', typeof c.greet);
for (const [label, value] of [
  ['function', { f() {} }],
  ['symbol value', { s: Symbol('x') }],
  ['WeakMap', new WeakMap()],
  ['Promise', Promise.resolve(1)],
]) {
  try {
    structuredClone(value);
    log(`structuredClone(${label})`, 'ok');
  } catch (e) {
    log(`structuredClone(${label})`, `${e.name}`);
  }
}
const withSymKey = { [Symbol('k')]: 1, visible: 1 };
log('symbol-keyed props survive clone?', Object.getOwnPropertySymbols(structuredClone(withSymKey)).length > 0);
const withGetter = { get now() { return 'computed'; } };
log('getter becomes data property', Object.getOwnPropertyDescriptor(structuredClone(withGetter), 'now').value);
log('Error clone keeps class', structuredClone(new TypeError('bad')) instanceof TypeError);

console.log('\n--- 5. JSON round trip: what is lost ---');
const lossy = {
  u: undefined,
  f() {},
  s: Symbol('x'),
  d: new Date(0),
  m: new Map([['a', 1]]),
  set: new Set([1]),
  nan: NaN,
  inf: Infinity,
  negZero: -0,
  arr: [undefined, () => 1, Symbol('y')],
  re: /x/g,
};
log('JSON.stringify(lossy)', JSON.stringify(lossy));
log('typeof JSON.parse(...).d', typeof JSON.parse(JSON.stringify(lossy)).d);
log('JSON.stringify({ big: 1n })', show({ big: 1n }));
const cyc = {};
cyc.self = cyc;
log('JSON.stringify(cycle)', show(cyc));
log('JSON.stringify(undefined)', JSON.stringify(undefined));

console.log('\n--- 6. node:v8 serialize (structured clone format) ---');
const v8 = require('node:v8');
const back = v8.deserialize(v8.serialize({ d: new Date(0), m: new Map([[1, 2]]), b: 10n }));
log('v8 round trip keeps Date, Map, BigInt', back.d instanceof Date && back.m.get(1) === 2 && back.b === 10n);
