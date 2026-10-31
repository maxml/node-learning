import pg from 'pg';

export const PG_URL = process.env.PG_URL ?? 'postgres://postgres:pg@127.0.0.1:55436/errs';
/** Nothing listens here: used to produce a real connection error (ECONNREFUSED). */
export const DEAD_PG_URL = 'postgres://postgres:pg@127.0.0.1:1/errs';

export const POOL = Symbol('POOL');
export const ORDER_LIMIT = Symbol('ORDER_LIMIT');
/** Test hook: pause between the limit check and the insert to force a serialization conflict. */
export const ORDER_PAUSE_MS = Symbol('ORDER_PAUSE_MS');

export function makePool(url = PG_URL): pg.Pool {
  const pool = new pg.Pool({ connectionString: url, max: 5, connectionTimeoutMillis: 2000 });
  pool.on('error', () => { /* idle client errors are reported on the next query */ });
  return pool;
}

export async function resetSchema(pool: pg.Pool): Promise<void> {
  await pool.query(`
    DROP TABLE IF EXISTS orders, customers;
    CREATE TABLE customers (
      id    int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      email text NOT NULL,
      CONSTRAINT customers_email_key UNIQUE (email)
    );
    CREATE TABLE orders (
      id          int GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      customer_id int NOT NULL,
      amount      int NOT NULL,
      CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers (id)
    );
  `);
}
