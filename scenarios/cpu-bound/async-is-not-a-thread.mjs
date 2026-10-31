// Shows that `async` does not move CPU work off the event loop.
// A timer due in 0 ms and an I/O-like callback are scheduled first; then three variants of the
// same ~1 s calculation run. We print when the timer actually fired.

import { countPrimes } from './work.mjs';

const WORK = 3_000_000; // ~1 s on the test machine

async function asyncWork() {
  return countPrimes(0, WORK); // body runs synchronously until the first await (there is none)
}
async function awaitFirstThenWork() {
  await null; // yields once: the rest is a microtask, and microtasks run before timers
  return countPrimes(0, WORK);
}

for (const [name, fn] of [['async function', asyncWork], ['await null, then work', awaitFirstThenWork]]) {
  const t0 = performance.now();
  await new Promise((done) => {
    let timerAt;
    setTimeout(() => { timerAt = performance.now() - t0; }, 0);
    const p = fn();
    const returnedAt = performance.now() - t0;
    p.then(() => {
      const resolvedAt = performance.now() - t0;
      setTimeout(() => {
        console.log(JSON.stringify({ variant: name, callReturnedMs: Math.round(returnedAt), promiseResolvedMs: Math.round(resolvedAt), timer0FiredMs: Math.round(timerAt) }));
        done();
      }, 5);
    });
  });
}
