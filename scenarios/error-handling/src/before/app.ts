// BEFORE: the scenario as described. Services and repositories throw HttpException,
// the repository logs and rethrows, DB errors are either leaked or left raw.
import 'reflect-metadata';
import {
  Body, ConflictException, Controller, Get, HttpException, Inject, Injectable, Module,
  NotFoundException, Param, ParseIntPipe, Post, ValidationPipe,
} from '@nestjs/common';
import { APP_PIPE, NestFactory } from '@nestjs/core';
import type pg from 'pg';
import { makePool, ORDER_LIMIT, ORDER_PAUSE_MS, POOL } from '../shared/db.js';
import { PlaceOrderDto, RegisterCustomerDto } from '../shared/dto.js';
import { LogSink } from '../shared/log.js';

@Injectable()
export class CustomersRepository {
  constructor(@Inject(POOL) private readonly pool: pg.Pool, private readonly log: LogSink) {}

  async insert(email: string): Promise<{ id: number; email: string }> {
    try {
      const { rows } = await this.pool.query('INSERT INTO customers (email) VALUES ($1) RETURNING id, email', [email]);
      return rows[0];
    } catch (e: any) {
      this.log.write({ level: 'error', msg: 'insert customer failed', err: e.message }); // log #1
      if (e.code === '23505') throw new ConflictException(e.message);                    // ❌ HTTP + raw driver text
      throw e;
    }
  }

  async findById(id: number): Promise<{ id: number; email: string } | undefined> {
    const { rows } = await this.pool.query('SELECT id, email FROM customers WHERE id = $1', [id]);
    return rows[0];
  }
}

@Injectable()
export class OrdersRepository {
  constructor(
    @Inject(POOL) private readonly pool: pg.Pool,
    @Inject(ORDER_LIMIT) private readonly limit: number,
    @Inject(ORDER_PAUSE_MS) private readonly pauseMs: number,
  ) {}

  /** Max `limit` orders per customer, enforced in a SERIALIZABLE transaction. */
  async placeWithinLimit(customerId: number, amount: number): Promise<{ id: number }> {
    const c = await this.pool.connect();
    try {
      await c.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const { rows: [{ n }] } = await c.query('SELECT count(*)::int AS n FROM orders WHERE customer_id = $1', [customerId]);
      if (n >= this.limit) throw new HttpException('Order limit reached', 409);       // ❌ HTTP in data layer
      if (this.pauseMs) await c.query('SELECT pg_sleep($1)', [this.pauseMs / 1000]);
      const { rows } = await c.query('INSERT INTO orders (customer_id, amount) VALUES ($1, $2) RETURNING id', [customerId, amount]);
      await c.query('COMMIT');
      return rows[0];
    } catch (e) {
      await c.query('ROLLBACK').catch(() => {});
      throw e;                                                                         // raw pg error (23503, 40001)
    } finally {
      c.release();
    }
  }
}

@Injectable()
export class CustomersService {
  constructor(
    private readonly customers: CustomersRepository,
    private readonly orders: OrdersRepository,
    private readonly log: LogSink,
  ) {}

  async register(email: string) {
    try {
      return await this.customers.insert(email);
    } catch (e: any) {
      this.log.write({ level: 'error', msg: 'register failed', err: e.message });      // log #2 of the same failure
      throw e;
    }
  }

  async get(id: number) {
    const c = await this.customers.findById(id);
    if (!c) throw new NotFoundException(`Customer ${id} not found`);                   // ❌ HTTP in application service
    return c;
  }

  async placeOrder(customerId: number, amount: number) {
    return this.orders.placeWithinLimit(customerId, amount);
  }
}

@Controller()
export class CustomersController {
  constructor(private readonly svc: CustomersService) {}
  @Post('customers') register(@Body() dto: RegisterCustomerDto) { return this.svc.register(dto.email); }
  @Get('customers/:id') get(@Param('id', ParseIntPipe) id: number) { return this.svc.get(id); }
  @Post('orders') place(@Body() dto: PlaceOrderDto) { return this.svc.placeOrder(dto.customerId, dto.amount); }
}

export interface BeforeOptions { pgUrl?: string; orderLimit?: number; orderPauseMs?: number; sink?: LogSink }

function providers(o: BeforeOptions) {
  return [
    { provide: POOL, useFactory: () => makePool(o.pgUrl) },
    { provide: ORDER_LIMIT, useValue: o.orderLimit ?? 2 },
    { provide: ORDER_PAUSE_MS, useValue: o.orderPauseMs ?? 0 },
    { provide: LogSink, useValue: o.sink ?? new LogSink() },
    CustomersRepository, OrdersRepository, CustomersService,
  ];
}

export async function createBeforeHttp(o: BeforeOptions = {}) {
  @Module({
    controllers: [CustomersController],
    providers: [...providers(o), { provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true }) }],
  })
  class BeforeHttpModule {}
  const app = await NestFactory.create(BeforeHttpModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  return app;
}

// ---- Worker: same service, scheduled job / queue consumer -------------------------------
export interface Job { name: 'register-customer' | 'place-order'; payload: any }
export type Outcome = { decision: 'ack' | 'retry' | 'dead-letter'; attempts: number; lastError?: unknown };

@Injectable()
export class BeforeWorker {
  constructor(private readonly svc: CustomersService, private readonly log: LogSink) {}

  /** Typical "before" worker: it only sees HttpException or raw errors, so it retries everything. */
  async run(job: Job, maxAttempts = 3): Promise<Outcome> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        if (job.name === 'register-customer') await this.svc.register(job.payload.email);
        else await this.svc.placeOrder(job.payload.customerId, job.payload.amount);
        return { decision: 'ack', attempts: attempt };
      } catch (e) {
        lastError = e;
        this.log.write({ level: 'error', msg: 'job failed', job: job.name, attempt, err: (e as Error).message }); // log #3
      }
    }
    return { decision: 'dead-letter', attempts: maxAttempts, lastError };
  }
}

export async function createBeforeWorker(o: BeforeOptions = {}) {
  @Module({ providers: [...providers(o), BeforeWorker] })
  class BeforeWorkerModule {}
  return NestFactory.createApplicationContext(BeforeWorkerModule, { logger: false });
}
