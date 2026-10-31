// AFTER: application code throws AppError only; HTTP and the worker map it at their edges.
import 'reflect-metadata';
import {
  ArgumentsHost, Body, Catch, Controller, ExceptionFilter, Get, Injectable, MiddlewareConsumer,
  Module, NestModule, Param, ParseIntPipe, Post, ValidationPipe, type ValidationError,
} from '@nestjs/common';
import { APP_FILTER, APP_PIPE, NestFactory } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { makePool, ORDER_LIMIT, ORDER_PAUSE_MS, POOL } from '../shared/db.js';
import { PlaceOrderDto, RegisterCustomerDto } from '../shared/dto.js';
import { LogSink } from '../shared/log.js';
import { Db } from './db.js';
import { toDecision, toProblem, type Decision } from './edges.js';
import { causeChain, CustomerNotFound, EmailTaken, isAppError, OrderLimitReached, ValidationFailed, type Issue } from './errors.js';
import { Inject } from '@nestjs/common';

// ---- data layer ---------------------------------------------------------------------------
@Injectable()
export class CustomersRepository {
  constructor(private readonly db: Db) {}

  async insert(email: string) {
    const { rows } = await this.db.query<{ id: number; email: string }>(
      'INSERT INTO customers (email) VALUES ($1) RETURNING id, email', [email],
      { customers_email_key: (cause) => new EmailTaken(email, { cause }) },
    );
    return rows[0];
  }

  async findById(id: number) {
    const { rows } = await this.db.query<{ id: number; email: string }>('SELECT id, email FROM customers WHERE id = $1', [id]);
    return rows[0];
  }
}

@Injectable()
export class OrdersRepository {
  constructor(
    private readonly db: Db,
    @Inject(ORDER_LIMIT) private readonly limit: number,
    @Inject(ORDER_PAUSE_MS) private readonly pauseMs: number,
  ) {}

  placeWithinLimit(customerId: number, amount: number) {
    return this.db.tx('SERIALIZABLE', async (q) => {
      const { rows: [{ n }] } = await q.query('SELECT count(*)::int AS n FROM orders WHERE customer_id = $1', [customerId]);
      if (n >= this.limit) throw new OrderLimitReached(this.limit);
      if (this.pauseMs) await q.query('SELECT pg_sleep($1)', [this.pauseMs / 1000]);
      const { rows } = await q.query('INSERT INTO orders (customer_id, amount) VALUES ($1, $2) RETURNING id', [customerId, amount]);
      return rows[0] as { id: number };
    }, { orders_customer_id_fkey: (cause) => new CustomerNotFound(customerId, { cause }) });
  }
}

// ---- application layer: no HTTP, no logging -----------------------------------------------
@Injectable()
export class CustomersService {
  constructor(private readonly customers: CustomersRepository, private readonly orders: OrdersRepository) {}

  register(email: string) { return this.customers.insert(email); }

  async get(id: number) {
    const c = await this.customers.findById(id);
    if (!c) throw new CustomerNotFound(id);
    return c;
  }

  placeOrder(customerId: number, amount: number) { return this.orders.placeWithinLimit(customerId, amount); }

  /** A deliberate bug for the experiment: a programmer error, not a business outcome. */
  buggyReport(): string { const x = undefined as unknown as { total: number }; return x.total.toFixed(2); }
}

// ---- validation -> the same ValidationFailed for HTTP and for jobs ---------------------------
function toIssues(errors: ValidationError[], prefix = '#'): Issue[] {
  return errors.flatMap((e) => [
    ...Object.values(e.constraints ?? {}).map((detail) => ({ pointer: `${prefix}/${e.property}`, detail })),
    ...toIssues(e.children ?? [], `${prefix}/${e.property}`),
  ]);
}

export async function validatePayload<T extends object>(cls: new () => T, plain: unknown): Promise<T> {
  const obj = plainToInstance(cls, plain);
  const errors = await validate(obj as object, { whitelist: true, forbidNonWhitelisted: true });
  if (errors.length) throw new ValidationFailed(toIssues(errors));
  return obj;
}

// ---- HTTP edge ----------------------------------------------------------------------------
@Controller()
export class CustomersController {
  constructor(private readonly svc: CustomersService) {}
  @Post('customers') register(@Body() dto: RegisterCustomerDto) { return this.svc.register(dto.email); }
  @Get('customers/:id') get(@Param('id', ParseIntPipe) id: number) { return this.svc.get(id); }
  @Post('orders') place(@Body() dto: PlaceOrderDto) { return this.svc.placeOrder(dto.customerId, dto.amount); }
  @Get('report') report() { return this.svc.buggyReport(); }
}

