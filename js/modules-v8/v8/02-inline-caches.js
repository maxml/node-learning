// Inline caches: the same property read `o.x` over 1 shape (monomorphic), 4 shapes (polymorphic)
// and 16 shapes (megamorphic). Each shape has `x` at a different position.
// Run: node 02-inline-caches.js          (timings)
//      node --allow-natives-syntax 02-inline-caches.js --status   (also prints opt status)
// A micro-benchmark: compare ratios within one run, never absolute ns across machines.
const N = 1_000_000;
const ROUNDS = 7;

function makeObjects(shapes) {
  const out = new Array(N);
  for (let i = 0; i < N; i++) {
    const k = i % shapes;
    const o = {};
    for (let j = 0; j < k; j++) o['p' + j] = j; // k leading props => distinct shape per k
    o.x = i;
    out[i] = o;
  }
  return out;
}

// One function per case so the ICs (feedback) of one case do not pollute another.
const sums = {
  mono: (arr) => { let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i].x; return s; },
  poly: (arr) => { let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i].x; return s; },
  mega: (arr) => { let s = 0; for (let i = 0; i < arr.length; i++) s += arr[i].x; return s; },
};
const data = { mono: makeObjects(1), poly: makeObjects(4), mega: makeObjects(16) };

const results = {};
for (const name of Object.keys(sums)) {
  const fn = sums[name];
  const arr = data[name];
  fn(arr); fn(arr); // warm-up: let the tiers (Sparkplug/Maglev/TurboFan) kick in
  const times = [];
  for (let r = 0; r < ROUNDS; r++) {
    const t0 = process.hrtime.bigint();
    const s = fn(arr);
    const dt = Number(process.hrtime.bigint() - t0) / 1e6;
    if (s < 0) throw new Error('unreachable'); // keep the result alive
    times.push(dt);
  }
  times.sort((a, b) => a - b);
  results[name] = times[Math.floor(ROUNDS / 2)];
}
const base = results.mono;
for (const [name, ms] of Object.entries(results)) {
  console.log(`${name.padEnd(5)} median ${ms.toFixed(2).padStart(7)} ms  x${(ms / base).toFixed(1)}`);
}

if (process.argv.includes('--status')) {
  // Bit field from V8 internals (enum OptimizationStatus in deps/v8/src/runtime/runtime.h, V8 13.6;
  // not a stable API). Long loops are usually optimized via on-stack replacement (OSR), which this
  // per-function status does not show.
  const BITS = { 4: 'optimized', 5: 'maglev', 6: 'turbofan', 7: 'interpreted', 15: 'baseline(sparkplug)' };
  // eslint-disable-next-line no-eval
  const status = eval('(f) => %GetOptimizationStatus(f)');
  for (const [name, fn] of Object.entries(sums)) {
    const s = status(fn);
    const tiers = Object.entries(BITS).filter(([bit]) => s & (1 << bit)).map(([, n]) => n);
    console.log(name.padEnd(5), 'status 0x' + s.toString(16), tiers.join(', '));
  }
}
