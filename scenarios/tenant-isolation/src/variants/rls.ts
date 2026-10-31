// DEFENCE IN DEPTH: PostgreSQL RLS, tenant set per transaction with set_config(..., true).
// `rls`           : explicit TenantId, and the query deliberately FORGETS the WHERE: RLS filters.
// `rls-singleton` : the original singleton bug feeding RLS: RLS faithfully enforces the WRONG tenant.
import { Controller, Get, Injectable, Module, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from './explicit.js';
import { TenantContext, TenantGuard } from './singleton.js';
import { constructed, CurrentTenant, Db, dbModule, Row, StatsController, TenantId, TenantResponseAudit } from '../shared.js';

const NO_WHERE = 'SELECT id, tenant_id, item FROM orders';   // the bug RLS should catch

@Injectable()
export class RlsOrdersService {
  constructor(private readonly db: Db) { constructed('OrdersService'); }
  async list(tenant: TenantId): Promise<Row[]> {
    await this.db.slowLookup();
    return this.db.withTenant(tenant.value, async (q) => (await q.query<Row>(NO_WHERE)).rows);
  }
}

@Controller('orders')
@UseGuards(AuthGuard)
@UseInterceptors(TenantResponseAudit)
export class RlsOrdersController {
  constructor(private readonly svc: RlsOrdersService) {}
  @Get() list(@CurrentTenant() tenant: TenantId) { return this.svc.list(tenant); }
}

@Module({
  imports: [dbModule('app')],
  controllers: [RlsOrdersController, StatsController],
  providers: [AuthGuard, RlsOrdersService],
})
export class RlsModule {}

@Injectable()
export class RlsSingletonService {
  constructor(private readonly db: Db, private readonly ctx: TenantContext) {}
  async list(): Promise<Row[]> {
    await this.db.slowLookup();
    return this.db.withTenant(this.ctx.tenantId!, async (q) => (await q.query<Row>(NO_WHERE)).rows);
  }
}

@Controller('orders')
@UseGuards(TenantGuard)
@UseInterceptors(TenantResponseAudit)
export class RlsSingletonController {
  constructor(private readonly svc: RlsSingletonService) {}
  @Get() list() { return this.svc.list(); }
}

@Module({
  imports: [dbModule('app')],
  controllers: [RlsSingletonController, StatsController],
  providers: [TenantContext, TenantGuard, RlsSingletonService],
})
export class RlsSingletonModule {}
