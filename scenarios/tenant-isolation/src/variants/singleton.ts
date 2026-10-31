// THE BUG from the scenario: a default-scoped (singleton) service holds tenantId,
// a guard writes it, the repository reads it after an await.
import { CanActivate, Controller, ExecutionContext, Get, Injectable, Module, UseGuards, UseInterceptors } from '@nestjs/common';
import { constructed, Db, dbModule, Req, Row, StatsController, TenantResponseAudit, verifyToken } from '../shared.js';

@Injectable()
export class TenantContext {
  tenantId?: number;                       // ONE field shared by every in-flight request
  constructor() { constructed('TenantContext'); }
}

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly ctx: TenantContext) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Req>();
    req.user = verifyToken(req.headers.authorization);
    this.ctx.tenantId = req.user.tenantId;   // request A writes...
    return true;
  }
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly db: Db, private readonly ctx: TenantContext) {}
  findAll(): Promise<Row[]> {
    // ...request A reads here, possibly after request B overwrote the field
    return this.db.query('SELECT id, tenant_id, item FROM orders WHERE tenant_id = $1', [this.ctx.tenantId]);
  }
}

@Injectable()
export class OrdersService {
  constructor(private readonly db: Db, private readonly repo: OrdersRepository) { constructed('OrdersService'); }
  async list(): Promise<Row[]> {
    await this.db.slowLookup();             // the await where other requests run
    return this.repo.findAll();
  }
}

@Controller('orders')
@UseGuards(TenantGuard)
@UseInterceptors(TenantResponseAudit)
export class OrdersController {
  constructor(private readonly svc: OrdersService) { constructed('OrdersController'); }
  @Get() list() { return this.svc.list(); }
}

@Module({
  imports: [dbModule('admin')],
  controllers: [OrdersController, StatsController],
  providers: [TenantContext, TenantGuard, OrdersRepository, OrdersService],
})
export class SingletonModule {}
