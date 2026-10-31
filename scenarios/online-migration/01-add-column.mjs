// 01. ADD COLUMN: metadata-only vs table rewrite.
// Measures the time ALTER holds ACCESS EXCLUSIVE and whether the heap file was rewritten
// (relfilenode changes on rewrite).
import { client, timed, fmt } from './lib.mjs';

const c = await client('add-column');
const fileNode = async () =>
  (await c.query("select relfilenode from pg_class where relname = 'orders'")).rows[0].relfilenode;

const cases = [
  ['nullable, no default', 'ALTER TABLE orders ADD COLUMN exp_a bigint'],
  ['constant default 0', 'ALTER TABLE orders ADD COLUMN exp_b bigint DEFAULT 0'],
  ['constant default + NOT NULL', 'ALTER TABLE orders ADD COLUMN exp_c bigint NOT NULL DEFAULT 0'],
  ['volatile default clock_timestamp()', 'ALTER TABLE orders ADD COLUMN exp_d timestamptz DEFAULT clock_timestamp()'],
];

console.log('case | ms under ACCESS EXCLUSIVE | heap rewritten');
for (const [name, sql] of cases) {
  const before = await fileNode();
  // run in a transaction and roll back so the table stays as generated
  await c.query('BEGIN');
  const { ms } = await timed(c, sql);
  const after = await fileNode();
  await c.query('ROLLBACK');
  console.log(`${name} | ${fmt(ms)} | ${before !== after}`);
}

// The column that the rest of the scenario uses: nullable, no default (metadata only).
const { ms } = await timed(c, 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS tenant_id bigint');
console.log(`\nexpand: ALTER TABLE orders ADD COLUMN tenant_id bigint -> ${fmt(ms)} ms`);
await c.end();
