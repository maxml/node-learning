// 07. Partitioned table caveats: CREATE INDEX CONCURRENTLY is not supported on the parent.
// Workaround from the docs: index the parent ONLY (invalid), build each partition's index
// concurrently, attach them; the parent index becomes valid when every partition has one.
import { client } from './lib.mjs';

const c = await client('migration');
const step = async (label, sql) => {
  try {
    await c.query(sql);
    console.log(`ok    | ${label}`);
  } catch (e) {
    console.log(`error | ${label} -> ${e.code} ${e.message}`);
  }
};
const parentValid = async () =>
  (await c.query("select indisvalid from pg_index where indexrelid = 'events_tenant_idx'::regclass")).rows[0].indisvalid;

await c.query(`DROP TABLE IF EXISTS events;
  CREATE TABLE events (id bigint, created_at timestamptz NOT NULL, payload text) PARTITION BY RANGE (created_at);
  CREATE TABLE events_2026_09 PARTITION OF events FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');
  CREATE TABLE events_2026_10 PARTITION OF events FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');
  INSERT INTO events SELECT g, timestamptz '2026-09-01' + g * interval '1 minute', 'x' FROM generate_series(1, 80000) g;`);

await step('ADD COLUMN tenant_id on the parent (propagates to partitions)', 'ALTER TABLE events ADD COLUMN tenant_id bigint');
await c.query('UPDATE events SET tenant_id = id % 100');
await step('ADD CHECK (tenant_id IS NOT NULL) NOT VALID on the parent', 'ALTER TABLE events ADD CONSTRAINT events_tenant_chk CHECK (tenant_id IS NOT NULL) NOT VALID');
await step('VALIDATE CONSTRAINT on the parent (recurses)', 'ALTER TABLE events VALIDATE CONSTRAINT events_tenant_chk');
await step('ADD … NOT NULL tenant_id NOT VALID on the parent (PG 18)', 'ALTER TABLE events ADD CONSTRAINT events_tenant_nn NOT NULL tenant_id NOT VALID');
await step('CREATE INDEX CONCURRENTLY on the parent', 'CREATE INDEX CONCURRENTLY events_tenant_idx ON events (tenant_id, created_at)');
await step('CREATE INDEX ON ONLY events (parent only, no data)', 'CREATE INDEX events_tenant_idx ON ONLY events (tenant_id, created_at)');
console.log(`      parent index valid: ${await parentValid()}`);
for (const p of ['events_2026_09', 'events_2026_10']) {
  await step(`CREATE INDEX CONCURRENTLY on ${p}`, `CREATE INDEX CONCURRENTLY ${p}_tenant_idx ON ${p} (tenant_id, created_at)`);
  await step(`ALTER INDEX events_tenant_idx ATTACH PARTITION ${p}_tenant_idx`, `ALTER INDEX events_tenant_idx ATTACH PARTITION ${p}_tenant_idx`);
  console.log(`      parent index valid: ${await parentValid()}`);
}
await c.query('DROP TABLE events');
await c.end();
