// Timeout without deadline propagation vs with AbortSignal, over real HTTP on loopback.
// Downstream work = 10 sequential steps of 100 ms (think: 10 DB queries).
// The caller's budget is 300 ms. We count how many steps the downstream actually ran.
// Run: node deadline.mjs

import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

const STEPS = 10, STEP_MS = 100, BUDGET_MS = 300;
const log = [];

const server = http.createServer(async (req, res) => {
  const mode = new URL(req.url, 'http://x').searchParams.get('mode');
  let signal;
  if (mode === 'close' || mode === 'deadline') {
    // Abort when the caller hangs up (connection closed before we answered).
    const ac = new AbortController();
    res.on('close', () => { if (!res.writableFinished) ac.abort(new Error('client gone')); });
    const signals = [ac.signal];
    if (mode === 'deadline') {
      // Propagated absolute deadline: stop even if nobody closes the connection.
      const deadline = Number(req.headers['x-deadline']);
      signals.push(AbortSignal.timeout(Math.max(0, deadline - Date.now())));
    }
    signal = AbortSignal.any(signals);
  }
  let done = 0;
  try {
    for (let i = 0; i < STEPS; i++) {
      await delay(STEP_MS, undefined, { signal }); // a real DB driver call would take the signal too
      done++;
    }
    res.end('ok');
  } catch (e) {
    if (!res.headersSent && !res.destroyed) res.writeHead(504).end();
  } finally {
    log.push({ mode, done });
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

async function caller(variant) {
  const t0 = performance.now();
  let outcome;
  try {
    if (variant === 'race') {
      // Common anti-pattern: a timeout that only stops *waiting*.
      outcome = await Promise.race([
        fetch(`${base}?mode=ignore`).then((r) => r.status),
        delay(BUDGET_MS).then(() => 'gave up (race)'),
      ]);
    } else if (variant === 'abort-ignored') {
      const r = await fetch(`${base}?mode=ignore`, { signal: AbortSignal.timeout(BUDGET_MS) });
      outcome = r.status;
    } else if (variant === 'abort-wired') {
      const r = await fetch(`${base}?mode=close`, { signal: AbortSignal.timeout(BUDGET_MS) });
      outcome = r.status;
    } else if (variant === 'race+deadline') {
      // Caller still forgets to abort, but propagates the deadline: callee stops on its own.
      outcome = await Promise.race([
        fetch(`${base}?mode=deadline`, { headers: { 'x-deadline': String(Date.now() + BUDGET_MS) } }).then((r) => r.status),
        delay(BUDGET_MS).then(() => 'gave up (race)'),
      ]);
    }
  } catch (e) { outcome = e.name; }
  return { outcome, ms: Math.round(performance.now() - t0) };
}

console.log(`node ${process.version}; downstream ${STEPS}×${STEP_MS} ms, caller budget ${BUDGET_MS} ms`);
console.log('variant | caller saw | caller ms | downstream steps actually executed');
for (const v of ['race', 'abort-ignored', 'abort-wired', 'race+deadline']) {
  log.length = 0;
  const r = await caller(v);
  await delay(STEPS * STEP_MS + 300); // let the downstream finish whatever it is still doing
  console.log(`${v} | ${r.outcome} | ${r.ms} | ${log.map((l) => l.done).join(',')}/${STEPS}`);
}
server.close();
server.closeAllConnections();
