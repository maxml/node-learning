// FIX 3: AsyncLocalStorage via nestjs-cls. Context entered in middleware (als.run),
// the guard only fills it; singletons read it per call.
import { CanActivate, Controller, ExecutionContext, Get, Injectable, Module, UseGuards, UseInterceptors } from '@nestjs/common';
import { ClsModule, ClsService } from 'nestjs-cls';
import { constructed, Db, dbModule, Req, Row, StatsController, TenantId, TenantResponseAudit, verifyToken } from '../shared.js';

@Injectable()
export class ClsAuthGuard implements CanActivate {
  constructor(private readonly cls: ClsService) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Req>();
    req.user = verifyToken(req.headers.authorization);
    this.cls.set('tenant', TenantId.fromUser(req.user));
    return true;
  }
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly db: Db, private readonly cls: ClsService) { constructed('OrdersRepository'); }
  findAll(): Promise<Row[]> {
    const tenant = this.cls.get<TenantId | undefined>('tenant');
    if (!(tenant instanceof TenantId)) throw new Error('no tenant in async context'); // fail closed
    return this.db.query('SELECT id, tenant_id, item FROM orders WHERE tenant_id = $1', [tenant.value]);
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
@UseGuards(ClsAuthGuard)
@UseInterceptors(TenantResponseAudit)
export class OrdersController {
  constructor(private readonly svc: OrdersService) { constructed('OrdersController'); }
  @Get() list() { return this.svc.list(); }
}

@Module({
  imports: [dbModule('admin'), ClsModule.forRoot({ global: true, middleware: { mount: true } })],
  controllers: [OrdersController, StatsController],
  providers: [ClsAuthGuard, OrdersRepository, OrdersService],
})
export class ClsVariantModule {}
