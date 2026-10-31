'use strict';
// Second-pass independent counterexamples (Antigravity factcheck).
// Run: node 13-factcheck-agy.js
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const v8 = require('node:v8');
const _ = require('lodash');

console.log(`# independent factcheck (agy), node ${process.version}, V8 ${process.versions.v8}, lodash ${_.VERSION}`);

// 1. 'abc'.length is an OWN virtual property of the String exotic wrapper (§10.4.3), NOT on String.prototype
{
  const wrapped = Object('abc');
  const desc = Object.getOwnPropertyDescriptor(wrapped, 'length');
  assert.deepEqual(desc, { value: 3, writable: false, enumerable: false, configurable: false });
  assert.equal(Object.hasOwn(wrapped, '0'), true);
  assert.equal(String.prototype.length, 0);
  assert.equal(Object.hasOwn(wrapped, 'toUpperCase'), false);
  assert.equal(Object.hasOwn(String.prototype, 'toUpperCase'), true);
  console.log('String wrapper: length/indices are own props (String.prototype.length=0); methods are on prototype');
}

// 2. Symbol and BigInt wrappers: Symbol(sym) throws, BigInt(10n) is primitive; Object(x) creates the ToObject wrapper
{
  const sym = Symbol('a');
  assert.throws(() => Symbol(sym), TypeError);
  assert.equal(typeof BigInt(10n), 'bigint');
  assert.equal(typeof Object(sym), 'object');
  assert.equal(Object(sym) instanceof Symbol, true);
  assert.equal(typeof Object(10n), 'object');
  assert.equal(Object(10n) instanceof BigInt, true);
  console.log('ToObject wrappers: Symbol(sym) throws; BigInt(10n)=bigint; Object(sym)/Object(10n) wrap');
}

// 3. typeof x === 'object' && x !== null excludes functions/classes; Object(x) === x includes all language objects
{
  const isNonNullObjectTypeof = (x) => x !== null && typeof x === 'object';
  const isLanguageObject = (x) => Object(x) === x;
  const fn = () => {};
  class C {}
  assert.equal(isNonNullObjectTypeof(fn), false);
  assert.equal(isNonNullObjectTypeof(C), false);
  assert.equal(isLanguageObject(fn), true);
  assert.equal(isLanguageObject(C), true);
  for (const p of [undefined, null, false, 0, 0n, '', Symbol('p')]) {
    assert.equal(isLanguageObject(p), false);
  }
  console.log('object check: typeof excludes functions/classes; Object(x)===x matches all objects only');
}

// 4. Both Set and Map canonicalize -0 to +0 via CanonicalizeKeyedCollectionKey (§24.5.1)
{
  const s = new Set([-0]);
  const storedInSet = [...s][0];
  assert.equal(Object.is(storedInSet, -0), false);
  assert.equal(Object.is(storedInSet, +0), true);
  console.log('CanonicalizeKeyedCollectionKey: Set([-0]) also stores +0, not -0');
}

