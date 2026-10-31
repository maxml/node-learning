// One API instance with a cheap GET /ping and an expensive POST /heavy (~5 s of CPU).
// Plain node:http: the event-loop mechanics are identical under NestJS/Express, and the
// Nest-specific part (pool as a provider, shutdown) lives in ./nest.
//
// MODE=block   `async` handler that just calls the calculation (the code from the scenario)
// MODE=chunk   same calculation, time-sliced: yield to the loop with setImmediate every SLICE_MS
// MODE=pool    piscina worker pool, POOL_SIZE threads, bounded queue QUEUE_MAX, 503 when full
// MODE=queue   BullMQ: 202 + job id, the calculation runs in worker.mjs (another process)

import http from 'node:http';
import os from 'node:os';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { setImmediate as yieldToLoop } from 'node:timers/promises';
import { countPrimes, N } from './work.mjs';

const MODE = process.env.MODE ?? 'block';
const PORT = Number(process.env.PORT ?? 4300);
const SLICE_MS = Number(process.env.SLICE_MS ?? 10);
const POOL_SIZE = Number(process.env.POOL_SIZE ?? Math.max(1, os.availableParallelism() - 1));
const QUEUE_MAX = Number(process.env.QUEUE_MAX ?? POOL_SIZE);
const REDIS = { host: '127.0.0.1', port: Number(process.env.REDIS_PORT ?? 6391) };

// --- the variants ----------------------------------------------------------
async function heavyBlocking() {
  return countPrimes(0, N); // `async` changes the return type, not where the loop runs
}

async function heavyChunked() {
  let n = 0, count = 0;
  while (n < N) {
    const sliceEnd = performance.now() + SLICE_MS;
    while (n < N && performance.now() < sliceEnd) {
      const to = Math.min(N, n + 2000); // ~0.3–0.8 ms of work per step on the test machine
      count += countPrimes(n, to);
      n = to;
    }
    await yieldToLoop(); // let I/O callbacks (other requests) run between slices
  }
  return count;
}

let pool, queue;
if (MODE === 'pool') {
  const { Piscina } = await import('piscina');
  pool = new Piscina({
    filename: new URL('./work.mjs', import.meta.url).href,
    minThreads: POOL_SIZE, maxThreads: POOL_SIZE,
    maxQueue: QUEUE_MAX, // beyond this run() rejects at once: admission control
  });
}
if (MODE === 'queue') {
  const { Queue } = await import('bullmq');
  queue = new Queue('heavy', { connection: REDIS });
}

// --- HTTP ------------------------------------------------------------------
const eld = monitorEventLoopDelay({ resolution: 10 });
eld.enable();
const json = (res, status, body, headers = {}) => res.writeHead(status, { 'content-type': 'application/json', ...headers }).end(JSON.stringify(body));

const server = http.createServer(async (req, res) => {
  const t = performance.now();
  try {
    if (req.url === '/ping') return res.end('pong');
    if (req.url === '/stats') {
      const ms = (v) => +(v / 1e6).toFixed(1);
      json(res, 200, { mode: MODE, poolSize: pool ? POOL_SIZE : null, eld: { p50: ms(eld.percentile(50)), p99: ms(eld.percentile(99)), max: ms(eld.max) } });
      return eld.reset();
    }
    if (req.method === 'POST' && req.url === '/heavy') {
      req.resume();
      if (MODE === 'block') return json(res, 200, { primes: await heavyBlocking(), ms: Math.round(performance.now() - t) });
      if (MODE === 'chunk') return json(res, 200, { primes: await heavyChunked(), ms: Math.round(performance.now() - t) });
      if (MODE === 'pool') {
        if (pool.queueSize >= QUEUE_MAX) return json(res, 503, { error: 'busy' }, { 'retry-after': '5' });
        return json(res, 200, { primes: await pool.run({ from: 0, to: N }), ms: Math.round(performance.now() - t) });
      }
      if (MODE === 'queue') {
        const job = await queue.add('count', { from: 0, to: N }, { removeOnComplete: { age: 3600 }, removeOnFail: { age: 3600 } });
        return json(res, 202, { id: job.id, status: `/jobs/${job.id}` }, { location: `/jobs/${job.id}` });
      }
    }
    if (MODE === 'queue' && req.url.startsWith('/jobs/')) {
      const job = await queue.getJob(req.url.slice(6));
      if (!job) return json(res, 404, {});
      return json(res, 200, { state: await job.getState(), result: job.returnvalue ?? null, processedOn: job.processedOn, finishedOn: job.finishedOn, timestamp: job.timestamp });
    }
    json(res, 404, {});
  } catch (e) {
    json(res, 500, { error: e.message });
  }
});
server.listen(PORT, '127.0.0.1', () => console.log(JSON.stringify({ ready: true, mode: MODE, poolSize: pool ? POOL_SIZE : null, availableParallelism: os.availableParallelism() })));

process.on('SIGTERM', async () => {
  server.close();
  await pool?.destroy();
  await queue?.close();
  process.exit(0);
});
