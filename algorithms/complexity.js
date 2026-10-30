'use strict';
// Three claims from the note «Складність алгоритмів»:
//  1. Array push is O(1) amortized: total time / n stays flat as n grows,
//     while individual pushes occasionally cost O(n) (backing store regrowth + copy).
//  2. Big-O hides memory locality: the same O(n) sum over the same array is several times
//     slower when the access order is random instead of sequential.
//  3. Map.get stays roughly flat in n ("sublinear on average" is all the spec requires);
//     growth at large n comes from cache misses, not from the algorithm.
// Numbers are from one machine and one run; read them as directions, not constants.

const ns = () => process.hrtime.bigint();

console.log(`node ${process.version}, V8 ${process.versions.v8}`);

// 1. Amortized push
// V8 grows a full backing store to old + old/2 + 16 (JSObject::NewElementsCapacity,
// src/objects/js-objects.h). Replaying that rule shows why the total copy work is O(n):
// the copies form a geometric series: with factor 1.5 the sum of all previous capacities is
// at most 3x the last one, so between 2 and 3 copies per push on average, for any n.
console.log('\n1a) push: replay of V8 growth rule (old + old/2 + 16)');
for (const n of [1e4, 1e6, 1e7]) {
  let cap = 0;
  let copies = 0;
  let regrowths = 0;
  for (let len = 0; len < n; len++) {
    if (len === cap) {
      copies += len; // existing elements copied into the new store
      cap = cap + (cap >> 1) + 16;
      regrowths++;
    }
  }
  console.log(`  n=${String(n).padStart(9)}  regrowths ${regrowths}, elements copied ${copies} = ${(copies / n).toFixed(2)} per push`);
}

console.log('1b) push: measured total ns/op (no per-op timer) and worst single push');
for (const n of [1e4, 1e5, 1e6, 1e7]) {
  const a = [];
  const t0 = ns();
  for (let i = 0; i < n; i++) a.push(i);
  const total = Number(ns() - t0);
  // worst single push: timed separately, includes regrowth copy and any GC pause
  const b = [];
  let worst = 0n;
  let worstAt = 0;
  for (let i = 0; i < n; i++) {
    const s = ns();
    b.push(i);
    const d = ns() - s;
    if (d > worst) {
      worst = d;
      worstAt = i;
    }
  }
  console.log(
    `  n=${String(n).padStart(9)}  avg ${(total / n).toFixed(1).padStart(5)} ns/op` +
      `  worst single push ${(Number(worst) / 1000).toFixed(0)} us at length ${worstAt}`,
  );
}

// 2. Locality: sequential vs random order over the same Float64Array
console.log('\n2) locality: sum of 16M doubles (128 MB), same work, different order');
{
  const n = 1 << 24;
  const data = new Float64Array(n).fill(1);
  const seq = new Uint32Array(n);
  for (let i = 0; i < n; i++) seq[i] = i;
  const rnd = seq.slice();
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = rnd[i];
    rnd[i] = rnd[j];
    rnd[j] = t;
  }
  const run = (idx) => {
    const t0 = ns();
    let s = 0;
    for (let i = 0; i < n; i++) s += data[idx[i]];
    const ms = Number(ns() - t0) / 1e6;
    if (s !== n) throw new Error('bad sum');
    return ms;
  };
  run(seq);
  run(rnd); // warm-up
  const a = run(seq);
  const b = run(rnd);
  console.log(`  sequential ${a.toFixed(0)} ms, random ${b.toFixed(0)} ms, ratio ${(b / a).toFixed(1)}x`);
}

// 3. Map.get cost vs size
console.log('\n3) Map.get: ns per lookup (1M random hits) vs map size');
for (const size of [1e3, 1e4, 1e5, 1e6, 4e6]) {
  const m = new Map();
  for (let i = 0; i < size; i++) m.set(i * 7 + 1, i);
  const keys = new Array(1e6);
  for (let i = 0; i < keys.length; i++) keys[i] = Math.floor(Math.random() * size) * 7 + 1;
  let s = 0;
  for (let i = 0; i < keys.length; i++) s += m.get(keys[i]); // warm-up
  const t0 = ns();
  s = 0;
  for (let i = 0; i < keys.length; i++) s += m.get(keys[i]);
  const per = Number(ns() - t0) / keys.length;
  console.log(`  size=${String(size).padStart(8)}  ${per.toFixed(1).padStart(6)} ns/get`);
}