// 5. lodash 4.18.1 _.cloneDeep pitfalls: shares Buffer memory (!), turns Error into {}, breaks #private fields
{
  const orig = { payload: Buffer.from([10, 20]) };
  const deep = _.cloneDeep(orig);
  assert.notEqual(deep.payload, orig.payload);
  deep.payload[0] = 77;
  assert.equal(orig.payload[0], 77); // shared underlying ArrayBuffer via Buffer.prototype.slice()!

  const v8Copy = v8.deserialize(v8.serialize(orig));
  v8Copy.payload[0] = 88;
  assert.equal(orig.payload[0], 77); // independent Buffer

  const errClone = _.cloneDeep(new Error('boom'));
  assert.deepEqual(errClone, {});
  assert.equal(errClone instanceof Error, false);

  class SecretHolder {
    #secret = 42;
    read() { return this.#secret; }
  }
  const shClone = _.cloneDeep(new SecretHolder());
  assert.equal(shClone instanceof SecretHolder, true);
  assert.throws(() => shClone.read(), TypeError);
  console.log('lodash.cloneDeep: shares Buffer memory, Error->{}, class #private throws TypeError');
}

// 6. JSON round-trip: object props vanish, array items become null, top-level undefined throws SyntaxError
{
  assert.equal(JSON.stringify({ u: undefined, f() {}, s: Symbol('k') }), '{}');
  assert.equal(JSON.stringify([undefined, () => {}, Symbol('k')]), '[null,null,null]');
  assert.throws(() => JSON.parse(JSON.stringify(undefined)), SyntaxError);
  console.log('JSON round-trip: object props omitted, array->[null,null,null], top-level undefined->SyntaxError');
}

// 7. Object.freeze throws on non-empty TypedArray/Buffer and does not freeze #private fields
{
  assert.doesNotThrow(() => Object.freeze(new Uint8Array(0)));
  assert.throws(() => Object.freeze(new Uint8Array(1)), TypeError);
  assert.throws(() => Object.freeze(Buffer.from([1])), TypeError);

  class Counter {
    #n = 0;
    inc() { return ++this.#n; }
  }
  const frozenCounter = Object.freeze(new Counter());
  assert.equal(Object.isFrozen(frozenCounter), true);
  assert.equal(frozenCounter.inc(), 1);
  console.log('Object.freeze: throws on non-empty Buffer/TypedArray; #private fields stay mutable');
}

// 8. Article claim "primitives === iff same value": NaN === NaN is false; +0 === -0 is true despite Object.is false
{
  const a = NaN, b = NaN;
  assert.equal(a === b, false);
  assert.equal(Object.is(a, b), true);
  assert.equal(+0 === -0, true);
  assert.equal(Object.is(+0, -0), false);
  console.log('primitive === edge cases: NaN===NaN is false; +0===-0 is true while Object.is is false');
}

// 9. V8 string representations & ConsString flattening (--allow-natives-syntax in child process)
{
  const v8Probe = spawnSync(process.execPath, [
    '--allow-natives-syntax',
    '-e',
    `
      const assert = require('node:assert/strict');
      console.log('#latin1'); %DebugPrint('hello');
      console.log('#cyrillic'); %DebugPrint('привіт');
      const shortA = 'abcdef', shortB = 'ghijkl'; // 6 + 6 = 12 < ConsString::kMinLength (13)
      console.log('#short12'); %DebugPrint(shortA + shortB);
      const longA = 'abcdef', longB = 'ghijklm'; // 6 + 7 = 13 >= 13
      console.log('#long13'); %DebugPrint(longA + longB);

      const makeCons = () => 'abcdefghij'.repeat(5) + 'klmnopqrst'.repeat(5);
      const c1 = makeCons();
      assert.equal(%StringIsFlat(c1), false);
      assert.equal(c1.length, 100);
      assert.equal(%StringIsFlat(c1), false); // reading .length does NOT flatten

      const c2 = makeCons();
      assert.equal(c2[0], 'a');
      assert.equal(%StringIsFlat(c2), true); // indexing flattens in-place

      const c3 = makeCons();
      assert.equal(c3.charCodeAt(55), 'p'.charCodeAt(0));
      assert.equal(%StringIsFlat(c3), true);
      console.log('#flatChecksOk');
    `,
  ], { encoding: 'utf8' });
  assert.equal(v8Probe.status, 0, v8Probe.stderr);
  const out = v8Probe.stdout + v8Probe.stderr;
  const typeAfter = (marker) => {
    const slice = out.slice(out.indexOf(marker));
    const m = slice.match(/- type: ([A-Z0-9_]+)/);
    return m ? m[1] : null;
  };
  assert.equal(typeAfter('#latin1'), 'INTERNALIZED_ONE_BYTE_STRING_TYPE');
  assert.equal(typeAfter('#cyrillic'), 'INTERNALIZED_TWO_BYTE_STRING_TYPE');
  assert.equal(typeAfter('#short12'), 'SEQ_ONE_BYTE_STRING_TYPE');
  assert.equal(typeAfter('#long13'), 'CONS_ONE_BYTE_STRING_TYPE');
  assert.equal(out.includes('#flatChecksOk'), true);
  console.log('V8 strings: Latin1=ONE_BYTE, Cyrillic=TWO_BYTE; len12=SEQ, len13=CONS; .length stays unflat, [0]/charCodeAt flatten');
}

console.log('all agy factcheck assertions passed');
