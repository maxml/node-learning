// FIX 3b: bare AsyncLocalStorage (the Nest docs recipe), to separate the cost of ALS itself
// from the cost of nestjs-cls machinery. Context is ENTERED in middleware with run(),
// the guard only writes into the per-request store.
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  CanActivate, Controller, ExecutionContext, Get, Injectable, MiddlewareConsumer, Module, NestModule,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { constructed, Db, dbModule, Req, Row, StatsController, TenantId, TenantResponseAudit, verifyToken } from '../shared.js';

export const als = new AsyncLocalStorage<{ tenant?: TenantId }>();

@Injectable()
export class AlsAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Req>();
    req.user = verifyToken(req.headers.authorization);
    const store = als.getStore();
    if (!store) throw new Error('ALS context was not entered by middleware');
    store.tenant = TenantId.fromUser(req.user);
    return true;
  }
}

@Injectable()
export class OrdersRepository {
  constructor(private readonly db: Db) { constructed('OrdersRepository'); }
  findAll(): Promise<Row[]> {
    const tenant = als.getStore()?.tenant;
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
@UseGuards(AlsAuthGuard)
@UseInterceptors(TenantResponseAudit)
export class OrdersController {
  constructor(private readonly svc: OrdersService) { constructed('OrdersController'); }
  @Get() list() { return this.svc.list(); }
}

@Module({
  imports: [dbModule('admin')],
  controllers: [OrdersController, StatsController],
  providers: [AlsAuthGuard, OrdersRepository, OrdersService],
})
export class AlsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply((_req: unknown, _res: unknown, next: () => void) => als.run({}, next)).forRoutes(OrdersController);
  }
}
