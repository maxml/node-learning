// Little's law check: L = λ·W, measured on a real HTTP server.
// Handler waits on I/O: 20 ms + exponential(mean 30 ms), so W ≈ 50 ms.
// Open-loop Poisson load at several rates. On the server we integrate the in-flight count
// over time (time-average L), count completions (λ) and average the time in system (W).
// Run: node littles-law.mjs

import http from 'node:http';
import { mulberry32, expSample } from './lib.mjs';

const rnd = mulberry32(7);
let inflight = 0, area = 0, lastChange = 0, measuring = false, mStart = 0;
let completed = 0, sumW = 0;

function bump(delta) {
  const now = performance.now();
  if (measuring) area += inflight * (now - lastChange);
  lastChange = now;
  inflight += delta;
}

const server = http.createServer((req, res) => {
  const start = performance.now();
  bump(+1);
  setTimeout(() => {
    res.end('ok');
    bump(-1);
    if (measuring) { completed++; sumW += performance.now() - start; }
  }, 20 + expSample(rnd, 30));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const agent = new http.Agent({ keepAlive: true, maxSockets: Infinity });
const port = server.address().port;

function fire() {
  http.get({ host: '127.0.0.1', port, agent, path: '/' }, (res) => res.resume()).on('error', () => {});
}

async function run(rate, seconds) {
  inflight = 0; area = 0; completed = 0; sumW = 0;
  const warm = 1000, total = warm + seconds * 1000;
  const t0 = performance.now();
  let next = t0;
  await new Promise((resolve) => {
    const tick = () => {
      const now = performance.now();
      if (!measuring && now - t0 >= warm) { measuring = true; mStart = now; lastChange = now; }
      while (next <= now) { fire(); next += expSample(rnd, 1000 / rate); }
      if (now - t0 >= total) return resolve();
      setTimeout(tick, Math.max(0, Math.min(5, next - now)));
    };
    tick();
  });
  bump(0);
  measuring = false;
  const span = (performance.now() - mStart) / 1000;
  const L = area / (span * 1000);
  const lambda = completed / span;
  const W = sumW / completed / 1000;
  await new Promise((r) => setTimeout(r, 300));
  return { rate, L, lambda, W, lw: lambda * W };
}

console.log(`node ${process.version}; handler 20 ms + Exp(30 ms) I/O wait; open-loop Poisson arrivals, 5 s measured after 1 s warm-up`);
console.log('target rps | measured λ, rps | W, ms | λ·W | measured L (time-avg in flight) | L / (λ·W)');
for (const rate of [100, 400, 1000]) {
  const r = await run(rate, 5);
  console.log(`${r.rate} | ${r.lambda.toFixed(0)} | ${(r.W * 1000).toFixed(1)} | ${r.lw.toFixed(2)} | ${r.L.toFixed(2)} | ${(r.L / r.lw).toFixed(3)}`);
}
agent.destroy();
server.close();
