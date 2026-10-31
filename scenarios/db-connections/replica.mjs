// One "API replica": a separate Node process with its own pg.Pool, receiving requests at a
// fixed arrival rate (open loop: users do not slow down because we are slow).
// Started by fleet.mjs via fork(); reports raw latencies back over IPC.
import pg from 'pg';
import { monitorEventLoopDelay } from 'node:perf_hooks';

const cfg = JSON.parse(process.argv[2]);
const QUERIES = {
  // the slow API query: sequential scan over 300k rows (no index on customer_id)
  api: 'select count(*), coalesce(sum(amount), 0) from orders where customer_id = $1',
  // the scheduled report the workers run
  report: 'select account % 100 as bucket, sum(delta), count(*) from ledger group by 1',
};

const pool = new pg.Pool({
  host: cfg.host,
  port: cfg.port,
  user: 'app',
  password: 'app',
  database: 'postgres',
  max: cfg.pool,
  connectionTimeoutMillis: cfg.connTimeout, // 0 = wait forever (node-postgres default)
  statement_timeout: cfg.stmtTimeout || undefined,
  application_name: cfg.role,
});
pool.on('error', () => {}); // idle client errors must not crash the replica

const eld = monitorEventLoopDelay({ resolution: 10 });
eld.enable();

const lat = [];
const wait = [];
const errors = {};
let inflight = 0;
let maxInflight = 0;
const now = () => performance.now();

async function request() {
  inflight++;
  maxInflight = Math.max(maxInflight, inflight);
  const t0 = now();
  let client;
  try {
    client = await pool.connect();
  } catch (e) {
    const k = e.code ?? (e.message.includes('timeout exceeded') ? 'pool-timeout' : e.message.slice(0, 40));
    errors[k] = (errors[k] ?? 0) + 1;
    inflight--;
    return;
  }
  const t1 = now();
  // a checked-out client can be dropped by the server or PgBouncer (query_wait_timeout);
  // without a listener that 'error' event would crash the whole replica
  const onError = () => {};
  client.on('error', onError);
  let broken;
  try {
    const param = cfg.role === 'worker' ? [] : [1 + Math.floor(Math.random() * 50000)];
    await client.query(QUERIES[cfg.role === 'worker' ? 'report' : 'api'], param);
    lat.push(now() - t0);
    wait.push(t1 - t0);
  } catch (e) {
    const k = e.code ?? (/terminated|ended/i.test(e.message) ? 'connection-dropped' : 'error');
    errors[k] = (errors[k] ?? 0) + 1;
    broken = e;
  } finally {
    client.off('error', onError);
    client.release(broken); // a broken client is destroyed, not returned to the pool
    inflight--;
  }
}

const deadline = now() + cfg.durationMs;
if (cfg.role === 'worker') {
  // scheduled job: `jobs` report queries in a closed loop for the whole run
  await Promise.all(
    Array.from({ length: cfg.jobs }, async () => {
      while (now() < deadline) await request();
    }),
  );
} else {
  // open loop: one request every 1000/rate ms, independent of how fast we answer
  const interval = 1000 / cfg.rate;
  let next = now() + Math.random() * interval;
  const pending = [];
  while (next < deadline) {
    const d = next - now();
    if (d > 0) await new Promise((r) => setTimeout(r, d));
    pending.push(request());
    next += interval;
  }
  // give the queue a bounded time to drain; whatever is left counts as unfinished
  const drained = await Promise.race([
    Promise.all(pending).then(() => true),
    new Promise((r) => setTimeout(() => r(false), cfg.drainMs)),
  ]);
  if (!drained) errors.unfinished = inflight;
}

eld.disable();
process.send({ lat, wait, errors, maxInflight, eldP99: eld.percentile(99) / 1e6 }, () => process.exit(0));
