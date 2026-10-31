// The API in front of three internal services. Plain node:http + pg + global fetch:
// a NestJS controller would add DI and decorators, but the failure mechanics (fetch without
// a deadline, a pool connection held across a remote call) are the same, so Nest is left out.
//
// MODE=naive    no timeouts (global fetch defaults), DB transaction open across the remote calls
// MODE=retries  as naive + 5 s timeout per attempt and 3 immediate attempts on every call
// MODE=retries-notx  as retries, but the DB transaction runs after the remote calls: isolates
//               the retry amplification from the pool exhaustion
// MODE=fixed    1 s deadline budget, per-call timeouts from the remaining budget, bulkhead and
//               circuit breaker on the loyalty service, no retries, degraded response without
//               loyalty, DB transaction only after the remote calls, load shedding at MAX_INFLIGHT
//
// Prints one JSON stats line per second to stdout.

import http from 'node:http';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import pg from 'pg';
import CircuitBreaker from 'opossum';

const MODE = process.env.MODE ?? 'naive';
const PORT = Number(process.env.PORT ?? 4000);
const BASE = Number(process.env.BASE_PORT ?? 4101);
const PG_URL = process.env.PG_URL ?? 'postgres://postgres:postgres@127.0.0.1:55442/postgres';
const POOL_MAX = 10;
const BUDGET_MS = 1000; // fixed: whole request must finish within 1 s
const C_TIMEOUT_MS = 500; // fixed: loyalty p99.9 is ~220 ms when healthy
const C_BULKHEAD = 25; // fixed: healthy need is 50 rps x 0.2 s = 10 concurrent
const MAX_INFLIGHT = 200; // fixed: shed above this

const url = { A: `http://127.0.0.1:${BASE}/`, B: `http://127.0.0.1:${BASE + 1}/`, C: `http://127.0.0.1:${BASE + 2}/` };
const fixed = MODE === 'fixed';

const pool = new pg.Pool({
  connectionString: PG_URL,
  max: POOL_MAX,
  connectionTimeoutMillis: fixed ? 300 : 0, // 0 = pg default: wait for a connection forever
});
const monitor = new pg.Client({ connectionString: PG_URL }); // outside the pool, for stats only
await monitor.connect();
await monitor.query('CREATE TABLE IF NOT EXISTS orders (id bigserial PRIMARY KEY, customer int, status text, body jsonb)');

const stats = { inflight: 0, order: 0, profile: 0, shed: 0, attempts: { A: 0, B: 0, C: 0 }, bulkheadRejects: 0, breakerRejects: 0 };

// ---------- outbound calls ----------
async function rawCall(svc, signal) {
  stats.attempts[svc]++;
  const r = await fetch(url[svc], { signal });
  if (!r.ok) throw new Error(`${svc} status ${r.status}`);
  return r.json();
}

async function callNaive(svc) {
  if (MODE === 'naive') return rawCall(svc); // no signal: undici headersTimeout 300 s applies
  let last;
  for (let i = 0; i < 3; i++) {
    try { return await rawCall(svc, AbortSignal.timeout(5000)); } catch (e) { last = e; }
  }
  throw last;
}

// fixed: bulkhead (fail-fast semaphore) + breaker in front of C only
let cInUse = 0;
const breakerC = new CircuitBreaker((signal) => rawCall('C', signal), {
  timeout: false, // the deadline signal does the timing out
  errorThresholdPercentage: 50,
  volumeThreshold: 20,
  resetTimeout: 5000,
  rollingCountTimeout: 10000,
});
async function callC(deadline) {
  if (cInUse >= C_BULKHEAD) { stats.bulkheadRejects++; throw new Error('bulkhead full'); }
  if (breakerC.opened) { stats.breakerRejects++; throw new Error('breaker open'); }
  cInUse++;
  try {
    return await breakerC.fire(AbortSignal.timeout(Math.max(1, Math.min(C_TIMEOUT_MS, deadline - Date.now()))));
  } finally { cInUse--; }
}
const callWithin = (svc, deadline) => rawCall(svc, AbortSignal.timeout(Math.max(1, deadline - Date.now())));

