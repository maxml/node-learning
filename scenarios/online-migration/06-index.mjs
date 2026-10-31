// 06. The index: CREATE INDEX vs CREATE INDEX CONCURRENTLY under write load,
// CIC waiting for an old snapshot, a failed CIC leaving an INVALID index,
// CIC in a transaction, and which index serves tenant-scoped queries.
import { client, load, sleep, now, summary, randInt, fmt } from './lib.mjs';

const c = await client('migration');
const IDX = 'orders_tenant_created_idx';
const DEF = `ON orders (tenant_id, created_at)`;

const write = (cl) =>
  Math.random() < 0.5
    ? cl.query('update orders set amount = amount + 0.01 where id = $1', [randInt(1, 5_000_000)])
    : cl.query(
        `insert into orders (account_id, status, amount, created_at, tenant_id)
         values ($1, 'new', 1, now(), 1 + ($1 % 1000))`,
        [randInt(1, 50_001)],
      );

async function build(label, sql) {
  await c.query(`DROP INDEX IF EXISTS ${IDX}`);
  const w = await load(4, write, 'api-write');
  await sleep(1000);
  const base = w.lat.length;
  w.reset();
  const t0 = now();
  await c.query(sql);
  const ms = now() - t0;
  const during = w.lat.length;
  await w.stop();
  const s = summary(w.lat);
  console.log(
    `${label} | build ${fmt(ms)} ms | writes during build ${during} (${Math.round(during / (ms / 1000))}/s, baseline ${base}/s) | write max ${s.max} ms`,
  );
}

console.log('== build under 4 writers (50% UPDATE, 50% INSERT)');
await build('CREATE INDEX             ', `CREATE INDEX ${IDX} ${DEF}`);
await build('CREATE INDEX CONCURRENTLY', `CREATE INDEX CONCURRENTLY ${IDX} ${DEF}`);

console.log('\n== CIC waits for any transaction holding an old snapshot (here: on another table)');
await c.query(`DROP INDEX IF EXISTS ${IDX}`);
const old = await client('long-report');
await old.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
await old.query('select count(*) from accounts'); // snapshot taken; never touches orders
const obs = await client('observer');
const phases = new Set();
let polling = true;
const poll = (async () => {
  while (polling) {
    const r = await obs.query("select phase from pg_stat_progress_create_index where relid = 'orders'::regclass");
    if (r.rows[0]) phases.add(r.rows[0].phase);
    await sleep(100);
  }
})();
const t0 = now();
const cic = c.query(`CREATE INDEX CONCURRENTLY ${IDX} ${DEF}`).then(() => now() - t0);
while (!phases.has('waiting for old snapshots')) await sleep(100);
const reached = now() - t0;
await sleep(5000); // the build is finished, yet it waits as long as the other transaction lives
const stuck = [...phases].at(-1);
const commitAt = now() - t0;
await old.query('COMMIT');
const cicMs = await cic;
polling = false;
await poll;
console.log(`phases seen: ${[...phases].join(' -> ')}`);
console.log(
  `reached "waiting for old snapshots" at ${fmt(reached)} ms, still "${stuck}" 5 s later; finished ${fmt(cicMs - commitAt)} ms after the other transaction committed`,
);
await old.end();

console.log('\n== failed CIC leaves an INVALID index');
await c.query(`DROP INDEX IF EXISTS ${IDX}`);
await c.query("SET statement_timeout = '1s'");
try {
  await c.query(`CREATE INDEX CONCURRENTLY ${IDX} ${DEF}`);
} catch (e) {
  console.log(`CIC cancelled: ${e.code} ${e.message}`);
}
await c.query('RESET statement_timeout');
const valid = async () =>
  (
    await c.query(
      `select i.indisvalid, i.indisready, pg_size_pretty(pg_relation_size(i.indexrelid)) size
       from pg_index i where i.indexrelid = $1::regclass`,
      [IDX],
    )
  ).rows[0];
console.log('cancelled during the first scan, left behind:', JSON.stringify(await valid()));
await c.query(`DROP INDEX ${IDX}`);

// A later failure: the build is done, CIC waits for an old snapshot, and the deploy job kills it.
const old2 = await client('long-report');
await old2.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
await old2.query('select count(*) from accounts');
const pidRow = (await c.query('select pg_backend_pid() p')).rows[0];
const late = c.query(`CREATE INDEX CONCURRENTLY ${IDX} ${DEF}`).catch((e) => e);
for (;;) {
  const r = await obs.query("select phase from pg_stat_progress_create_index where relid = 'orders'::regclass");
  if (r.rows[0]?.phase === 'waiting for old snapshots') break;
  await sleep(100);
}
await obs.query('select pg_cancel_backend($1)', [pidRow.p]);
const lateErr = await late;
await old2.query('COMMIT');
await old2.end();
console.log(`cancelled while "waiting for old snapshots" (${lateErr.code}), left behind:`, JSON.stringify(await valid()));
const notices = [];
c.on('notice', (n) => notices.push(n.message));
await c.query(`CREATE INDEX CONCURRENTLY IF NOT EXISTS ${IDX} ${DEF}`);
console.log(`re-run with IF NOT EXISTS: "${notices.at(-1)}" -> still`, JSON.stringify(await valid()));
await c.query(`DROP INDEX CONCURRENTLY ${IDX}`);
await c.query(`CREATE INDEX CONCURRENTLY ${IDX} ${DEF}`);
console.log('after DROP INDEX CONCURRENTLY + CIC:', JSON.stringify(await valid()));

console.log('\n== CIC inside a transaction (what a migration runner does by default)');
try {
  await c.query('BEGIN');
  await c.query(`CREATE INDEX CONCURRENTLY orders_tmp_idx ON orders (status)`);
} catch (e) {
  console.log(`${e.code} ${e.message}`);
  await c.query('ROLLBACK');
}

console.log('\n== which index serves "latest 50 orders of a tenant"');
await c.query('ANALYZE orders');
const Q = 'select id, amount, created_at from orders where tenant_id = 42 order by created_at desc limit 50';
async function plan(label) {
  const r = await c.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${Q}`);
  const p = r.rows[0]['QUERY PLAN'][0];
  const nodes = [];
  const walk = (n) => {
    nodes.push(n['Node Type'] + (n['Index Name'] ? `(${n['Index Name']})` : ''));
    (n.Plans ?? []).forEach(walk);
  };
  walk(p.Plan);
  const b = p.Plan['Shared Hit Blocks'] + p.Plan['Shared Read Blocks'];
  console.log(`${label} | ${nodes.join(' > ')} | buffers ${b} | ${p['Execution Time'].toFixed(2)} ms`);
}
await plan('(tenant_id, created_at)');
await c.query(`DROP INDEX ${IDX}`);
await c.query('CREATE INDEX orders_tenant_only_idx ON orders (tenant_id)');
await plan('(tenant_id) only       ');
await c.query('DROP INDEX orders_tenant_only_idx');
await c.query('CREATE INDEX orders_created_only_idx ON orders (created_at)');
await plan('(created_at) only      ');
await c.query('DROP INDEX orders_created_only_idx');
await c.query(`CREATE INDEX CONCURRENTLY ${IDX} ${DEF}`);
await obs.end();
await c.end();
