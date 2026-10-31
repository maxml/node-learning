// Starts the compiled Nest app (POOL_SIZE=2), then:
//  1) POST /heavy-block while pinging /ping every 50 ms  -> how long /ping waited
//  2) POST /heavy (pool) while pinging                   -> same
//  3) 6 concurrent POST /heavy with pool 2 + queue 2      -> how many 503
//  4) SIGTERM                                             -> onModuleDestroy ran? process exited?
// Run: npm run check   (inside this folder)

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 4310, BASE = `http://127.0.0.1:${PORT}`;
const app = spawn(process.execPath, ['dist/main.js'], { env: { ...process.env, PORT: String(PORT), POOL_SIZE: '2' }, stdio: ['ignore', 'pipe', 'inherit'] });
const lines = [];
const ready = new Promise((r) => createInterface({ input: app.stdout }).on('line', (l) => { lines.push(l); if (l.includes('"ready"')) r(); }));
await ready;

async function pingWhile(path) {
  const lat = [];
  let done = false;
  const heavy = fetch(BASE + path, { method: 'POST' }).then(async (r) => { done = true; return { status: r.status, body: await r.json() }; });
  await sleep(100);
  while (!done) {
    const t = performance.now();
    await (await fetch(`${BASE}/ping`)).text();
    lat.push(performance.now() - t);
    await sleep(50);
  }
  const h = await heavy;
  lat.sort((a, b) => a - b);
  return { path, heavyStatus: h.status, pings: lat.length, pingMaxMs: Math.round(lat.at(-1)), pingP50Ms: +lat[Math.floor(lat.length / 2)].toFixed(1) };
}

console.log(JSON.stringify({ node: process.version }));
console.log(JSON.stringify(await pingWhile('/heavy-block')));
console.log(JSON.stringify(await pingWhile('/heavy')));

const burst = await Promise.all(Array.from({ length: 6 }, async () => {
  const t = performance.now();
  const r = await fetch(`${BASE}/heavy`, { method: 'POST' });
  await r.text();
  return { status: r.status, ms: Math.round(performance.now() - t) };
}));
console.log(JSON.stringify({ burst6_pool2_queue2: burst }));

// SIGTERM while a /heavy is running: does the in-flight request still get its answer?
const inFlight = fetch(`${BASE}/heavy`, { method: 'POST' }).then((r) => r.status, (e) => `error ${e.cause?.code ?? e.name}`);
await sleep(1000);
const t = performance.now();
app.kill('SIGTERM');
const exited = new Promise((r) => app.on('exit', (c, s) => r(c ?? s)));
const status = await inFlight;
const code = await exited;
console.log(JSON.stringify({ sigtermDuringHeavy: { inFlightStatus: status, exit: code, exitMs: Math.round(performance.now() - t), poolClosedLogged: lines.some((l) => l.includes('poolClosed')) } }));
