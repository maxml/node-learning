// 02. The lock-queue trap.
// A: a long transaction that touched `orders` (ACCESS SHARE, held until COMMIT) — e.g. a report.
// B: a "metadata-only" ALTER that needs ACCESS EXCLUSIVE and waits behind A.
// C: normal traffic (point SELECTs). They queue behind B, not behind A.
// Run 1: B without lock_timeout.  Run 2: B with lock_timeout = 200ms and retries with backoff.
import { client, load, sleep, now, summary, randInt, fmt } from './lib.mjs';

const HOLD_MS = 5000;

async function scenario(withTimeout) {
  const a = await client('long-report');
  const b = await client('migration');
  const traffic = await load(8, (c) => c.query('select amount from orders where id = $1', [randInt(1, 5_000_000)]), 'api');
  await sleep(1000);
  traffic.reset();

  await a.query('BEGIN');
  await a.query('select count(*) from orders where id < 1000'); // ACCESS SHARE held until COMMIT
  const tStart = now();
  setTimeout(() => a.query('COMMIT'), HOLD_MS);

  let attempts = 0;
  let snapshot = null;
  const ddl = (async () => {
    if (withTimeout) await b.query("SET lock_timeout = '200ms'");
    for (;;) {
      attempts++;
      try {
        await b.query('ALTER TABLE orders ADD COLUMN exp_lockq int');
        return now() - tStart;
      } catch (e) {
        if (e.code !== '55P03') throw e;
        await sleep(Math.min(2000, 100 * 2 ** attempts)); // backoff; traffic flows in the gaps
      }
    }
  })();

  // what the lock table looks like 1s in
  setTimeout(async () => {
    const o = await client('observer');
    snapshot = (
      await o.query(`select application_name app, l.mode, l.granted, count(*)::int n
        from pg_locks l join pg_stat_activity s using (pid)
        where l.relation = 'orders'::regclass group by 1,2,3 order by 3 desc, 1`)
    ).rows;
    await o.end();
  }, 1000);

  const ddlDone = await ddl;
  await sleep(500);
  const windowS = (now() - tStart) / 1000;
  const s = summary(traffic.lat);
  const slow = traffic.lat.filter((x) => x > 100).length;
  await traffic.stop();
  await b.query('ALTER TABLE orders DROP COLUMN exp_lockq');
  await a.end();
  await b.end();
  console.log(`\n== ${withTimeout ? "lock_timeout = '200ms' + retry with backoff" : 'no lock_timeout'}`);
  console.table(snapshot);
  console.log(
    `ALTER done after ${fmt(ddlDone)} ms, attempts=${attempts}; traffic over ${windowS.toFixed(1)} s: ${s.n} queries (${Math.round(s.n / windowS)}/s), p50=${s.p50} ms, p99=${s.p99} ms, max=${s.max} ms, >100ms: ${slow}`,
  );
}

await scenario(false);
await scenario(true);
