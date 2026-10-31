// The ONE place that talks to the pg pool. Every error that leaves this class is an AppError:
// mapped constraint -> domain error, transient SQLSTATE -> ConcurrencyConflict / DatabaseUnavailable,
// anything else -> UnexpectedDatabaseError. Repositories never see a raw driver error.
import { Inject, Injectable } from '@nestjs/common';
import type pg from 'pg';
import { POOL } from '../shared/db.js';
import { AppError, ConcurrencyConflict, DatabaseUnavailable, UnexpectedDatabaseError } from './errors.js';

/** constraint name -> domain error; a 23505/23503 on a constraint NOT in this map is a bug. */
export type ConstraintMap = Record<string, (cause: unknown) => AppError>;

const TRANSIENT_SQLSTATE = new Set(['40001', '40P01']);                 // serialization_failure, deadlock_detected
const UNAVAILABLE_SQLSTATE = new Set(['57P01', '57P02', '57P03', '53300']); // admin/crash shutdown, cannot connect now, too_many_connections
const NET_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN']);

export function translatePgError(e: unknown, constraints: ConstraintMap = {}): AppError {
  if (e instanceof AppError) return e;                                  // already translated (e.g. thrown inside tx callback)
  const err = e as { code?: string; constraint?: string; message?: string };
  const code = typeof err?.code === 'string' ? err.code : undefined;
  if ((code === '23505' || code === '23503') && err.constraint && constraints[err.constraint]) {
    return constraints[err.constraint](e);
  }
  if (code && TRANSIENT_SQLSTATE.has(code)) return new ConcurrencyConflict({ cause: e });
  if (code && (UNAVAILABLE_SQLSTATE.has(code) || code.startsWith('08') || NET_CODES.has(code))) {
    return new DatabaseUnavailable({ cause: e });
  }
  // pg-pool / pg client errors without a code
  if (!code && /timeout exceeded when trying to connect|Connection terminated/i.test(err?.message ?? '')) {
    return new DatabaseUnavailable({ cause: e });
  }
  return new UnexpectedDatabaseError({ cause: e });
}

export interface Queryable { query<R extends pg.QueryResultRow = any>(sql: string, params?: unknown[]): Promise<pg.QueryResult<R>> }

@Injectable()
export class Db {
  constructor(@Inject(POOL) private readonly pool: pg.Pool) {}

  async query<R extends pg.QueryResultRow = any>(sql: string, params: unknown[] = [], constraints?: ConstraintMap) {
    try {
      return await this.pool.query<R>(sql, params);
    } catch (e) {
      throw translatePgError(e, constraints);
    }
  }

  async tx<T>(isolation: 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE', fn: (q: Queryable) => Promise<T>, constraints?: ConstraintMap): Promise<T> {
    let client: pg.PoolClient;
    try {
      client = await this.pool.connect();
    } catch (e) {
      throw translatePgError(e, constraints);
    }
    try {
      await client.query(`BEGIN ISOLATION LEVEL ${isolation}`);
      const result = await fn(client);
      await client.query('COMMIT');                                      // 40001 may surface here, at commit
      return result;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw translatePgError(e, constraints);
    } finally {
      client.release();
    }
  }
}
