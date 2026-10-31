# Scenario: unified error handling in NestJS

> In a NestJS application, services and repositories frequently throw `HttpException`. The same
> application services are now also used by scheduled jobs and background workers. This creates
> several problems: workers receive HTTP-specific exceptions, similar failures produce different
> API responses, database errors sometimes leak implementation details… *(cut on the screenshot)*

One small domain (customers, orders with a "max 2 orders per customer" rule checked in a
`SERIALIZABLE` transaction), built twice on the same PostgreSQL schema:

| Variant | Where | What it does |
| --- | --- | --- |
| before | `src/before/app.ts` | repository throws `ConflictException(err.message)`, service throws `NotFoundException`, raw pg errors (23503, 40001, ECONNREFUSED) go up as is; repository, service and worker each log the failure; the worker retries everything 3 times |
| after | `src/after/*.ts` | `errors.ts`: `AppError` with stable `code` and `kind` (`expected` / `transient` / `unexpected`); `db.ts`: the only class holding the pool, translates every pg error (mapped constraint → domain error, 40001/40P01 → `ConcurrencyConflict`, connection → `DatabaseUnavailable`, anything else → `UnexpectedDatabaseError`) with the raw error as `cause`; `edges.ts`: pure mappings `toProblem()` (RFC 9457) and `toDecision()` (retry / drop / dead-letter); `app.ts`: global `@Catch()` filter, request-id middleware, `ValidationPipe` with `exceptionFactory`, standalone-context worker that validates job payloads with the same DTO |

Tests (`test/`): `before.test.ts` passes by asserting the defects; `after.test.ts` sends the same
requests and jobs; `edges.test.ts` feeds the translator with real PostgreSQL errors and checks that
the mappings are total.

## Run

```bash
npm install
npm run db:up      # postgres:18 on 127.0.0.1:55436 (container scen-errors-pg)
npm test           # tsc build + node:test, ~25 s (idle pg pools keep the process alive ~10 s)
npm run db:down
```

Versions (2026-10-31): Node 24.14.1, NestJS 12.3.2 (Express 5.3.0 adapter), TypeScript 7.0.2
(`experimentalDecorators` + `emitDecoratorMetadata`, ESM output), pg 8.23.1, class-validator
0.15.1, PostgreSQL 18.6 in Docker. Laptop, shared and noisy: timings are not benchmarks.

## Output of the 2026-10-31 run (30/30 pass), trimmed

```
BEFORE: HttpException in services and repositories
  409 body: {"message":"duplicate key value violates unique constraint \"customers_email_key\"","error":"Conflict","statusCode":409}
  GET  /customers/999: 404 {"message":"Customer 999 not found","error":"Not Found","statusCode":404}
  POST /orders cid=999: 500 {"statusCode":500,"message":"Internal server error"}
  validation: 400 {"message":["email must be an email"],"error":"Bad Request","statusCode":400}
  concurrent orders: [ 201, 500 ] {"statusCode":500,"message":"Internal server error"}
  db down: 500 {"statusCode":500,"message":"Internal server error"}
BEFORE: worker using the same service
  outcome: dead-letter attempts 3 log records 9          <- lastError instanceof HttpException
  invalid payload -> 22P02 invalid input syntax for type integer: "x"

AFTER: HTTP edge (global ProblemFilter)
  409 {"type":"https://api.example.com/problems/email-taken","title":"Email already registered","status":409,"code":"EMAIL_TAKEN","retryable":false,"detail":"Email is already registered","instance":"/customers","requestId":"req-12345678"}
  GET  404 {"type":".../customer-not-found",...,"code":"CUSTOMER_NOT_FOUND",...,"instance":"/customers/999",...}
  POST 404 {"type":".../customer-not-found",...,"code":"CUSTOMER_NOT_FOUND",...,"instance":"/orders",...}
  422 {"type":".../validation-failed",...,"errors":[{"pointer":"#/extra","detail":"property extra should not exist"},{"pointer":"#/customerId",...},{"pointer":"#/amount",...}]}
  malformed JSON: 400 {"type":"about:blank","title":"Bad Request","status":400,"code":"HTTP_400",...}
  concurrent orders: [ 201, 503 ] {"type":".../concurrency-conflict",...,"retryable":true,...}   + Retry-After: 1
  500 {"type":".../internal","title":"Internal error","status":500,"code":"INTERNAL","retryable":false,...}
  log: {"level":"error","msg":"request failed",...,"code":"INTERNAL","status":500,"route":"GET /report","chain":[{"name":"TypeError","message":"Cannot read properties of undefined (reading 'total')"}]}
  db down: 503 {"type":".../database-unavailable",...,"retryable":true,...}
  log chain: [{"name":"DatabaseUnavailable",...},{"name":"Error","message":"connect ECONNREFUSED 127.0.0.1:1","code":"ECONNREFUSED"}]
AFTER: worker edge
  { decision: 'drop', attempts: 1, code: 'EMAIL_TAKEN' }
  { decision: 'dead-letter', attempts: 1, code: 'VALIDATION_FAILED' }
  { decision: 'ack', attempts: 1 } { decision: 'ack', attempts: 2 }      <- 40001, retried, succeeded
  { decision: 'drop', attempts: 1, code: 'CUSTOMER_NOT_FOUND' }
  { decision: 'dead-letter', attempts: 1, code: 'INTERNAL' }
  { decision: 'dead-letter', attempts: 3, code: 'DATABASE_UNAVAILABLE' } log records 1

translatePgError with real PostgreSQL 18 errors
  raw: 23505 customers_email_key | duplicate key value violates unique constraint "customers_email_key" | Key (email)=(t@example.com) already exists.
  raw: 23503 orders_customer_id_fkey | insert or update on table "orders" violates foreign key constraint "orders_customer_id_fkey"
  raw: 40001 | could not serialize access due to read/write dependencies among transactions
  raw: ECONNREFUSED | connect ECONNREFUSED 127.0.0.1:1
  {"VALIDATION_FAILED":"dead-letter","EMAIL_TAKEN":"drop","CUSTOMER_NOT_FOUND":"drop","ORDER_LIMIT_REACHED":"drop","CONCURRENCY_CONFLICT":"retry","DATABASE_UNAVAILABLE":"retry","UNEXPECTED_DATABASE_ERROR":"dead-letter"}
```

## Findings worth keeping

- Nest itself did not leak the pg message: an unknown error became `500 Internal server error`.
  The leak came from application code that put `err.message` into an `HttpException`.
- The pg `detail` of a unique violation contains the row value (`Key (email)=(t@example.com)`), so
  it is personal data: the cause chain in logs keeps `name`, `message`, `code`, `constraint`, not
  `detail` or query parameters.
- Malformed JSON is rejected by the body parser **before** Nest middleware runs: in the first run the
  request-id middleware had not set `x-request-id` on that response. The filter now sets the header
  itself; the middleware alone is not enough.
- 40001 surfaced at `COMMIT` of the second transaction, not at the `INSERT`.

## Mutations (re-applied by hand to `dist/`, then rebuilt)

| Mutation | Tests that went red |
| --- | --- |
| `Db.query` rethrows the raw error instead of translating | 5 of 13 in `after.test`: EMAIL_TAKEN (HTTP and worker), DB down (HTTP and worker), 40001 worker retry |
| `toProblem` sends `detail` for every kind | `transient/unexpected never expose their message as detail` |
| `toDecision` maps `transient` to dead-letter | worker 40001 retry, worker DB down, decision table |
| filter does not set `x-request-id` (the original version) | `framework errors get the same envelope` |
