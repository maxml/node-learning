// Circuit breaker (opossum) in front of a dependency that hangs for 3 s, then recovers.
// The caller fires one request every 20 ms for 6 s; per-call timeout 500 ms.
// Run: node circuit-breaker.mjs

import http from 'node:http';
import { createRequire } from 'node:module';
import CircuitBreaker from 'opossum';
import { setTimeout as delay } from 'node:timers/promises';
import { percentile } from './lib.mjs';

const opossumVersion = createRequire(import.meta.url)('opossum/package.json').version;
const DEAD_MS = 3000, RUN_MS = 6000, EVERY_MS = 20, TIMEOUT_MS = 500;

let t0 = 0, hits = 0, deadHits = 0, inflight = 0, maxInflight = 0;
const server = http.createServer((req, res) => {
  hits++;
  inflight++; maxInflight = Math.max(maxInflight, inflight);
  res.on('close', () => inflight--);
  if (performance.now() - t0 < DEAD_MS) { deadHits++; return; } // hang: never answer
  setTimeout(() => res.end('ok'), 5);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

async function callDependency() {
  const r = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!r.ok) throw new Error(`status ${r.status}`);
  return r.text();
}

async function run(useBreaker) {
  hits = 0; deadHits = 0; maxInflight = 0;
  const events = [];
  const breaker = useBreaker
    ? new CircuitBreaker(callDependency, {
        timeout: TIMEOUT_MS,
        errorThresholdPercentage: 50,
        volumeThreshold: 10, // do not open on the first lone failure (default is 0!)
        resetTimeout: 1000, // after 1 s open → half-open, one trial call
        rollingCountTimeout: 10000,
      })
    : null;
  if (breaker) for (const e of ['open', 'halfOpen', 'close']) breaker.on(e, () => events.push(`${e}@${Math.round(performance.now() - t0)}`));

  const results = [];
  t0 = performance.now();
  const pending = [];
  while (performance.now() - t0 < RUN_MS) {
    const start = performance.now();
    pending.push(
      (breaker ? breaker.fire() : callDependency()).then(
        () => results.push({ start: start - t0, ms: performance.now() - start, ok: true }),
        (e) => results.push({ start: start - t0, ms: performance.now() - start, ok: false, code: e.code ?? e.name }),
      ),
    );
    await delay(EVERY_MS);
  }
  await Promise.all(pending);
  breaker?.shutdown();

  const dead = results.filter((r) => r.start < DEAD_MS).map((r) => r.ms).sort((a, b) => a - b);
  const firstOk = results.filter((r) => r.ok && r.start >= DEAD_MS).sort((a, b) => a.start - b.start)[0];
  const rejected = results.filter((r) => r.code === 'EOPENBREAKER').length;
  return {
    calls: results.length,
    hits, deadHits, maxInflight, rejected,
    deadP50: percentile(dead, 50), deadP99: percentile(dead, 99),
    firstOkAfterRevival: firstOk ? Math.round(firstOk.start - DEAD_MS) : null,
    ok: results.filter((r) => r.ok).length,
    events,
  };
}

console.log(`node ${process.version}, opossum ${opossumVersion}; dependency hangs ${DEAD_MS} ms then answers in 5 ms; `
  + `1 call / ${EVERY_MS} ms for ${RUN_MS} ms; timeout ${TIMEOUT_MS} ms`);
for (const useBreaker of [false, true]) {
  const r = await run(useBreaker);
  console.log(`\n${useBreaker ? 'з circuit breaker' : 'без breaker'}`);
  console.log(`  calls fired: ${r.calls}, reached dependency: ${r.hits} (while dead: ${r.deadHits}), `
    + `rejected fast by breaker: ${r.rejected}, succeeded: ${r.ok}`);
  console.log(`  caller latency while dead: p50 ${r.deadP50.toFixed(1)} ms, p99 ${r.deadP99.toFixed(1)} ms; `
    + `max concurrent requests held at dependency: ${r.maxInflight}`);
  console.log(`  first success after dependency revived: +${r.firstOkAfterRevival} ms`);
  if (r.events.length) console.log(`  state changes (ms): ${r.events.join(' ')}`);
}
server.closeAllConnections();
server.close();
