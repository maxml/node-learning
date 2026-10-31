// Shared helpers for the online-migration experiments.
import pg from 'pg';

export const CONN = {
  host: process.env.PGHOST ?? '127.0.0.1',
  port: Number(process.env.PGPORT ?? 55440),
  user: 'postgres',
  password: 'pg',
  database: 'postgres',
};

export async function client(appName = 'exp') {
  const c = new pg.Client({ ...CONN, application_name: appName });
  await c.connect();
  return c;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const now = () => performance.now();

export function pct(values, p) {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
}

export const fmt = (ms) => (ms >= 100 ? ms.toFixed(0) : ms.toFixed(1));

export function summary(lat) {
  return {
    n: lat.length,
    p50: fmt(pct(lat, 50)),
    p99: fmt(pct(lat, 99)),
    max: fmt(lat.reduce((m, x) => (x > m ? x : m), 0)),
  };
}

// Runs `workers` loops of `fn(client)` until stop() is called; records latency of each call.
export async function load(workers, fn, appName = 'load') {
  const clients = await Promise.all(Array.from({ length: workers }, () => client(appName)));
  const lat = [];
  const errors = [];
  let running = true;
  const loops = clients.map(async (c) => {
    while (running) {
      const t0 = now();
      try {
        await fn(c);
        lat.push(now() - t0);
      } catch (e) {
        errors.push(e.code ?? e.message);
      }
    }
  });
  return {
    lat,
    errors,
    reset() {
      lat.length = 0;
      errors.length = 0;
    },
    async stop() {
      running = false;
      await Promise.all(loops);
      await Promise.all(clients.map((c) => c.end()));
    },
  };
}

export async function walBytesSince(c, lsn) {
  const r = await c.query('select pg_wal_lsn_diff(pg_current_wal_lsn(), $1)::bigint as b', [lsn]);
  return Number(r.rows[0].b);
}

export async function currentLsn(c) {
  return (await c.query('select pg_current_wal_lsn() as l')).rows[0].l;
}

export async function timed(c, sql, params) {
  const t0 = now();
  const r = await c.query(sql, params);
  return { ms: now() - t0, r };
}

export const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo));
