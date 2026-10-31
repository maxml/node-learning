'use strict';
// Where primitive vs object bites on a Node backend: ObjectId, Date, Buffer, module cache,
// symbols as WeakMap keys.
// Run: node 11-backend-identity.js   (needs `npm ci` for bson)

const { ObjectId } = require('bson');
// bson's "exports" hides package.json, so read it from disk
const bsonVersion = JSON.parse(require('node:fs').readFileSync(
  require('node:path').join(__dirname, 'node_modules/bson/package.json'), 'utf8')).version;
const log = (label, value) => console.log(label.padEnd(52), value);

console.log(`# node ${process.version}, bson ${bsonVersion}`);

console.log('\n--- 1. ObjectId is an object: same hex, different identity ---');
{
  const hex = '65f1a2b3c4d5e6f708192a3b';
  const a = new ObjectId(hex);
  const b = new ObjectId(hex);
  log('typeof a', typeof a);
  log('a === b', a === b);
  log('a == b', a == b);
  log('a.equals(b)', a.equals(b));
  log('a.equals(hex string)', a.equals(hex));
  log('String(a) === String(b)', String(a) === String(b));
  log('[a].includes(b)', [a].includes(b));
  log('new Set([a, b]).size', new Set([a, b]).size);
  const byId = new Map([[a, 'Ann']]);
  log('Map keyed by ObjectId: get(b)', byId.get(b));
  const byHex = new Map([[a.toHexString(), 'Ann']]);
  log('Map keyed by hex: get(b.toHexString())', byHex.get(b.toHexString()));
}

console.log('\n--- 2. Date: === compares identity, < compares numbers ---');
{
  const d1 = new Date('2026-10-31T00:00:00Z');
  const d2 = new Date('2026-10-31T00:00:00Z');
  log('d1 === d2', d1 === d2);
  log('d1.getTime() === d2.getTime()', d1.getTime() === d2.getTime());
  log('d1 <= d2 && d1 >= d2 (ToPrimitive number)', d1 <= d2 && d1 >= d2);
}

console.log('\n--- 3. Buffer: === vs equals ---');
{
  const x = Buffer.from('secret');
  const y = Buffer.from('secret');
  log('x === y', x === y);
  log('x.equals(y)', x.equals(y));
}

console.log('\n--- 4. module cache: require returns the same object ---');
{
  const cfg1 = require('./11-config.js');
  cfg1.timeoutMs = 1; // a "local tweak" in one place
  const cfg2 = require('./11-config.js');
  log('cfg1 === cfg2', cfg1 === cfg2);
  log('cfg2.timeoutMs after cfg1.timeoutMs = 1', cfg2.timeoutMs);
}

console.log('\n--- 5. symbols as WeakMap keys: only symbols with identity ---');
{
  const wm = new WeakMap();
  try { wm.set(Symbol('k'), 1); log("WeakMap.set(Symbol('k'))", 'ok'); }
  catch (e) { log("WeakMap.set(Symbol('k'))", `${e.constructor.name}: ${e.message}`); }
  try { wm.set(Symbol.for('k'), 1); log("WeakMap.set(Symbol.for('k'))", 'ok'); }
  catch (e) { log("WeakMap.set(Symbol.for('k'))", `${e.constructor.name}: ${e.message}`); }
  try { wm.set('k', 1); log("WeakMap.set('k')", 'ok'); }
  catch (e) { log("WeakMap.set('k')", `${e.constructor.name}: ${e.message}`); }
}
