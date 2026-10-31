// For each case: start server.mjs in a MODE, put autocannon load on GET /ping, fire /heavy
// requests 2 s in, and report /ping latency, timeouts, the server's event-loop delay and
// how long /heavy took.
// Run: node bench.mjs            CASES=block,pool node bench.mjs
// The `queue` case needs Valkey/Redis on REDIS_PORT (see README).

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { setTimeout as sleep } from 'node:timers/promises';
import autocannon from 'autocannon';

const PORT = 4300;
const BASE = `http://127.0.0.1:${PORT}`;
const DURATION_S = 15, CONNECTIONS = 10, PING_TIMEOUT_S = 2;

const CASES = {
  baseline: { mode: 'block', heavies: 0 },
  block: { mode: 'block', heavies: 1 },
  chunk: { mode: 'chunk', heavies: 1 },
  'chunk-x4': { mode: 'chunk', heavies: 4 },
  pool: { mode: 'pool', heavies: 1, env: { POOL_SIZE: '4', QUEUE_MAX: '4' } },
  'pool-burst-12': { mode: 'pool', heavies: 12, env: { POOL_SIZE: '4', QUEUE_MAX: '4' } },
  queue: { mode: 'queue', heavies: 1 },
};
const selected = (process.env.CASES ?? Object.keys(CASES).join(',')).split(',');

function start(file, env) {
  const child = spawn(process.execPath, [file], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
  const ready = new Promise((resolve) => createInterface({ input: child.stdout }).on('line', (l) => { const j = JSON.parse(l); if (j.ready) resolve(j); }));
  return { child, ready };
}

async function heavy(mode) {
  const t = performance.now();
  const r = await fetch(`${BASE}/heavy`, { method: 'POST' });
  const body = await r.json();
  if (r.status !== 202) return { status: r.status, ms: Math.round(performance.now() - t) };
  // async variant: poll the status URL like a client would (every 250 ms)
  for (;;) {
    await sleep(250);
    const s = await (await fetch(BASE + body.status)).json();
    if (s.state === 'completed' || s.state === 'failed') {
      return { status: 202, acceptedInMs: null, state: s.state, ms: Math.round(performance.now() - t), queuedMs: s.processedOn - s.timestamp, workMs: s.finishedOn - s.processedOn };
    }
  }
}

async function runCase(name) {
  const c = CASES[name];
  const worker = c.mode === 'queue' ? start('worker.mjs', {}) : null;
  if (worker) await worker.ready;
  const srv = start('server.mjs', { MODE: c.mode, PORT: String(PORT), ...(c.env ?? {}) });
  const info = await srv.ready;
  await fetch(`${BASE}/stats`); // reset the histogram after startup
  const load = autocannon({ url: `${BASE}/ping`, connections: CONNECTIONS, duration: DURATION_S, timeout: PING_TIMEOUT_S });
  // Open-loop probe: one GET /ping every 100 ms regardless of answers, latency measured from the
  // moment it was due. autocannon is closed-loop: a blocked server just gets fewer requests and
  // timed-out ones are not in its percentiles (coordinated omission), so its p99 flatters.
  const probe = [];
  const probeTimer = setInterval(() => {
    const t = performance.now();
    fetch(`${BASE}/ping`, { signal: AbortSignal.timeout(30_000) }).then((r) => r.text()).then(
      () => probe.push(performance.now() - t), () => probe.push(30_000));
  }, 100);
  await sleep(2000);
  const heavies = await Promise.all(Array.from({ length: c.heavies }, () => heavy(c.mode)));
  const r = await load;
  clearInterval(probeTimer);
  await sleep(300);
  probe.sort((a, b) => a - b);
  const q = (p) => Math.round(probe[Math.min(probe.length - 1, Math.ceil(p * probe.length) - 1)]);
  const stats = await (await fetch(`${BASE}/stats`)).json();
  srv.child.kill('SIGTERM'); worker?.child.kill('SIGTERM');
  await Promise.all([once(srv.child, 'exit'), worker && once(worker.child, 'exit')]);
  const statuses = heavies.reduce((m, h) => ((m[h.status] = (m[h.status] ?? 0) + 1), m), {});
  const okMs = heavies.filter((h) => h.status !== 503).map((h) => h.ms).sort((a, b) => a - b);
  return {
    case: name, mode: c.mode, poolSize: info.poolSize, availableParallelism: info.availableParallelism,
    ping: { requests: r.requests.total, rps: Math.round(r.requests.average), p50: r.latency.p50, p99: r.latency.p99, max: r.latency.max, timeouts: r.timeouts, errors: r.errors },
    probe: { n: probe.length, p50: q(0.5), p99: q(0.99), max: Math.round(probe.at(-1)), over1s: probe.filter((x) => x > 1000).length },
    eventLoopDelayMs: stats.eld, // includes the 10 ms sampling interval: an idle loop shows ~10
    heavy: { statuses, msMinMax: okMs.length ? [okMs[0], okMs.at(-1)] : [], rejected503Ms: heavies.filter((h) => h.status === 503).map((h) => h.ms), queue: heavies.filter((h) => h.status === 202).map(({ queuedMs, workMs, ms }) => ({ queuedMs, workMs, endToEndMs: ms })) },
  };
}

console.log(JSON.stringify({ node: process.version, date: new Date().toISOString(), DURATION_S, CONNECTIONS, PING_TIMEOUT_S }));
for (const name of selected) console.log(JSON.stringify(await runCase(name)));
