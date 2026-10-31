// RLS behaviour on PostgreSQL 18 that the scenario answer relies on. Run after `npm run setup`.
import pg from 'pg';
import { ADMIN_URL, APP_URL } from './config.js';

const admin = new pg.Client({ connectionString: ADMIN_URL });
await admin.connect();
// max: 1 makes "the next request gets the same pooled connection" deterministic.
const pool = new pg.Pool({ connectionString: APP_URL, max: 1 });
const notices: string[] = [];
pool.on('connect', (c) => c.on('notice', (n) => notices.push(`${n.severity}: ${n.message}`)));

const count = async (q: { query: pg.Pool['query'] }, table = 'orders') =>
  (await q.query(`SELECT count(*)::int AS n FROM ${table}`)).rows[0].n as number;
const show = (label: string, value: unknown) => console.log(`${label.padEnd(68)} ${JSON.stringify(value)}`);
const errorOf = async (fn: () => Promise<unknown>) => {
  try { await fn(); return 'no error'; } catch (e) { const err = e as { code?: string; message: string }; return `${err.code} ${err.message}`; }
};

show('1. app_user, tenant never set: visible rows', await count(pool));

// 2. Session-level setting on a pooled connection: survives release, next checkout inherits it.
await pool.query("SELECT set_config('app.tenant_id', '1', false)");          // request A, plain SET
show('2. plain SET by request A, then request B forgets to set: B sees rows', await count(pool));
await pool.query('DISCARD ALL');                                               // reset the connection

// 3. Transaction-scoped: SET LOCAL semantics via set_config(..., true).
{
  const c = await pool.connect();
  await c.query('BEGIN');
  await c.query("SELECT set_config('app.tenant_id', '1', true)");
  show('3a. inside tx with SET LOCAL tenant 1: visible rows', await count(c));
  await c.query('COMMIT');
  c.release();
  show('3b. next request on the same connection: visible rows', await count(pool));
  show("3c. ... and current_setting('app.tenant_id', true) is now",
    (await pool.query("SELECT current_setting('app.tenant_id', true) AS v")).rows[0].v);
}

// 4. SET LOCAL outside a transaction block: warning, no effect.
await pool.query('DISCARD ALL');
await pool.query("SET LOCAL app.tenant_id = '2'");
show('4. SET LOCAL outside a transaction: notices', notices.splice(0));
show('   visible rows afterwards', await count(pool));

// 5. Naive policy without NULLIF: '' after the first SET LOCAL breaks the cast.
await admin.query(`
  DROP TABLE IF EXISTS orders_naive;
  CREATE TABLE orders_naive AS SELECT * FROM orders;
  ALTER TABLE orders_naive ENABLE ROW LEVEL SECURITY;
  CREATE POLICY p ON orders_naive USING (tenant_id = current_setting('app.tenant_id', true)::int);
  GRANT SELECT ON orders_naive TO app_user;`);
{
  const fresh = new pg.Client({ connectionString: APP_URL });
  await fresh.connect();
  show('5a. naive policy, fresh session, setting never touched: rows', await count(fresh, 'orders_naive'));
  await fresh.end();
}
await pool.query('DISCARD ALL');
show('5b. naive policy, pooled session after DISCARD ALL', await errorOf(() => count(pool, 'orders_naive')));
{
  const c = await pool.connect();
  await c.query('BEGIN'); await c.query("SELECT set_config('app.tenant_id', '1', true)"); await c.query('COMMIT');
  c.release();
}
show('5c. naive policy, after one SET LOCAL transaction ended', await errorOf(() => count(pool, 'orders_naive')));

// 6. WITH CHECK: cannot write a row for another tenant.
show('6. tenant 1 inserts a row with tenant_id = 2', await errorOf(async () => {
  const c = await pool.connect();
  try {
    await c.query('BEGIN'); await c.query("SELECT set_config('app.tenant_id', '1', true)");
    await c.query("INSERT INTO orders (tenant_id, item) VALUES (2, 'planted')");
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));

// 7. Unique/PK checks bypass RLS: a covert channel that reveals another tenant's id exists.
show('7. tenant 1 inserts id = 6 (row of tenant 2, invisible to tenant 1)', await errorOf(async () => {
  const c = await pool.connect();
  try {
    await c.query('BEGIN'); await c.query("SELECT set_config('app.tenant_id', '1', true)");
    show('   tenant 1 can see id 6?', (await c.query('SELECT count(*)::int AS n FROM orders WHERE id = 6')).rows[0].n);
    await c.query("INSERT INTO orders (id, tenant_id, item) VALUES (6, 1, 'probe')");
    await c.query('COMMIT');
  } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
}));

// 8. Who bypasses RLS: superuser always; a non-superuser owner unless FORCE.
show('8a. superuser (postgres), no tenant set: visible rows', await count(admin));
await admin.query(`
  DROP ROLE IF EXISTS tenant_owner; CREATE ROLE tenant_owner NOSUPERUSER;
  ALTER TABLE orders_naive OWNER TO tenant_owner;`);
await admin.query('SET ROLE tenant_owner');
show('8b. non-superuser table owner, RLS enabled, no FORCE', await count(admin, 'orders_naive'));
await admin.query('RESET ROLE');
await admin.query('ALTER TABLE orders_naive FORCE ROW LEVEL SECURITY');
await admin.query('SET ROLE tenant_owner');
show('8c. same owner after FORCE ROW LEVEL SECURITY: rows', await count(admin, 'orders_naive'));
await admin.query('RESET ROLE');

await admin.query('DROP TABLE orders_naive; DROP ROLE tenant_owner;');
await pool.end();
await admin.end();
