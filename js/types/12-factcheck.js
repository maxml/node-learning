// Independent counterexamples for the JavaScript types research package.
// Intentionally a sloppy CommonJS script; strict cases are explicit or in .mjs.
// Run: node 12-factcheck.js
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const v8 = require('node:v8');

async function main() {
  console.log(`# independent factcheck, node ${process.version}`);

  try {
    String.prototype.factcheckStrict = function () { 'use strict'; return typeof this; };
    String.prototype.factcheckSloppy = function () { return typeof this; };
    assert.equal('x'.factcheckStrict(), 'string');
    assert.equal('x'.factcheckSloppy(), 'object');
    console.log('method this: strict=string, sloppy=object');
  } finally {
    delete String.prototype.factcheckStrict;
    delete String.prototype.factcheckSloppy;
  }

  let valueOfCalls = 0;
  const hooked = {
    [Symbol.toPrimitive](hint) { assert.equal(hint, 'default'); return 7; },
    valueOf() { valueOfCalls++; return 1; },
  };
  assert.equal(hooked + 1, 8);
  assert.equal(valueOfCalls, 0);
  console.log('Symbol.toPrimitive wins: result=8, valueOf calls=0');

  const sloppyText = 'car';
  sloppyText[0] = 'b';
  assert.equal(sloppyText, 'car');
  class StrictWriter {
    write() { const text = 'car'; text[0] = 'b'; }
  }
  assert.throws(() => new StrictWriter().write(), TypeError);

  const url = pathToFileURL(path.join(__dirname, '12-esm-config.mjs')).href;
  const first = await import(url);
  const second = await import(url);
  assert.throws(first.writeStringIndex, TypeError);
  assert.equal(first, second);
  assert.equal(first.config, second.config);
  first.config.timeoutMs = 1;
  assert.equal(second.config.timeoutMs, 1);
  const otherUrl = await import(`${url}?instance=2`);
  assert.notEqual(first.config, otherUrl.config);
  assert.equal(otherUrl.config.timeoutMs, 5000);
  console.log('string index: sloppy=car, class=TypeError, ESM=TypeError');
  console.log('ESM: same URL shares mutation; different query has separate config');

  const configPath = require.resolve('./11-config.js');
  const cfg1 = require(configPath);
  cfg1.timeoutMs = 1;
  assert.equal(require(configPath), cfg1);
  delete require.cache[configPath];
  const cfg2 = require(configPath);
  assert.notEqual(cfg1, cfg2);
  assert.equal(cfg2.timeoutMs, 5000);
  console.log('CommonJS: same cache entry shares; cache deletion reloads config');

  const frozen = Object.freeze({ n: 1, inner: { n: 1 } });
  assert.throws(function () { 'use strict'; frozen.n = 2; }, TypeError);
  frozen.inner.n = 2;
  assert.equal(frozen.inner.n, 2);
  let backing = 0;
  const accessor = Object.freeze({ get n() { return backing; }, set n(v) { backing = v; } });
  accessor.n = 2;
  assert.equal(accessor.n, 2);
  const date = Object.freeze(new Date(0));
  date.setTime(1000);
  assert.equal(date.getTime(), 1000);
  const map = Object.freeze(new Map());
  map.set('k', 1);
  assert.equal(map.get('k'), 1);
  assert.equal(Object.isFrozen(accessor) && Object.isFrozen(date) && Object.isFrozen(map), true);
  console.log('freeze: data property locked; nested, accessor, Date and Map state can change');

  const invalid = new Date(NaN);
  assert.equal(invalid.getTime() === invalid.getTime(), false);
  assert.equal(invalid <= invalid, false);
  console.log('invalid Date: getTime equality=false, <=false');

  const a = Buffer.from([0x80]);
  const b = Buffer.from([0x81]);
  assert.equal(a.equals(b), false);
  assert.equal(a.toString() === b.toString(), true);
  assert.notEqual(a.toString('hex'), b.toString('hex'));
  console.log('Buffer key: UTF-8 can collide; hex distinguishes 80 and 81');

  const clonedBuffer = structuredClone(a);
  assert.equal(Buffer.isBuffer(clonedBuffer), false);
  assert.equal(clonedBuffer instanceof Uint8Array, true);
  assert.equal(Buffer.isBuffer(v8.deserialize(v8.serialize(a))), true);
  const shared = new SharedArrayBuffer(1);
  const sharedClone = structuredClone(shared);
  new Uint8Array(sharedClone)[0] = 42;
  assert.equal(new Uint8Array(shared)[0], 42);
  assert.throws(() => v8.serialize(shared), Error);
  console.log('cloning: structuredClone(Buffer)=Uint8Array; v8 round trip preserves Buffer');
  console.log('SharedArrayBuffer: structuredClone shares memory; v8.serialize throws');

  const weak = new WeakMap();
  const symbol = Symbol('k');
  weak.set(symbol, 1);
  weak.set(Symbol.iterator, 2);
  assert.equal(weak.get(symbol), 1);
  assert.equal(weak.get(Symbol.iterator), 2);
  assert.throws(() => weak.set(Symbol.for('k'), 1), TypeError);
  assert.throws(() => weak.set('k', 1), TypeError);
  console.log('WeakMap: local and well-known symbols accepted; registered symbol and string rejected');
  console.log('all counterexample assertions passed');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
