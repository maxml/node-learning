'use strict';
// Claims from «Рекурсія і динамічне програмування»:
//  1. Max recursion depth in Node is not a fixed number of calls: V8 limits stack *bytes*
//     (--stack-size, default 984 KB), so depth depends on frame size (args, locals, tier).
//  2. V8 does not implement proper tail calls (ES2015 PTC): a strict-mode call in tail
//     position still grows the stack and overflows.
//  3. --stack-size raises the limit, but only within the OS thread stack (ulimit -s, 8 MB
//     typical on Linux main thread); going past it crashes the process with a segfault
//     instead of throwing RangeError. Shown in a child process.
//  4. A worker thread gets its own stack (resourceLimits.stackSizeMb, default 4 MB).
//  5. Async recursion that awaits first does not overflow, but the pending promise chain
//     costs heap memory instead.
// Run: node recursion-depth.js
const { spawnSync } = require('node:child_process');

function measure(fn) {
  let depth = 0;
  const probe = (d) => {
    depth = d;
    return fn(probe, d);
  };
  try {
    probe(0);
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
  }
  return depth;
}

// Simplest possible recursion, one frame per level
let plainDepth = 0;
function plain(d) {
  plainDepth = d;
  plain(d + 1);
}
function measurePlain() {
  try {
    plain(0);
  } catch (e) {
    if (!(e instanceof RangeError)) throw e;
  }
  return plainDepth;
}

// The variants below go through `probe`, so each level costs two frames (probe + fn).
// Minimal frame: one argument
const tiny = (self, d) => self(d + 1);

// Bigger frame: several live locals that are used after the call returns
const fat = (self, d) => {
  const a = d + 1, b = d + 2, c = d + 3, e = d + 4, f = d + 5, g = d + 6, h = d + 7, i = d + 8;
  const r = self(d + 1);
  return r + a + b + c + e + f + g + h + i;
};

// Tail call in strict mode: per ECMA-262 15.10 this is a tail position call,
// so a PTC engine would reuse the frame and never overflow.
function sumTo(n, acc) {
  if (n === 0) return acc;
  return sumTo(n - 1, acc + n); // tail position
}

if (process.argv[2] === 'child') {
  console.log(JSON.stringify({ plain: measurePlain(), tiny: measure(tiny), fat: measure(fat) }));
  process.exit(0);
}

console.log(`node ${process.version}, V8 ${process.versions.v8}`);
console.log('\n1) depth reached before RangeError (default --stack-size=984):');
for (let run = 0; run < 3; run++) {
  console.log(`   run ${run + 1}: plain ${measurePlain()}, two-frame tiny ${measure(tiny)}, two-frame fat ${measure(fat)}`);
}

console.log('\n2) tail-recursive sumTo(1e6, 0) in strict mode:');
try {
  console.log('   result', sumTo(1e6, 0));
} catch (e) {
  console.log(`   ${e.constructor.name}: ${e.message} (no tail call elimination)`);
}
// the iterative rewrite needs O(1) stack
let acc = 0;
for (let n = 1e6; n > 0; n--) acc += n;
console.log('   loop version ->', acc);

console.log('\n3) --stack-size in a child process:');
for (const size of [984, 2000, 4000, 7000, 20000, 65500]) {
  const r = spawnSync(process.execPath, [`--stack-size=${size}`, __filename, 'child'], { encoding: 'utf8' });
  const out = r.stdout.trim() || '(no output)';
  const how = r.signal ? `killed by ${r.signal}` : `exit ${r.status}`;
  console.log(`   --stack-size=${String(size).padStart(5)}: ${out}  [${how}]`);
}

// 4. A worker thread has its own stack, sized by resourceLimits.stackSizeMb (default 4).
// 5. Async recursion that awaits before recursing does not grow the call stack:
//    each continuation starts from the microtask queue on an empty stack.
const { Worker } = require('node:worker_threads');
const workerSrc = `
  const { parentPort } = require('node:worker_threads');
  let d = 0;
  function plain(x) { d = x; plain(x + 1); }
  try { plain(0); } catch (e) {}
  parentPort.postMessage(d);
`;
async function workerDepth(resourceLimits) {
  return new Promise((resolve, reject) => {
    const w = new Worker(workerSrc, { eval: true, resourceLimits });
    w.once('message', resolve);
    w.once('error', reject);
  });
}
async function countDown(n) {
  if (n === 0) return 0;
  await null; // yield: the rest runs as a microtask on a fresh stack
  return 1 + (await countDown(n - 1));
}
(async () => {
  console.log('\n4) worker threads:');
  console.log(`   default resourceLimits: plain depth ${await workerDepth(undefined)}`);
  console.log(`   stackSizeMb: 1:         plain depth ${await workerDepth({ stackSizeMb: 1 })}`);
  console.log(`   stackSizeMb: 16:        plain depth ${await workerDepth({ stackSizeMb: 16 })}`);

  console.log('\n5) async recursion with await before the recursive call:');
  try {
    console.log(`   countDown(1e6) = ${await countDown(1e6)} (no RangeError), heapUsed ${(process.memoryUsage().heapUsed / 1e6).toFixed(0)} MB`);
  } catch (e) {
    console.log(`   ${e.constructor.name}: ${e.message}`);
  }
})();
