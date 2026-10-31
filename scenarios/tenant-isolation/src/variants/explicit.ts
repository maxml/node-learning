// FIX 1: the tenant is a value passed as an argument; the repository cannot exist without it.
import { CanActivate, Controller, ExecutionContext, Get, Injectable, Module, UseGuards, UseInterceptors } from '@nestjs/common';
import {
  constructed, CurrentTenant, Db, dbModule, Req, Row, StatsController, TenantId, TenantResponseAudit, verifyToken,
} from '../shared.js';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Req>();
    req.user = verifyToken(req.headers.authorization);   // per-request object, not a singleton field
    return true;
  }
}

/** Tenant-scoped repository: constructed per call with a TenantId, never a bare number. */
export class TenantScopedOrders {
  constructor(private readonly db: Db, private readonly tenant: TenantId) {
    if (!(tenant instanceof TenantId)) throw new TypeError('TenantScopedOrders requires a TenantId');
  }
  findAll(): Promise<Row[]> {
    return this.db.query('SELECT id, tenant_id, item FROM orders WHERE tenant_id = $1', [this.tenant.value]);
  }
}

@Injectable()
export class OrdersRepositoryFactory {
  constructor(private readonly db: Db) {}
  forTenant(tenant: TenantId) { return new TenantScopedOrders(this.db, tenant); }
}

@Injectable()
export class OrdersService {
  constructor(private readonly db: Db, private readonly repos: OrdersRepositoryFactory) { constructed('OrdersService'); }
  async list(tenant: TenantId): Promise<Row[]> {
    await this.db.slowLookup();
    return this.repos.forTenant(tenant).findAll();
  }
}

@Controller('orders')
@UseGuards(AuthGuard)
@UseInterceptors(TenantResponseAudit)
export class OrdersController {
  constructor(private readonly svc: OrdersService) { constructed('OrdersController'); }
  @Get() list(@CurrentTenant() tenant: TenantId) { return this.svc.list(tenant); }
}

@Module({
  imports: [dbModule('admin')],
  controllers: [OrdersController, StatsController],
  providers: [AuthGuard, OrdersRepositoryFactory, OrdersService],
})
export class ExplicitModule {}
