'use strict';
// Claim: Array.prototype.shift is O(n) in the spec model (every remaining element moves
// one index down), so a queue built on push+shift degrades to O(n^2) for n elements.
// V8 has a fast path ("left-trimming": it moves the array's start instead of copying)
// that hides this for small arrays. This measures where it stops helping.
//
// Workload: fill a queue with N items, then drain it completely. Per-op cost is reported,
// so O(1) per op shows as a flat line and O(n) per op grows with N.
const { RingQueue } = require('./structures');

function now() {
  return Number(process.hrtime.bigint()) / 1e6; // ms
}

function arrayQueue(n) {
  const a = [];
  for (let i = 0; i < n; i++) a.push({ i });
  let sum = 0;
  while (a.length) sum += a.shift().i;
  return sum;
}

function ringQueue(n) {
  const q = new RingQueue();
  for (let i = 0; i < n; i++) q.enqueue({ i });
  let sum = 0;
  while (q.size) sum += q.dequeue().i;
  return sum;
}

// Index-based "queue": never shifts, just advances a head pointer and compacts occasionally.
function headIndexQueue(n) {
  let a = [];
  let head = 0;
  for (let i = 0; i < n; i++) a.push({ i });
  let sum = 0;
  while (head < a.length) {
    sum += a[head++].i;
    if (head > 1024 && head * 2 > a.length) {
      a = a.slice(head);
      head = 0;
    }
  }
  return sum;
}

function bench(fn, n) {
  fn(Math.min(n, 1000)); // warm-up
  const t0 = now();
  const sum = fn(n);
  const ms = now() - t0;
  if (sum !== (n * (n - 1)) / 2) throw new Error('wrong result');
  return ms;
}

console.log(`node ${process.version}, V8 ${process.versions.v8}`);
console.log('N'.padStart(9), 'shift ms'.padStart(10), 'ns/op'.padStart(8), '| ring ms'.padStart(10), 'ns/op'.padStart(8), '| head-idx ms'.padStart(13), 'ns/op'.padStart(8));
for (const n of [1_000, 10_000, 50_000, 100_000, 200_000, 400_000]) {
  const s = bench(arrayQueue, n);
  const r = bench(ringQueue, n);
  const h = bench(headIndexQueue, n);
  console.log(
    String(n).padStart(9),
    s.toFixed(1).padStart(10),
    ((s * 1e6) / n).toFixed(0).padStart(8),
    '|',
    r.toFixed(1).padStart(8),
    ((r * 1e6) / n).toFixed(0).padStart(8),
    '|',
    h.toFixed(1).padStart(11),
    ((h * 1e6) / n).toFixed(0).padStart(8),
  );
}
