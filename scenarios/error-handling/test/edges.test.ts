// Unit tests at the choke points: translator fed with REAL pg errors, and the pure edge mappings.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { translatePgError } from '../src/after/db.js';
import { HTTP_MAP, toDecision, toProblem } from '../src/after/edges.js';
import * as errors from '../src/after/errors.js';
import { DEAD_PG_URL, makePool } from '../src/shared/db.js';
import { freshDb } from './helpers.js';

async function pgError(pool: pg.Pool, sql: string, params: unknown[] = []): Promise<any> {
  try { await pool.query(sql, params); } catch (e) { return e; }
  throw new Error('expected a pg error');
}

describe('translatePgError with real PostgreSQL 18 errors', () => {
  let pool: pg.Pool;
  before(async () => {
    await freshDb();
    pool = makePool();
    await pool.query(`INSERT INTO customers (email) VALUES ('t@example.com')`);
  });
  after(async () => { await pool.end(); });

  test('23505 on a mapped constraint -> domain error, raw error kept as cause', async () => {
    const raw = await pgError(pool, `INSERT INTO customers (email) VALUES ('t@example.com')`);
    console.log('    raw:', raw.code, raw.constraint, '|', raw.message, '|', raw.detail);
    const e = translatePgError(raw, { customers_email_key: (cause) => new errors.EmailTaken('t@example.com', { cause }) });
    assert.ok(e instanceof errors.EmailTaken);
    assert.equal(e.cause, raw);
  });

  test('23505 on an UNMAPPED constraint -> UnexpectedDatabaseError (do not guess)', async () => {
    const raw = await pgError(pool, `INSERT INTO customers (email) VALUES ('t@example.com')`);
    assert.ok(translatePgError(raw, {}) instanceof errors.UnexpectedDatabaseError);
  });

  test('23503 FK -> mapped domain error', async () => {
    const raw = await pgError(pool, 'INSERT INTO orders (customer_id, amount) VALUES (999, 1)');
    console.log('    raw:', raw.code, raw.constraint, '|', raw.message);
    const e = translatePgError(raw, { orders_customer_id_fkey: (cause) => new errors.CustomerNotFound(999, { cause }) });
    assert.ok(e instanceof errors.CustomerNotFound);
  });

  test('40001 from two real SERIALIZABLE transactions -> ConcurrencyConflict (transient)', async () => {
    const a = await pool.connect(); const b = await pool.connect();
    let raw: any;
    try {
      for (const c of [a, b]) await c.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      await a.query('SELECT count(*) FROM orders WHERE customer_id = 1');
      await b.query('SELECT count(*) FROM orders WHERE customer_id = 1');
      await a.query('INSERT INTO orders (customer_id, amount) VALUES (1, 1)');
      await b.query('INSERT INTO orders (customer_id, amount) VALUES (1, 2)');
      await a.query('COMMIT');
      try { await b.query('COMMIT'); } catch (e) { raw = e; }
    } finally {
      await b.query('ROLLBACK').catch(() => {});
      a.release(); b.release();
    }
    console.log('    raw:', raw?.code, '|', raw?.message);
    assert.equal(raw?.code, '40001');
    const e = translatePgError(raw);
    assert.ok(e instanceof errors.ConcurrencyConflict);
    assert.equal(e.kind, 'transient');
  });

  test('connection refused -> DatabaseUnavailable', async () => {
    const dead = makePool(DEAD_PG_URL);
    const raw = await pgError(dead, 'SELECT 1');
    await dead.end();
    console.log('    raw:', raw.code, '|', raw.message);
    assert.ok(translatePgError(raw) instanceof errors.DatabaseUnavailable);
  });

  test('syntax error (bug) -> UnexpectedDatabaseError', async () => {
    const raw = await pgError(pool, 'SELEC 1');
    assert.equal(raw.code, '42601');
    assert.ok(translatePgError(raw) instanceof errors.UnexpectedDatabaseError);
  });
});

describe('edge mappings are total', () => {
  // Instantiate every exported AppError subclass, so a new class without a mapping turns this red.
  const samples: errors.AppError[] = [
    new errors.ValidationFailed([{ pointer: '#/x', detail: 'bad' }]),
    new errors.EmailTaken('e'), new errors.CustomerNotFound(1), new errors.OrderLimitReached(2),
    new errors.ConcurrencyConflict({ cause: null }), new errors.DatabaseUnavailable({ cause: null }),
    new errors.UnexpectedDatabaseError({ cause: null }),
  ];

  test('every AppError subclass exported by errors.ts has a sample here', () => {
    const exported = Object.values(errors).filter((v) => typeof v === 'function' && v.prototype instanceof errors.AppError);
    assert.deepEqual(new Set(samples.map((s) => s.constructor)), new Set(exported));
  });

  test('every code has an explicit HTTP mapping', () => {
    for (const s of samples) assert.ok(HTTP_MAP[s.code], `no HTTP mapping for ${s.code}`);
  });

  test('transient/unexpected never expose their message as detail', () => {
    for (const s of samples.filter((x) => x.kind !== 'expected')) assert.equal(toProblem(s).detail, undefined);
  });

  test('decision table', () => {
    const table = Object.fromEntries(samples.map((s) => [s.code, toDecision(s)]));
    console.log('    ', JSON.stringify(table));
    assert.deepEqual(table, {
      VALIDATION_FAILED: 'dead-letter', EMAIL_TAKEN: 'drop', CUSTOMER_NOT_FOUND: 'drop', ORDER_LIMIT_REACHED: 'drop',
      CONCURRENCY_CONFLICT: 'retry', DATABASE_UNAVAILABLE: 'retry', UNEXPECTED_DATABASE_ERROR: 'dead-letter',
    });
    assert.equal(toDecision(new TypeError('x')), 'dead-letter');
  });
});
