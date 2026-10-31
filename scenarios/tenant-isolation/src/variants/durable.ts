// FIX 4: durable providers. One DI sub-tree per TENANT (not per request), chosen by a
// ContextIdStrategy. The strategy runs before guards, so it must verify the credential itself.
import {
  CanActivate, Controller, ExecutionContext, Get, Inject, Injectable, Module, Scope, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { ContextId, ContextIdFactory, ContextIdStrategy, HostComponentInfo, REQUEST } from '@nestjs/core';
import { AuthGuard } from './explicit.js';
import { constructed, Db, dbModule, Req, Row, StatsController, TenantResponseAudit, verifyToken } from '../shared.js';

const tenantTrees = new Map<number, ContextId>();

export class TenantContextIdStrategy implements ContextIdStrategy<Req> {
  attach(contextId: ContextId, request: Req) {
    let tenantId: number | undefined;
    try { tenantId = verifyToken(request.headers.authorization).tenantId; } catch { tenantId = undefined; }
    if (tenantId === undefined) return () => contextId;     // no durable tree; the guard will 401
    let tree = tenantTrees.get(tenantId);
    if (!tree) { tree = ContextIdFactory.create(); tenantTrees.set(tenantId, tree); }
    return {
      resolve: (info: HostComponentInfo) => (info.isTreeDurable ? tree : contextId),
      payload: { tenantId },                                  // what REQUEST means inside the durable tree
    };
  }
}

@Injectable({ scope: Scope.REQUEST, durable: true })
export class TenantContext {
  constructor(@Inject(REQUEST) readonly payload: { tenantId: number }) { constructed('TenantContext'); }
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly db: Db, private readonly ctx: TenantContext) { constructed('OrdersRepository'); }
  findAll(): Promise<Row[]> {
    return this.db.query('SELECT id, tenant_id, item FROM orders WHERE tenant_id = $1', [this.ctx.payload.tenantId]);
  }
}

@Injectable()
export class OrdersService {
  constructor(private readonly db: Db, private readonly repo: OrdersRepository) { constructed('OrdersService'); }
  async list(): Promise<Row[]> {
    await this.db.slowLookup();
    return this.repo.findAll();
  }
}

@Controller('orders')
@UseGuards(AuthGuard)
@UseInterceptors(TenantResponseAudit)
export class OrdersController {
  constructor(private readonly svc: OrdersService) { constructed('OrdersController'); }
  @Get() list() { return this.svc.list(); }
}

@Module({
  imports: [dbModule('admin')],
  controllers: [OrdersController, StatsController],
  providers: [AuthGuard, TenantContext, OrdersRepository, OrdersService],
})
export class DurableModule {}
