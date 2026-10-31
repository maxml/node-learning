// 03. Dual-write while old (v1) and new (v2) code run side by side.
// v1 does not know tenant_id and inserts NULL. Without dual-write in the DB every row v1
// writes after the backfill cursor passed stays NULL. A BEFORE trigger closes that hole
// for every writer at once, including services you forgot about.
import { client, load, sleep, summary, randInt } from './lib.mjs';

const c = await client('dual-write');

const v1Insert = (cl) =>
  cl.query(
    `insert into orders (account_id, status, amount, created_at, note)
     values ($1, 'new', 10, now(), 'v1')`,
    [randInt(1, 50_001)],
  );

async function insertBurst(label) {
  const before = Number((await c.query('select max(id) m from orders')).rows[0].m);
  const l = await load(4, v1Insert, 'v1');
  await sleep(3000);
  await l.stop();
  const s = summary(l.lat);
  const nulls = (
    await c.query('select count(*)::int n, count(*) filter (where tenant_id is null)::int nulls from orders where id > $1', [before])
  ).rows[0];
  console.log(
    `${label}: ${Math.round(s.n / 3)} inserts/s, p50=${s.p50} ms, p99=${s.p99} ms; new rows=${nulls.n}, tenant_id NULL=${nulls.nulls}`,
  );
}

await c.query('DROP TRIGGER IF EXISTS orders_fill_tenant ON orders');
await insertBurst('v1 writes, no dual-write ');

await c.query(`
  CREATE OR REPLACE FUNCTION orders_fill_tenant() RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    IF NEW.tenant_id IS NULL OR (TG_OP = 'UPDATE' AND NEW.account_id IS DISTINCT FROM OLD.account_id) THEN
      SELECT a.tenant_id INTO NEW.tenant_id FROM accounts a WHERE a.id = NEW.account_id;
    END IF;
    RETURN NEW;
  END $$;
  CREATE TRIGGER orders_fill_tenant BEFORE INSERT OR UPDATE OF account_id, tenant_id ON orders
    FOR EACH ROW EXECUTE FUNCTION orders_fill_tenant();`);
await insertBurst('v1 writes, with trigger  ');

// v2 writes the value itself; the trigger leaves a non-NULL value alone
const r = await c.query(
  `insert into orders (account_id, status, amount, created_at, tenant_id)
   values (7, 'new', 1, now(), (select tenant_id from accounts where id = 7)) returning id, tenant_id`,
);
const moved = await c.query('update orders set account_id = 8 where id = $1 returning tenant_id', [r.rows[0].id]);
console.log(`v2 insert keeps its tenant_id=${r.rows[0].tenant_id}; account change re-derives it -> ${moved.rows[0].tenant_id}`);
await c.end();