// ---------- handlers ----------
async function order(body) {
  if (MODE === 'retries-notx') {
    const [a, b, c] = await Promise.all([callNaive('A'), callNaive('B'), callNaive('C')]);
    const { rows } = await pool.query('INSERT INTO orders (customer, status, body) VALUES ($1, $2, $3) RETURNING id', [body.customer, 'priced', body]);
    return { status: 200, body: { id: rows[0].id, parts: [a.svc, b.svc, c.svc] } };
  }
  if (!fixed) {
    // anti-pattern: the pool connection (and an open transaction) waits for the remote calls
    const db = await pool.connect();
    try {
      await db.query('BEGIN');
      const { rows } = await db.query('INSERT INTO orders (customer, status, body) VALUES ($1, $2, $3) RETURNING id', [body.customer, 'new', body]);
      const [a, b, c] = await Promise.all([callNaive('A'), callNaive('B'), callNaive('C')]);
      await db.query('UPDATE orders SET status = $1 WHERE id = $2', ['priced', rows[0].id]);
      await db.query('COMMIT');
      return { status: 200, body: { id: rows[0].id, parts: [a.svc, b.svc, c.svc] } };
    } catch (e) {
      await db.query('ROLLBACK').catch(() => {});
      throw e;
    } finally { db.release(); }
  }
  const deadline = Date.now() + BUDGET_MS;
  const [a, b, c] = await Promise.allSettled([callWithin('A', deadline), callWithin('B', deadline), callC(deadline)]);
  if (a.status === 'rejected' || b.status === 'rejected') return { status: 503, body: { error: 'dependency unavailable' } };
  const degraded = c.status === 'rejected'; // loyalty is not critical: accept the order, price points later
  const db = await pool.connect(); // only now, and only for a short local transaction
  try {
    await db.query('BEGIN');
    const { rows } = await db.query('INSERT INTO orders (customer, status, body) VALUES ($1, $2, $3) RETURNING id', [body.customer, degraded ? 'loyalty_pending' : 'priced', body]);
    await db.query('COMMIT');
    return { status: 200, body: { id: rows[0].id, degraded } };
  } catch (e) {
    await db.query('ROLLBACK').catch(() => {});
    throw e;
  } finally { db.release(); }
}

async function profile(id) {
  const deadline = Date.now() + BUDGET_MS;
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM orders WHERE customer = $1', [id]);
  const a = fixed ? await callWithin('A', deadline) : await callNaive('A');
  return { status: 200, body: { customer: id, orders: rows[0].n, svc: a.svc } };
}

const server = http.createServer(async (req, res) => {
  if (fixed && stats.inflight >= MAX_INFLIGHT) { // shed before reading the body
    stats.shed++;
    res.writeHead(503, { 'retry-after': '1' }).end();
    req.resume();
    return;
  }
  stats.inflight++;
  res.on('close', () => stats.inflight--);
  try {
    let result;
    if (req.url.startsWith('/order')) {
      stats.order++;
      const chunks = [];
      for await (const c of req) chunks.push(c);
      result = await order(JSON.parse(Buffer.concat(chunks)));
    } else if (req.url.startsWith('/profile')) {
      stats.profile++;
      req.resume();
      result = await profile(Number(new URL(req.url, 'http://x').searchParams.get('id') ?? 1));
    } else { result = { status: 404, body: {} }; }
    if (!res.destroyed) res.writeHead(result.status, { 'content-type': 'application/json' }).end(JSON.stringify(result.body));
  } catch (e) {
    if (!res.destroyed) res.writeHead(fixed ? 503 : 500).end(String(e.message));
  }
});
server.keepAliveTimeout = 65_000;
server.listen(PORT, '127.0.0.1');

// ---------- stats ----------
const eld = monitorEventLoopDelay({ resolution: 10 });
eld.enable();
const t0 = Date.now();
setInterval(async () => {
  const m = process.memoryUsage();
  let idleInTx = null;
  try {
    const { rows } = await monitor.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE state = 'idle in transaction'");
    idleInTx = rows[0].n;
  } catch {}
  console.log(JSON.stringify({
    t: Math.round((Date.now() - t0) / 1000),
    inflight: stats.inflight,
    rssMB: Math.round(m.rss / 2 ** 20),
    heapMB: Math.round(m.heapUsed / 2 ** 20),
    poolWaiting: pool.waitingCount,
    poolTotal: pool.totalCount,
    idleInTx,
    eldP99ms: Math.round(eld.percentile(99) / 1e6),
    breaker: breakerC.opened ? 'open' : breakerC.halfOpen ? 'half' : 'closed',
    attempts: { ...stats.attempts },
    shed: stats.shed,
    bulkheadRejects: stats.bulkheadRejects,
    breakerRejects: stats.breakerRejects,
  }));
  eld.reset();
}, 1000);
console.log(JSON.stringify({ ready: true, mode: MODE }));
