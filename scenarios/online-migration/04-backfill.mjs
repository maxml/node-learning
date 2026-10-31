// 04. Batched backfill of orders.tenant_id from accounts.
//   node 04-backfill.mjs sweep                 batch-size sweep on separate 500k-row id ranges,
//                                              with concurrent single-row UPDATEs on the same rows
//   node 04-backfill.mjs run [--batch 10000] [--sleep 0] [--crash-after N]
//                                              restartable job: progress row committed with each batch
import { client, load, sleep, now, summary, randInt, fmt, currentLsn, walBytesSince } from './lib.mjs';

const args = Object.fromEntries(
  process.argv.slice(3).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
);
const mode = process.argv[2] ?? 'run';

// One batch = one short transaction: keyset range on the PK, idempotent (only NULL rows),
// progress saved in the same transaction, so a crash loses at most the batch in flight.
async function batch(c, job, lo, hi) {
  await c.query('BEGIN');
  const r = await c.query(
    `UPDATE orders o SET tenant_id = a.tenant_id
       FROM accounts a
      WHERE o.id > $1 AND o.id <= $2 AND o.tenant_id IS NULL AND a.id = o.account_id`,
    [lo, hi],
  );
  await c.query(
    `INSERT INTO backfill_progress (job, last_id, rows_done, updated_at) VALUES ($1, $2, $3, now())
     ON CONFLICT (job) DO UPDATE SET last_id = $2, rows_done = backfill_progress.rows_done + $3, updated_at = now()`,
    [job, hi, r.rowCount],
  );
  await c.query('COMMIT');
  return r.rowCount;
}

const c = await client('backfill');
await c.query(`CREATE TABLE IF NOT EXISTS backfill_progress (
  job text PRIMARY KEY, last_id bigint NOT NULL, rows_done bigint NOT NULL DEFAULT 0,
  target_id bigint, updated_at timestamptz)`);

async function stats() {
  const r = await c.query(
    "select n_tup_upd::bigint u, n_tup_hot_upd::bigint h from pg_stat_user_tables where relname = 'orders'",
  );
  return { u: Number(r.rows[0].u), h: Number(r.rows[0].h) };
}

if (mode === 'sweep') {
  const RANGE = 500_000;
  const sizes = [1_000, 10_000, 100_000, RANGE];
  console.log('batch | rows/s | batch avg ms | batch max ms | WAL bytes/row | HOT % | app UPDATEs/s | app UPDATE p99 / max ms');
  let start = 0;
  for (const size of sizes) {
    const lo0 = start;
    const hi0 = start + RANGE;
    start = hi0;
    const job = `sweep-${size}`;
    await c.query('DELETE FROM backfill_progress WHERE job = $1', [job]);
    await c.query('select pg_stat_force_next_flush()');
    const s0 = await stats();
    const lsn = await currentLsn(c);
    // application traffic touching the same rows the backfill is updating
    const app = await load(4, (cl) => cl.query('update orders set amount = amount + 0.01 where id = $1', [randInt(lo0 + 1, hi0 + 1)]), 'app');
    const durs = [];
    let rows = 0;
    const t0 = now();
    for (let lo = lo0; lo < hi0; lo += size) {
      const tb = now();
      rows += await batch(c, job, lo, Math.min(lo + size, hi0));
      durs.push(now() - tb);
    }
    const total = (now() - t0) / 1000;
    await app.stop(); // waits for UPDATEs still blocked on the last batch, so they are counted
    const w = summary(app.lat);
    const wal = await walBytesSince(c, lsn);
    await c.query('select pg_stat_force_next_flush()');
    await sleep(600);
    const s1 = await stats();
    const hot = ((s1.h - s0.h) / Math.max(1, s1.u - s0.u)) * 100;
    console.log(
      `${size} | ${Math.round(rows / total)} | ${fmt(durs.reduce((a, b) => a + b, 0) / durs.length)} | ${fmt(Math.max(...durs))} | ${Math.round(wal / rows)} | ${hot.toFixed(0)} | ${Math.round(w.n / total)} | ${w.p99} / ${w.max}`,
    );
  }
} else {
  const size = Number(args.batch ?? 10_000);
  const pause = Number(args.sleep ?? 0);
  const crashAfter = args['crash-after'] ? Number(args['crash-after']) : Infinity;
  const job = 'orders-tenant-id';
  // the target is fixed on the first start; rows inserted later are covered by dual-write (03)
  await c.query(
    `INSERT INTO backfill_progress (job, last_id, target_id) SELECT $1, 0, max(id) FROM orders
     ON CONFLICT (job) DO NOTHING`,
    [job],
  );
  const p = (await c.query('SELECT last_id, target_id, rows_done FROM backfill_progress WHERE job = $1', [job])).rows[0];
  console.log(`start: last_id=${p.last_id} target_id=${p.target_id} rows_done=${p.rows_done} batch=${size} sleep=${pause}ms`);
  let lo = Number(p.last_id);
  const target = Number(p.target_id);
  let n = 0;
  let rows = 0;
  const lsn = await currentLsn(c);
  const t0 = now();
  while (lo < target) {
    if (n === crashAfter) {
      console.log(`simulated crash after ${n} batches at last_id=${lo}`);
      process.exit(1);
    }
    rows += await batch(c, job, lo, Math.min(lo + size, target));
    lo = Math.min(lo + size, target);
    n++;
    if (pause) await sleep(pause);
  }
  const secs = (now() - t0) / 1000;
  const wal = await walBytesSince(c, lsn);
  const left = (await c.query('SELECT count(*)::int n FROM orders WHERE tenant_id IS NULL')).rows[0].n;
  console.log(
    `done: ${n} batches, ${rows} rows in ${secs.toFixed(1)} s (${Math.round(rows / secs)} rows/s), WAL ${(wal / 2 ** 20).toFixed(0)} MiB (${(wal / 2 ** 20 / secs).toFixed(1)} MiB/s); rows with tenant_id NULL left: ${left}`,
  );
}
await c.end();