const REQUEST_ID = /^[A-Za-z0-9-]{8,64}$/;
export function requestId(req: Request & { id?: string }, res: Response, next: NextFunction) {
  const incoming = req.header('x-request-id');
  req.id = incoming && REQUEST_ID.test(incoming) ? incoming : randomUUID();  // never trust arbitrary header text into logs
  res.setHeader('x-request-id', req.id);
  next();
}

@Catch()
export class ProblemFilter implements ExceptionFilter {
  constructor(private readonly log: LogSink) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<Request & { id?: string }>();
    const res = http.getResponse<Response>();
    const problem = toProblem(exception);
    // req.id is missing when the failure happened BEFORE Nest middleware ran (e.g. the body parser
    // rejected malformed JSON), so the filter, not the middleware, is the place that guarantees the header.
    const requestId = req.id ?? randomUUID();
    res.setHeader('x-request-id', requestId);

    // Log ONCE, here. 5xx with the full cause chain; 4xx is a client outcome, not an incident.
    if (problem.status >= 500) {
      this.log.write({ level: 'error', msg: 'request failed', requestId, code: problem.code, status: problem.status,
        route: `${req.method} ${req.route?.path ?? req.path}`, chain: causeChain(exception) });
    } else {
      this.log.write({ level: 'info', msg: 'request rejected', requestId, code: problem.code, status: problem.status });
    }

    if (problem.status === 503) res.setHeader('Retry-After', '1');
    res.status(problem.status).type('application/problem+json')
      .send(JSON.stringify({ ...problem, instance: req.originalUrl, requestId }));
  }
}

export interface AfterOptions { pgUrl?: string; orderLimit?: number; orderPauseMs?: number; sink?: LogSink }

function providers(o: AfterOptions) {
  return [
    { provide: POOL, useFactory: () => makePool(o.pgUrl) },
    { provide: ORDER_LIMIT, useValue: o.orderLimit ?? 2 },
    { provide: ORDER_PAUSE_MS, useValue: o.orderPauseMs ?? 0 },
    { provide: LogSink, useValue: o.sink ?? new LogSink() },
    Db, CustomersRepository, OrdersRepository, CustomersService,
  ];
}

export async function createAfterHttp(o: AfterOptions = {}) {
  @Module({
    controllers: [CustomersController],
    providers: [
      ...providers(o),
      { provide: APP_FILTER, useClass: ProblemFilter },
      { provide: APP_PIPE, useValue: new ValidationPipe({
        whitelist: true, forbidNonWhitelisted: true, transform: true,
        exceptionFactory: (errors) => new ValidationFailed(toIssues(errors)),
      }) },
    ],
  })
  class AfterHttpModule implements NestModule {
    configure(consumer: MiddlewareConsumer) { consumer.apply(requestId).forRoutes('*path'); }
  }
  const app = await NestFactory.create(AfterHttpModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  return app;
}

// ---- Worker edge --------------------------------------------------------------------------
export interface Job { id: string; name: 'register-customer' | 'place-order' | 'report'; payload: unknown }
export interface Outcome { decision: Decision; attempts: number; code?: string }

@Injectable()
export class Worker {
  constructor(private readonly svc: CustomersService, private readonly log: LogSink) {}

  private async handle(job: Job) {
    switch (job.name) {
      case 'register-customer': { const p = await validatePayload(RegisterCustomerDto, job.payload); return this.svc.register(p.email); }
      case 'place-order': { const p = await validatePayload(PlaceOrderDto, job.payload); return this.svc.placeOrder(p.customerId, p.amount); }
      case 'report': return this.svc.buggyReport();
    }
  }

  async run(job: Job, maxAttempts = 3, backoffMs = (n: number) => 20 * 2 ** n): Promise<Outcome> {
    for (let attempt = 1; ; attempt++) {
      try {
        await this.handle(job);
        return { decision: 'ack', attempts: attempt };
      } catch (e) {
        const decision = toDecision(e);
        const code = isAppError(e) ? e.code : 'INTERNAL';
        if (decision === 'retry' && attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, backoffMs(attempt)));
          continue;                                  // no log per attempt: the final outcome is logged once
        }
        const final: Decision = decision === 'retry' ? 'dead-letter' : decision;
        this.log.write({
          level: final === 'drop' ? 'info' : 'error', msg: 'job finished with error', jobId: job.id, job: job.name,
          decision: final, attempts: attempt, code, ...(final === 'drop' ? {} : { chain: causeChain(e) }),
        });
        return { decision: final, attempts: attempt, code };
      }
    }
  }
}

export async function createAfterWorker(o: AfterOptions = {}) {
  @Module({ providers: [...providers(o), Worker] })
  class AfterWorkerModule {}
  return NestFactory.createApplicationContext(AfterWorkerModule, { logger: false });
}
