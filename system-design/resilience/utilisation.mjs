// Utilisation vs latency on ONE Node event loop.
// The server (a child process) burns CPU for Exp(mean 4 ms) per request — the event loop is
// the single "worker", capacity ≈ 250 rps. The load generator (this process) sends open-loop
// Poisson traffic at a fraction of that capacity and measures client-side latency.
// Theory for comparison (M/M/1): mean time in system = S / (1 − ρ).
// Run: node utilisation.mjs

import http from 'node:http';
import { fork } from 'node:child_process';
import { mulberry32, expSample, percentile } from './lib.mjs';

const SERVICE_MS = 4;

if (process.argv[2] === 'server') {
  const rnd = mulberry32(11);
  const srv = http.createServer((req, res) => {
    const until = performance.now() + expSample(rnd, SERVICE_MS);
    while (performance.now() < until); // CPU-bound: blocks the event loop
    res.end('ok');
  });
  srv.listen(0, '127.0.0.1', () => process.send(srv.address().port));
} else {
  const child = fork(new URL(import.meta.url).pathname, ['server']);
  const port = await new Promise((r) => child.once('message', r));
  const agent = new http.Agent({ keepAlive: true, maxSockets: Infinity });
  const rnd = mulberry32(3);

  async function run(rho, seconds) {
    const rate = (rho * 1000) / SERVICE_MS;
    const lat = [];
    const t0 = performance.now();
    let next = t0, sent = 0, measuredFrom = t0 + 1000;
    await new Promise((resolve) => {
      const tick = () => {
        const now = performance.now();
        while (next <= now) {
          const s = performance.now(), record = s >= measuredFrom;
          http.get({ host: '127.0.0.1', port, agent, path: '/' }, (res) => {
            res.resume();
            res.on('end', () => { if (record) lat.push(performance.now() - s); });
          }).on('error', () => {});
          sent++;
          next += expSample(rnd, 1000 / rate);
        }
        if (now - t0 >= 1000 + seconds * 1000) return resolve();
        setTimeout(tick, Math.max(0, Math.min(2, next - now)));
      };
      tick();
    });
    await new Promise((r) => setTimeout(r, 3000)); // drain
    lat.sort((a, b) => a - b);
    const mean = lat.reduce((a, b) => a + b, 0) / lat.length;
    return { rho, rate, n: lat.length, mean, p50: percentile(lat, 50), p99: percentile(lat, 99), theory: SERVICE_MS / (1 - rho) };
  }

  // RHO=0.9,0.95 SECONDS=60 node utilisation.mjs — high utilisation needs long runs to converge
  const levels = (process.env.RHO ?? '0.5,0.7,0.8,0.9,0.95').split(',').map(Number);
  const seconds = Number(process.env.SECONDS ?? 20);
  console.log(`node ${process.version}; server burns CPU Exp(mean ${SERVICE_MS} ms) per request on its single event loop; `
    + `open-loop Poisson load, ${seconds} s measured per level`);
  console.log('utilisation ρ | rps | mean, ms | p50, ms | p99, ms | M/M/1 mean S/(1−ρ), ms');
  for (const rho of levels) {
    const r = await run(rho, seconds);
    console.log(`${r.rho} | ${r.rate.toFixed(0)} | ${r.mean.toFixed(1)} | ${r.p50.toFixed(1)} | ${r.p99.toFixed(1)} | ${r.theory.toFixed(1)}`);
  }
  agent.destroy();
  child.kill();
}
