import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { ADMIN_URL } from './config.js';

const sql = await readFile(new URL('../sql/schema.sql', import.meta.url), 'utf8');
const client = new pg.Client({ connectionString: ADMIN_URL });
await client.connect();
await client.query(sql);
const { rows } = await client.query(
  'SELECT tenant_id, count(*)::int AS n FROM orders GROUP BY 1 ORDER BY 1',
);
const { rows: [v] } = await client.query('SHOW server_version');
console.log(`PostgreSQL ${v.server_version}; seeded`, rows);
await client.end();
