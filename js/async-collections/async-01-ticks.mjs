// How many microtask "ticks" do different promise/await shapes cost?
// A clock re-queues itself with queueMicrotask; each run is one tick.
// The number printed is how many clock ticks ran before the operation settled.
// Only the differences between rows matter, not the absolute numbers.

function countTicks(start) {
  return new Promise((done) => {
    let tick = 0;
    let stop = false;
    const clock = () => {
      if (stop) return;
      tick++;
      queueMicrotask(clock);
    };
    queueMicrotask(clock);
    start().then(() => {
      stop = true;
      done(tick);
    });
  });
}

const native = () => Promise.resolve(1);
const thenable = { then(resolve) { resolve(1); } };

const cases = {
  'Promise.resolve(1).then':               () => Promise.resolve(1),
  'async () => 1':                          async () => 1,
  'async: await nativePromise; return':     async () => { await native(); },
  'async: return nativePromise':            async () => native(),
  'async: return await nativePromise':      async () => await native(),
  'async: await thenable':                  async () => { await thenable; },
  'new Promise(r => r(nativePromise))':     () => new Promise((r) => r(native())),
  'new Promise(r => r(1))':                 () => new Promise((r) => r(1)),
};

for (const [label, fn] of Object.entries(cases)) {
  console.log(String(await countTicks(fn)).padStart(2), label);
}

const p = Promise.resolve(1);
console.log('Promise.resolve(p) === p:', Promise.resolve(p) === p);

// Run-to-completion: a resolved promise's callback never interrupts sync code.
const order = [];
Promise.resolve().then(() => order.push('then'));
for (let i = 0; i < 1e6; i++); // busy work
order.push('sync end');
await null;
console.log('order:', order.join(' -> '));
