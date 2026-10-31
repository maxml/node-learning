// FIX 2: request-scoped context. Correct, but REQUEST scope bubbles up to the controller.
import {
  CanActivate, Controller, ExecutionContext, Get, Inject, Injectable, Module, Scope, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { AuthGuard } from './explicit.js';
import { constructed, Db, dbModule, Req, Row, StatsController, TenantId, TenantResponseAudit } from '../shared.js';

@Injectable({ scope: Scope.REQUEST })
export class TenantContext {
  constructor(@Inject(REQUEST) private readonly req: Req) { constructed('TenantContext'); }
  get tenant(): TenantId { return TenantId.fromUser(this.req.user); }   // read lazily, after the guard ran
}

@Injectable()
export class OrdersRepository {                 // declared DEFAULT, becomes request-scoped
  constructor(private readonly db: Db, private readonly ctx: TenantContext) { constructed('OrdersRepository'); }
  findAll(): Promise<Row[]> {
    return this.db.query('SELECT id, tenant_id, item FROM orders WHERE tenant_id = $1', [this.ctx.tenant.value]);
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
export class RequestScopedModule {}
