// Index locality in PostgreSQL: 1M inserts keyed by bigint identity, UUIDv4 and UUIDv7
// (generated in Node by uuid@14), plus server-side uuidv7() (PG 18).
// Measures insert time (median of REPS), WAL bytes, PK index size and leaf density.
// Needs a running PostgreSQL 18 (see run.sh). Run: PG_URL=... node ids_pg.js
import pg from 'pg';
import { v4, v7 } from 'uuid';

const ROWS = Number(process.env.ROWS ?? 1_000_000);
const BATCH = 10_000;
const REPS = Number(process.env.REPS ?? 3);
const client = new pg.Client(process.env.PG_URL ?? 'postgres://postgres:pw@127.0.0.1:55461/postgres');
await client.connect();
const q = (s, p) => client.query(s, p);
await q('CREATE EXTENSION IF NOT EXISTS pgstattuple');

const variants = {
  bigint: { ddl: 'id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, payload text', gen: null },
  uuidv4: { ddl: 'id uuid PRIMARY KEY, payload text', gen: v4 },
  uuidv7: { ddl: 'id uuid PRIMARY KEY, payload text', gen: v7 },
  // server-side generation: same client work for both, so the difference is the index
  'uuidv4() server': { ddl: 'id uuid PRIMARY KEY DEFAULT uuidv4(), payload text', gen: null },
  'uuidv7() server': { ddl: 'id uuid PRIMARY KEY DEFAULT uuidv7(), payload text', gen: null },
};
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
if (only) for (const k of Object.keys(variants)) if (!only.includes(k)) delete variants[k];
const payload = 'x'.repeat(40);
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

const { rows: [{ server_version }] } = await q('SHOW server_version');
const { rows: [{ shared_buffers }] } = await q('SHOW shared_buffers');
console.log(`# PostgreSQL ${server_version}, shared_buffers=${shared_buffers}, ${ROWS.toLocaleString('en')} rows, batches of ${BATCH}, median of ${REPS}\n`);
console.log('| key | insert s (median) | runs s | WAL MB | PK index MB | leaf density % | table MB |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');

for (const [name, v] of Object.entries(variants)) {
  const times = []; let last;
  for (let rep = 0; rep < REPS; rep++) {
    await q('DROP TABLE IF EXISTS t');
    await q(`CREATE TABLE t (${v.ddl})`);
    await q('CHECKPOINT');
    const { rows: [{ lsn: lsn0 }] } = await q('SELECT pg_current_wal_lsn() AS lsn');
    const t0 = performance.now();
    for (let off = 0; off < ROWS; off += BATCH) {
      const n = Math.min(BATCH, ROWS - off);
      const pay = new Array(n).fill(payload);
      if (v.gen) {
        const ids = Array.from({ length: n }, () => v.gen());
        await q('INSERT INTO t (id, payload) SELECT * FROM unnest($1::uuid[], $2::text[])', [ids, pay]);
      } else {
        await q('INSERT INTO t (payload) SELECT * FROM unnest($1::text[])', [pay]);
      }
    }
    times.push((performance.now() - t0) / 1000);
    const { rows: [r] } = await q(`SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), $1) AS wal,
        pg_relation_size('t_pkey') AS idx, pg_relation_size('t') AS tbl,
        (pgstatindex('t_pkey')).avg_leaf_density AS dens`, [lsn0]);
    last = r;
  }
  const mb = (x) => (Number(x) / 2 ** 20).toFixed(1);
  console.log(`| ${name} | ${median(times).toFixed(2)} | ${times.map((t) => t.toFixed(2)).join(' / ')} | ${mb(last.wal)} | ${mb(last.idx)} | ${Number(last.dens).toFixed(1)} | ${mb(last.tbl)} |`);
}

// server-side uuidv7(): monotonic inside one backend? and the timestamp is extractable
const { rows: [m] } = await q(`WITH g AS (SELECT uuidv7() AS u, n FROM generate_series(1, 100000) n)
  SELECT bool_and(u > lag) AS increasing, count(DISTINCT uuid_extract_timestamp(u)) AS ms
  FROM (SELECT u, lag(u) OVER (ORDER BY n) AS lag FROM g) s WHERE lag IS NOT NULL`);
console.log(`\nuuidv7() x100000 in one statement: strictly increasing = ${m.increasing}, distinct ms timestamps = ${m.ms}`);
const { rows: [x] } = await q('SELECT uuid_extract_version(uuidv7()) AS v7, uuid_extract_version(gen_random_uuid()) AS g, uuid_extract_version(uuidv4()) AS v4');
console.log(`uuid_extract_version: uuidv7()=${x.v7}, gen_random_uuid()=${x.g}, uuidv4()=${x.v4}`);
await client.end();
