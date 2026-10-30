'use strict';
// Claims from «Сортування і пошук»:
//  1. Default sort compares strings (ToString), so numbers sort lexicographically.
//  2. Array.prototype.sort is stable (required by ECMA-262 since ES2019; V8 7.0+ uses TimSort).
//  3. A comparator that returns a boolean is not a "consistent comparator": the order is
//     implementation-defined and in practice wrong.
//  4. TimSort is adaptive: on already sorted input it does n-1 comparisons (O(n)),
//     on random input about n*log2(n).
//  5. A comparison sort cannot beat log2(n!) ~ n*log2(n) - 1.44n comparisons in the worst case.
const assert = require('node:assert/strict');

console.log(`node ${process.version}, V8 ${process.versions.v8}`);

// 1
console.log('\n1) [10, 9, 1, 100].sort() ->', JSON.stringify([10, 9, 1, 100].sort()));
console.log('   with (a, b) => a - b    ->', JSON.stringify([10, 9, 1, 100].sort((a, b) => a - b)));

// 2. Stability: sort 100k records by a key with only 10 distinct values,
//    then check that the original order (id) is preserved inside each key group.
{
  const n = 100_000;
  const recs = Array.from({ length: n }, (_, id) => ({ id, key: Math.floor(Math.random() * 10) }));
  const sorted = [...recs].sort((a, b) => a.key - b.key);
  let violations = 0;
  for (let i = 1; i < n; i++) {
    if (sorted[i].key === sorted[i - 1].key && sorted[i].id < sorted[i - 1].id) violations++;
  }
  console.log(`\n2) stability on ${n} records with 10 distinct keys: ${violations} order violations`);
}

// 3. Boolean comparator: true/false coerce to 1/0, never negative, so "a < b" is reported as "equal".
{
  const xs = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 1000));
  const bad = [...xs].sort((a, b) => a > b); // wrong: returns boolean
  const good = [...xs].sort((a, b) => a - b);
  let sortedOk = true;
  for (let i = 1; i < bad.length; i++) if (bad[i - 1] > bad[i]) sortedOk = false;
  console.log(`\n3) comparator returning boolean, 1000 random ints: result sorted? ${sortedOk}; equals correct sort? ${JSON.stringify(bad) === JSON.stringify(good)}`);
  const small = [3, 1, 2].sort((a, b) => a > b);
  console.log('   [3, 1, 2].sort((a, b) => a > b) ->', JSON.stringify(small));
}

// 4 + 5. Comparison counts
function countCompares(arr) {
  let c = 0;
  arr.sort((a, b) => {
    c++;
    return a - b;
  });
  return c;
}
function log2Factorial(n) {
  let s = 0;
  for (let i = 2; i <= n; i++) s += Math.log2(i);
  return s;
}
console.log('\n4) comparisons made by V8 sort (TimSort) vs the lower bound log2(n!)');
console.log('       n   sorted  reversed    random   log2(n!)   n*log2(n)');
for (const n of [1_000, 10_000, 100_000, 1_000_000]) {
  const asc = Array.from({ length: n }, (_, i) => i);
  const desc = [...asc].reverse();
  const rnd = asc.map(() => Math.random());
  const row = [countCompares([...asc]), countCompares([...desc]), countCompares([...rnd])];
  console.log(
    String(n).padStart(8),
    ...row.map((x) => String(x).padStart(9)),
    String(Math.ceil(log2Factorial(n))).padStart(10),
    String(Math.round(n * Math.log2(n))).padStart(11),
  );
  assert.equal(row[0], n - 1);
}

// 6. Cost of a JS comparator: Float64Array#sort compares numerically without calling JS
{
  const n = 1_000_000;
  const xs = Array.from({ length: n }, () => Math.random());
  let t0 = process.hrtime.bigint();
  [...xs].sort((a, b) => a - b);
  const cmpMs = Number(process.hrtime.bigint() - t0) / 1e6;
  t0 = process.hrtime.bigint();
  Float64Array.from(xs).sort();
  const typedMs = Number(process.hrtime.bigint() - t0) / 1e6;
  console.log(`\n6) ${n} random doubles: Array#sort with comparator ${cmpMs.toFixed(0)} ms, Float64Array#sort ${typedMs.toFixed(0)} ms`);
}

// toSorted (ES2023) returns a copy; sort mutates in place
const orig = [3, 1, 2];
const copy = orig.toSorted((a, b) => a - b);
console.log('\n7) toSorted leaves the original intact:', JSON.stringify(orig), '->', JSON.stringify(copy));
