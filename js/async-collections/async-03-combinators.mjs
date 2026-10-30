// Failure behaviour of Promise.all / allSettled / race / any.
const finished = [];
const job = (name, ms, fail = false) => new Promise((resolve, reject) =>
  setTimeout(() => {
    finished.push(name);
    fail ? reject(new Error(`${name} failed`)) : resolve(name);
  }, ms));
const settle = (p) => p.then((v) => `ok ${JSON.stringify(v)}`, (e) => `rejected ${e.constructor.name}: ${e.message}${e.errors ? ' ' + JSON.stringify(e.errors.map((x) => x.message)) : ''}`);

async function run(label, make) {
  finished.length = 0;
  const start = Date.now();
  const res = await settle(make());
  const at = Date.now() - start;
  await new Promise((r) => setTimeout(r, 120)); // let the rest finish
  console.log(`${label.padEnd(12)} settled at ~${Math.round(at / 10) * 10}ms: ${res}`);
  console.log(`${''.padEnd(12)} jobs that still ran to the end: ${finished.join(', ')}`);
}

await run('all', () => Promise.all([job('A', 100), job('B', 20, true), job('C', 50)]));
await run('allSettled', () => Promise.allSettled([job('A', 100), job('B', 20, true)]).then((r) => r.map((x) => x.status)));
await run('race', () => Promise.race([job('A', 100), job('B', 20, true)]));
await run('any', () => Promise.any([job('A', 100), job('B', 20, true)]));
await run('any (all fail)', () => Promise.any([job('A', 30, true), job('B', 20, true)]));
await run('all([])', () => Promise.all([]));
await run('race([])', () => Promise.race([Promise.race([]), job('timeout', 50)]));
await run('any([])', () => Promise.any([]));
