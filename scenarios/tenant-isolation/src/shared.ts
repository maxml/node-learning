import {
  CallHandler, ExecutionContext, Inject, Injectable, InternalServerErrorException,
  Module, NestInterceptor, UnauthorizedException, Global, Controller, Get, createParamDecorator,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import pg from 'pg';
import { ADMIN_URL, APP_URL, POOL_MAX, SLOW_MS } from './config.js';

// ---------- counters the race runner reads from GET /stats ----------
export const stats = {
  constructed: {} as Record<string, number>,
  alarms: 0,
};
export function constructed(name: string) {
  stats.constructed[name] = (stats.constructed[name] ?? 0) + 1;
}

// ---------- toy authentication: "Bearer tenant:<n>" stands in for a verified JWT ----------
export interface AuthUser { tenantId: number }
export function verifyToken(header: unknown): AuthUser {
  const m = typeof header === 'string' ? /^Bearer tenant:(\d+)$/.exec(header) : null;
  if (!m) throw new UnauthorizedException();
  return { tenantId: Number(m[1]) };
}
export type Req = { headers: Record<string, unknown>; user?: AuthUser };

// ---------- the choke point: a tenant value that can only come from a verified identity ----------
export class TenantId {
  private constructor(readonly value: number) { Object.freeze(this); }
  static fromUser(user: AuthUser | undefined): TenantId {
    if (!user || !Number.isSafeInteger(user.tenantId) || user.tenantId <= 0) {
      throw new UnauthorizedException('no verified tenant');
    }
    return new TenantId(user.tenantId);
  }
}
export const CurrentTenant = createParamDecorator((_: unknown, ctx: ExecutionContext) =>
  TenantId.fromUser(ctx.switchToHttp().getRequest<Req>().user));

// ---------- database access ----------
export const PG_POOL = Symbol('PG_POOL');
export type Row = { id: number; tenant_id: number; item: string };
export interface Queryable { query<T extends pg.QueryResultRow>(text: string, params?: unknown[]): Promise<pg.QueryResult<T>> }

const MEMORY = process.env.DB_MODE === 'memory';
const memoryRows: Row[] = [1, 2, 3].flatMap((t) =>
  [1, 2, 3, 4, 5].map((i) => ({ id: (t - 1) * 5 + i, tenant_id: t, item: `tenant-${t}-item-${i}` })));
const tick = () => new Promise<void>((r) => setImmediate(r));

@Injectable()
export class Db {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool | null) {}

  async query(text: string, params: unknown[] = []): Promise<Row[]> {
    if (MEMORY) { // bench mode: isolates framework/DI cost from Postgres
      await tick();
      return text.includes('WHERE tenant_id') ? memoryRows.filter((r) => r.tenant_id === params[0]) : memoryRows;
    }
    return (await this.pool!.query<Row>(text, params)).rows;
  }

  /** A DB-like await before the tenant-filtered query (feature flags, profile, ...). */
  async slowLookup(): Promise<void> {
    if (MEMORY) return tick();
    await this.pool!.query('SELECT pg_sleep($1)', [(Math.random() * SLOW_MS) / 1000]);
  }

  /** Transaction-scoped tenant for RLS: SET LOCAL semantics via set_config(..., true). */
  async withTenant<T>(tenant: number, fn: (q: Queryable) => Promise<T>): Promise<T> {
    const client = await this.pool!.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.tenant_id', $1, true)", [String(tenant)]);
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}

/** Non-RLS variants connect as the superuser (RLS bypassed, like an app without RLS). */
export function dbModule(role: 'admin' | 'app' = 'admin') {
  @Global()
  @Module({
    providers: [
      {
        provide: PG_POOL,
        useFactory: () => (MEMORY ? null : new pg.Pool({
          connectionString: role === 'app' ? APP_URL : ADMIN_URL, max: POOL_MAX,
        })),
      },
      Db,
    ],
    exports: [Db, PG_POOL],
  })
  class DbModule {}
  return DbModule;
}

// ---------- observability: every response row must belong to the caller's tenant ----------
@Injectable()
export class TenantResponseAudit implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Req>();
    const expected = req.user?.tenantId;            // captured per request, before the handler
    return next.handle().pipe(map((body) => {
      if (Array.isArray(body) && expected !== undefined) {
        const foreign = body.filter((r: Row) => r.tenant_id !== expected).length;
        if (foreign > 0) {
          stats.alarms++;
          if (process.env.LOG_ALARMS) {
            console.error(JSON.stringify({ alarm: 'tenant_mismatch', expected, foreign }));
          }
          if (process.env.AUDIT_MODE === 'block') throw new InternalServerErrorException();
        }
      }
      return body;
    }));
  }
}

@Controller('stats')
export class StatsController {
  @Get() get() { return stats; }
}
