// Iteration protocols, generators, iterator helpers, typed arrays.
const show = (label, v) => console.log(label.padEnd(44), typeof v === 'string' ? v : JSON.stringify(v));

// 1) An iterable is anything with [Symbol.iterator]() returning { next() }.
const range = {
  from: 1, to: 3,
  [Symbol.iterator]() {
    let cur = this.from; const last = this.to;
    return {
      next: () => (cur <= last ? { value: cur++, done: false } : { value: undefined, done: true }),
      return: () => { show('  return() called (cleanup)', 'yes'); return { done: true }; },
    };
  },
};
show('[...range]', [...range]);
for (const x of range) { if (x === 2) break; } // break triggers return()
const [first] = range; // destructuring also closes the iterator
show('const [first] = range', first);

// 2) Iterators are one-shot; iterables usually are not.
const it = [1, 2, 3][Symbol.iterator]();
show('spread iterator twice', [[...it], [...it]]);
function* gen() { yield 1; yield 2; }
const g = gen();
show('generator is its own iterator (one-shot)', [[...g], [...g]]);

// 3) Generators are lazy and resumable; finally runs on early exit.
function* naturals() {
  let n = 0;
  try { while (true) yield n++; }
  finally { show('  naturals finally', 'ran'); }
}
for (const n of naturals()) { if (n > 2) break; }

// 4) Iterator helpers (ES2025): lazy, work on infinite sources.
show('naturals().filter(odd).map(sq).take(3)', naturals().filter((x) => x % 2).map((x) => x * x).take(3).toArray());
show('Iterator.from({next}) has helpers', typeof Iterator.from({ next: () => ({ done: true }) }).map);
const m = new Map([['a', 1], ['b', 2]]);
show('map.keys().map(...) without Array.from', m.keys().map((k) => k.toUpperCase()).toArray());
let pulled = 0;
const counted = { [Symbol.iterator]: () => ({ next: () => ({ value: ++pulled, done: false }) }) };
Iterator.from(counted[Symbol.iterator]()).map((x) => x * 2).take(2).toArray();
show('values pulled for take(2)', pulled);
let eager = 0;
[1, 2, 3, 4, 5].map((x) => { eager++; return x; }).slice(0, 2);
show('Array.map then slice(0,2) calls map fn', eager);

// 5) Typed arrays: fixed type views over an ArrayBuffer.
const buf = new ArrayBuffer(4);
const u8 = new Uint8Array(buf);
const view = new DataView(buf);
u8[0] = 256; u8[1] = -1; u8[2] = 3.7;
show('Uint8Array: 256, -1, 3.7 stored as', [u8[0], u8[1], u8[2]]);
const c = new Uint8ClampedArray(2); c[0] = 300; c[1] = -5;
show('Uint8ClampedArray: 300, -5', [...c]);
view.setUint16(0, 0x0102); // big-endian by default
show('DataView setUint16 BE -> bytes', [u8[0], u8[1]]);
show('Uint16Array over same bytes (platform LE)', new Uint16Array(buf, 0, 1)[0].toString(16));
const sub = u8.subarray(0, 2); sub[0] = 99;
show('subarray shares memory, slice copies', [u8[0], (() => { const s = u8.slice(0, 1); s[0] = 7; return u8[0]; })()]);
show('Buffer is a Uint8Array subclass', Buffer.from('hi') instanceof Uint8Array);
