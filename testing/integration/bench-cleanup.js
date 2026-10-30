'use strict';
// Cost of resetting state between tests: ROLLBACK vs TRUNCATE vs DELETE,
// with 2 tables and with 40 tables (TRUNCATE touches every listed table's files).
// Run: node integration/bench-cleanup.js     (ROUNDS=200 by default)
const { Pool } = require('pg');
const { PG_URL } = require('./db');

const ROUNDS = Number(process.env.ROUNDS ?? 200);
const ROWS = 10;

async function setup(pool, tables) {
  await pool.query('DROP SCHEMA IF EXISTS bench CASCADE; CREATE SCHEMA bench;');
  for (let i = 0; i < tables; i++) {
    await pool.query(`CREATE TABLE bench.t${i} (id serial PRIMARY KEY, v text NOT NULL)`);
  }
}

async function seed(c, tables) {
  for (let i = 0; i < tables; i++) {
    await c.query(`INSERT INTO bench.t${i} (v) SELECT 'x' || g FROM generate_series(1, ${ROWS}) g`);
  }
}

async function measure(label, pool, tables, round) {
  const c = await pool.connect();
  const cleanupMs = [];
  try {
    for (let r = 0; r < ROUNDS; r++) cleanupMs.push(await round(c, tables));
  } finally { c.release(); }
  cleanupMs.sort((a, b) => a - b);
  const pct = (p) => cleanupMs[Math.min(cleanupMs.length - 1, Math.floor(p * cleanupMs.length))];
  return { strategy: label, tables, p50_ms: +pct(0.5).toFixed(2), p95_ms: +pct(0.95).toFixed(2), total_s: +(cleanupMs.reduce((a, b) => a + b, 0) / 1000).toFixed(2) };
}

const list = (n) => Array.from({ length: n }, (_, i) => `bench.t${i}`).join(', ');
const strategies = {
  rollback: async (c, n) => { await c.query('BEGIN'); await seed(c, n); const t = performance.now(); await c.query('ROLLBACK'); return performance.now() - t; },
  truncate: async (c, n) => { await seed(c, n); const t = performance.now(); await c.query(`TRUNCATE ${list(n)} RESTART IDENTITY`); return performance.now() - t; },
  delete: async (c, n) => {
    await seed(c, n); const t = performance.now();
    for (let i = 0; i < n; i++) await c.query(`DELETE FROM bench.t${i}`);
    return performance.now() - t;
  },
};

(async () => {
  const pool = new Pool({ connectionString: PG_URL, max: 2 });
  const out = [];
  for (const tables of [2, 40]) {
    await setup(pool, tables);
    for (const [name, fn] of Object.entries(strategies)) out.push(await measure(name, pool, tables, fn));
  }
  await pool.query('DROP SCHEMA bench CASCADE');
  await pool.end();
  console.table(out);
  console.log(JSON.stringify({ rounds: ROUNDS, rowsPerTable: ROWS, results: out }));
})();
