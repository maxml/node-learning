// Session state through PgBouncer in transaction mode (default_pool_size = 4 here):
// 1. node-postgres sends `statement_timeout` as a startup parameter. Does PgBouncer accept it?
// 2. `SET statement_timeout` outside a transaction vs `SET LOCAL` inside one.
import pg from 'pg';

const BOUNCER = { host: '127.0.0.1', port: Number(process.env.BOUNCER_PORT ?? 55442), user: 'app', password: 'app', database: 'postgres' };

try {
  const c = new pg.Client({ ...BOUNCER, statement_timeout: 1000 });
  await c.connect();
  const r = await c.query('show statement_timeout');
  console.log(`startup parameter statement_timeout=1000 via PgBouncer: accepted, server says ${r.rows[0].statement_timeout}`);
  await c.end();
} catch (e) {
  console.log(`startup parameter statement_timeout=1000 via PgBouncer: refused (${e.code ?? ''} ${e.message})`);
}

// The usual way under transaction pooling: SET LOCAL inside the transaction (or ALTER ROLE … SET).
const c = new pg.Client(BOUNCER);
await c.connect();
await c.query('BEGIN');
await c.query("SET LOCAL statement_timeout = '200ms'");
try {
  await c.query('select pg_sleep(1)');
} catch (e) {
  console.log(`SET LOCAL statement_timeout = 200ms inside a transaction: ${e.code} ${e.message}`);
}
await c.query('ROLLBACK');
await c.end();
