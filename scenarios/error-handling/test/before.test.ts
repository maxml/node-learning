// BEFORE: these tests PASS by asserting the defects from the scenario. They document the problem.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { HttpException } from '@nestjs/common';
import { BeforeWorker, createBeforeHttp, createBeforeWorker } from '../src/before/app.js';
import { DEAD_PG_URL } from '../src/shared/db.js';
import { LogSink } from '../src/shared/log.js';
import { baseUrl, call, freshDb, LEAK } from './helpers.js';

describe('BEFORE: HttpException in services and repositories', () => {
  const sink = new LogSink();
  let app: Awaited<ReturnType<typeof createBeforeHttp>>;
  let base: string;

  before(async () => {
    await freshDb();
    app = await createBeforeHttp({ sink, orderPauseMs: 200 });
    base = baseUrl(app);
  });
  after(async () => { await app.close(); });

  test('duplicate email: 409 whose body leaks the constraint name and pg wording', async () => {
    await call(base, 'POST', '/customers', { email: 'a@example.com' });
    sink.clear();
    const r = await call(base, 'POST', '/customers', { email: 'a@example.com' });
    console.log('    409 body:', r.text);
    assert.equal(r.status, 409);
    assert.match(r.text, LEAK);
    assert.equal(sink.records.length, 2, 'repository AND service logged the same failure');
  });

  test('"customer does not exist" gives 404 on GET but 500 on POST /orders (FK violation)', async () => {
    const g = await call(base, 'GET', '/customers/999');
    const p = await call(base, 'POST', '/orders', { customerId: 999, amount: 10 });
    console.log('    GET  /customers/999:', g.status, g.text);
    console.log('    POST /orders cid=999:', p.status, p.text);
    assert.equal(g.status, 404);
    assert.equal(p.status, 500);
    assert.equal(p.json.message, 'Internal server error');
  });

  test('validation error has yet another shape (message array, 400)', async () => {
    const r = await call(base, 'POST', '/customers', { email: 'nope' });
    console.log('    validation:', r.status, r.text);
    assert.equal(r.status, 400);
    assert.ok(Array.isArray(r.json.message));
  });

  test('serialization failure (40001) becomes a generic 500: client cannot tell it may retry', async () => {
    const c = await call(base, 'POST', '/customers', { email: 'ser@example.com' });
    const [x, y] = await Promise.all([
      call(base, 'POST', '/orders', { customerId: c.json.id, amount: 1 }),
      call(base, 'POST', '/orders', { customerId: c.json.id, amount: 2 }),
    ]);
    const statuses = [x.status, y.status].sort();
    console.log('    concurrent orders:', statuses, (x.status === 500 ? x : y).text);
    assert.deepEqual(statuses, [201, 500]);
  });

  test('DB down: generic 500, no Retry-After', async () => {
    const down = await createBeforeHttp({ pgUrl: DEAD_PG_URL });
    try {
      const r = await call(baseUrl(down), 'GET', '/customers/1');
      console.log('    db down:', r.status, r.text);
      assert.equal(r.status, 500);
      assert.equal(r.headers.get('retry-after'), null);
    } finally { await down.close(); }
  });
});

describe('BEFORE: worker using the same service', () => {
  const sink = new LogSink();
  let ctx: Awaited<ReturnType<typeof createBeforeWorker>>;
  let worker: BeforeWorker;

  before(async () => {
    await freshDb();
    ctx = await createBeforeWorker({ sink });
    worker = ctx.get(BeforeWorker);
  });
  after(async () => { await ctx.close(); });

  test('worker receives an HTTP exception and retries a business outcome 3 times', async () => {
    await worker.run({ name: 'register-customer', payload: { email: 'w@example.com' } });
    sink.clear();
    const out = await worker.run({ name: 'register-customer', payload: { email: 'w@example.com' } });
    console.log('    outcome:', out.decision, 'attempts', out.attempts, 'log records', sink.records.length);
    assert.ok(out.lastError instanceof HttpException, 'transport type inside a worker');
    assert.equal(out.attempts, 3);
    assert.equal(out.decision, 'dead-letter');
    assert.equal(sink.records.length, 9, '3 attempts x (repository + service + worker)');
  });

  test('invalid payload is not validated in the worker: it reaches the DB', async () => {
    const out = await worker.run({ name: 'place-order', payload: { customerId: 'x', amount: 1 } });
    const err = out.lastError as { code?: string; message?: string };
    console.log('    invalid payload ->', err.code, err.message);
    assert.equal(err.code, '22P02');            // invalid_text_representation from Postgres
    assert.equal(out.attempts, 3);
  });
});
