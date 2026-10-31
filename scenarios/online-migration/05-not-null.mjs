// 05. Making tenant_id required without a long ACCESS EXCLUSIVE scan.
// (a) naive SET NOT NULL: full scan under ACCESS EXCLUSIVE
// (b) CHECK (tenant_id IS NOT NULL) NOT VALID -> VALIDATE -> SET NOT NULL (scan skipped)
// (c) PostgreSQL 18: ADD CONSTRAINT … NOT NULL tenant_id NOT VALID -> VALIDATE
// Each step runs with concurrent reads and writes on the table; we report what they felt.
import { client, load, sleep, now, summary, randInt, fmt } from './lib.mjs';

const c = await client('migration');
const notices = [];
c.on('notice', (n) => notices.push(n.message));

async function step(label, fn) {
  const reads = await load(4, (cl) => cl.query('select amount from orders where id = $1', [randInt(1, 5_000_000)]), 'api-read');
  const writes = await load(2, (cl) => cl.query('update orders set amount = amount + 0.01 where id = $1', [randInt(1, 5_000_000)]), 'api-write');
  await sleep(300);
  reads.reset();
  writes.reset();
  const t0 = now();
  const res = await fn();
  const extra = typeof res === 'string' ? res : '';
  const ms = now() - t0;
  await sleep(300);
  await reads.stop();
  await writes.stop();
  const r = summary(reads.lat);
  const w = summary(writes.lat);
  console.log(`${label} | ${fmt(ms)} ms | reads max ${r.max} ms | writes max ${w.max} ms${extra ? ' | ' + extra : ''}`);
}

const lockMode = async (sql) => {
  await c.query('BEGIN');
  await c.query(sql);
  const m = (
    await c.query("select string_agg(mode, ',') m from pg_locks where relation = 'orders'::regclass and pid = pg_backend_pid()")
  ).rows[0].m;
  await c.query('COMMIT');
  return m;
};

// start from a nullable column without constraints (makes the script re-runnable)
await c.query('ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_tenant_id_chk');
await c.query('ALTER TABLE orders ALTER COLUMN tenant_id DROP NOT NULL');

const nulls = (await c.query('select count(*)::int n from orders where tenant_id is null')).rows[0].n;
console.log(`rows with tenant_id NULL before: ${nulls}\nstep | duration | concurrent reads | concurrent writes | note`);

// (a) naive
await step('(a) SET NOT NULL, naive (rolled back)', async () => {
  await c.query('BEGIN');
  await c.query('ALTER TABLE orders ALTER COLUMN tenant_id SET NOT NULL');
  await c.query('ROLLBACK');
});

// (b) CHECK NOT VALID -> VALIDATE -> SET NOT NULL
await step('(b1) ADD CHECK … NOT VALID', () =>
  c.query('ALTER TABLE orders ADD CONSTRAINT orders_tenant_id_chk CHECK (tenant_id IS NOT NULL) NOT VALID'),
);
await step('(b2) VALIDATE CONSTRAINT', async () =>
  'lock: ' + (await lockMode('ALTER TABLE orders VALIDATE CONSTRAINT orders_tenant_id_chk')),
);
await step('(b3) SET NOT NULL using the CHECK', async () => {
  await c.query('SET client_min_messages = debug1');
  notices.length = 0;
  await c.query('ALTER TABLE orders ALTER COLUMN tenant_id SET NOT NULL');
  await c.query('RESET client_min_messages');
  return notices.filter((m) => m.includes('sufficient')).join('; ') || 'no DEBUG message';
});
await c.query('ALTER TABLE orders DROP CONSTRAINT orders_tenant_id_chk');

// (c) PostgreSQL 18: NOT NULL … NOT VALID
await c.query('ALTER TABLE orders ALTER COLUMN tenant_id DROP NOT NULL');
await step('(c1) ADD CONSTRAINT … NOT NULL tenant_id NOT VALID', () =>
  c.query('ALTER TABLE orders ADD CONSTRAINT orders_tenant_id_not_null NOT NULL tenant_id NOT VALID'),
);
const cat = async () =>
  (
    await c.query(`select a.attnotnull, k.convalidated from pg_attribute a
     join pg_constraint k on k.conrelid = a.attrelid and k.conname = 'orders_tenant_id_not_null'
     where a.attrelid = 'orders'::regclass and a.attname = 'tenant_id'`)
  ).rows[0];
console.log('    catalog after NOT VALID:', JSON.stringify(await cat()));
// new rows are checked already (trigger disabled for this session so it cannot fill the value)
await c.query('SET session_replication_role = replica');
try {
  await c.query("insert into orders (account_id, status, amount, created_at) values (1, 'new', 1, now())");
  console.log('    insert with NULL tenant_id: accepted');
} catch (e) {
  console.log(`    insert with NULL tenant_id: rejected (${e.code} ${e.message})`);
}
await c.query('RESET session_replication_role');
await step('(c2) VALIDATE CONSTRAINT (NOT NULL)', async () =>
  'lock: ' + (await lockMode('ALTER TABLE orders VALIDATE CONSTRAINT orders_tenant_id_not_null')),
);
console.log('    catalog after VALIDATE:', JSON.stringify(await cat()));

// Does NOT VALID really skip existing NULLs? On a small table that has one.
await c.query('DROP TABLE IF EXISTS nn_probe; CREATE TABLE nn_probe (x int); INSERT INTO nn_probe VALUES (1), (NULL)');
await c.query('ALTER TABLE nn_probe ADD CONSTRAINT nn_probe_x NOT NULL x NOT VALID');
try {
  await c.query('ALTER TABLE nn_probe VALIDATE CONSTRAINT nn_probe_x');
} catch (e) {
  console.log(`    probe: NOT VALID added over an existing NULL; VALIDATE -> ${e.code} ${e.message}`);
}
await c.query('DROP TABLE nn_probe');

// The tempting shortcut: SET NOT NULL over an invalid not-null constraint. The docs say it
// "validates it", but under SET NOT NULL's own ACCESS EXCLUSIVE lock.
await c.query('ALTER TABLE orders ALTER COLUMN tenant_id DROP NOT NULL');
await c.query('ALTER TABLE orders ADD CONSTRAINT orders_tenant_id_not_null NOT NULL tenant_id NOT VALID');
await step('(c3) SET NOT NULL over the NOT VALID one', async () =>
  'lock: ' + (await lockMode('ALTER TABLE orders ALTER COLUMN tenant_id SET NOT NULL')),
);
console.log('    catalog after SET NOT NULL:', JSON.stringify(await cat()));
await c.end();
