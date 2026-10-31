// AFTER: the same requests and jobs, now through AppError + edge mappings.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createAfterHttp, createAfterWorker, Worker } from '../src/after/app.js';
import { DEAD_PG_URL, makePool } from '../src/shared/db.js';
import { LogSink } from '../src/shared/log.js';
import { baseUrl, call, freshDb, LEAK, type Res } from './helpers.js';

function assertProblem(r: Res, status: number, code: string) {
  assert.equal(r.status, status, r.text);
  assert.match(r.contentType ?? '', /^application\/problem\+json/);
  assert.equal(r.json.status, status, 'body status mirrors the real one (RFC 9457)');
  assert.equal(r.json.code, code);
  assert.ok(r.json.type && r.json.title, 'type and title present');
  assert.equal(r.json.requestId, r.headers.get('x-request-id'), 'correlation id in body and header');
  assert.doesNotMatch(r.text, LEAK, 'no schema/driver details');
}

describe('AFTER: HTTP edge (global ProblemFilter)', () => {
  const sink = new LogSink();
  let app: Awaited<ReturnType<typeof createAfterHttp>>;
  let base: string;

  before(async () => {
    await freshDb();
    app = await createAfterHttp({ sink, orderPauseMs: 200 });
    base = baseUrl(app);
  });
  after(async () => { await app.close(); });

  test('duplicate email: 409 EMAIL_TAKEN, no leak, logged once at info', async () => {
    await call(base, 'POST', '/customers', { email: 'a@example.com' });
    sink.clear();
    const r = await call(base, 'POST', '/customers', { email: 'a@example.com' }, { 'x-request-id': 'req-12345678' });
    console.log('    409 body:', r.text);
    assertProblem(r, 409, 'EMAIL_TAKEN');
    assert.equal(r.json.requestId, 'req-12345678');
    assert.equal(sink.records.length, 1);
    assert.equal(sink.records[0].level, 'info');
  });

  test('"customer does not exist" is the same 404 problem on GET and on POST /orders (FK)', async () => {
    const g = await call(base, 'GET', '/customers/999');
    const p = await call(base, 'POST', '/orders', { customerId: 999, amount: 10 });
    console.log('    GET :', g.status, g.text);
    console.log('    POST:', p.status, p.text);
    assertProblem(g, 404, 'CUSTOMER_NOT_FOUND');
    assertProblem(p, 404, 'CUSTOMER_NOT_FOUND');
    assert.equal(g.json.type, p.json.type);
  });

  test('validation: 422 with JSON pointers per field', async () => {
    const r = await call(base, 'POST', '/orders', { customerId: 'x', amount: 0, extra: true });
    console.log('    422:', r.text);
    assertProblem(r, 422, 'VALIDATION_FAILED');
    assert.deepEqual([...new Set(r.json.errors.map((e: any) => e.pointer))].sort(), ['#/amount', '#/customerId', '#/extra']);
  });

  test('framework errors get the same envelope: malformed JSON, unknown route, ParseIntPipe', async () => {
    const bad = await call(base, 'POST', '/customers', '{"email":');
    const nf = await call(base, 'GET', '/nope');
    const pi = await call(base, 'GET', '/customers/abc');
    console.log('    malformed JSON:', bad.status, bad.text);
    assertProblem(bad, 400, 'HTTP_400');
    assertProblem(nf, 404, 'HTTP_404');
    assertProblem(pi, 400, 'HTTP_400');
  });

  test('40001 serialization failure: 503 CONCURRENCY_CONFLICT, retryable, Retry-After', async () => {
    const c = await call(base, 'POST', '/customers', { email: 'ser@example.com' });
    const [x, y] = await Promise.all([
      call(base, 'POST', '/orders', { customerId: c.json.id, amount: 1 }),
      call(base, 'POST', '/orders', { customerId: c.json.id, amount: 2 }),
    ]);
    const failed = x.status === 201 ? y : x;
    console.log('    concurrent orders:', [x.status, y.status].sort(), failed.text);
    assert.deepEqual([x.status, y.status].sort(), [201, 503]);
    assertProblem(failed, 503, 'CONCURRENCY_CONFLICT');
    assert.equal(failed.json.retryable, true);
    assert.equal(failed.headers.get('retry-after'), '1');
  });

  test('programmer bug: 500 without detail; logged once at error with the cause chain', async () => {
    sink.clear();
    const r = await call(base, 'GET', '/report');
    console.log('    500:', r.text);
    console.log('    log:', JSON.stringify(sink.records[0]));
    assertProblem(r, 500, 'INTERNAL');
    assert.equal(r.json.detail, undefined);
    assert.equal(sink.records.length, 1);
    assert.equal(sink.records[0].level, 'error');
    assert.equal((sink.records[0].chain as any[])[0].name, 'TypeError');
  });

  test('DB down: 503 DATABASE_UNAVAILABLE; the log keeps ECONNREFUSED in the cause chain', async () => {
    const downSink = new LogSink();
    const down = await createAfterHttp({ pgUrl: DEAD_PG_URL, sink: downSink });
    try {
      const r = await call(baseUrl(down), 'GET', '/customers/1');
      console.log('    db down:', r.status, r.text);
      console.log('    log chain:', JSON.stringify(downSink.records[0].chain));
      assertProblem(r, 503, 'DATABASE_UNAVAILABLE');
      assert.equal(r.json.retryable, true);
      assert.equal((downSink.records[0].chain as any[])[1].code, 'ECONNREFUSED');
    } finally { await down.close(); }
  });
});

describe('AFTER: worker edge (same service, same errors, queue decisions)', () => {
  const sink = new LogSink();
  let ctx: Awaited<ReturnType<typeof createAfterWorker>>;
  let worker: Worker;

  before(async () => {
    await freshDb();
    ctx = await createAfterWorker({ sink, orderPauseMs: 200 });
    worker = ctx.get(Worker);
  });
  after(async () => { await ctx.close(); });

  test('EMAIL_TAKEN -> drop after 1 attempt, one info record', async () => {
    await worker.run({ id: 'j1', name: 'register-customer', payload: { email: 'w@example.com' } });
    sink.clear();
    const out = await worker.run({ id: 'j2', name: 'register-customer', payload: { email: 'w@example.com' } });
    console.log('    ', out);
    assert.deepEqual(out, { decision: 'drop', attempts: 1, code: 'EMAIL_TAKEN' });
    assert.equal(sink.records.length, 1);
  });

  test('invalid payload -> dead-letter after 1 attempt, never reaches the DB', async () => {
    const out = await worker.run({ id: 'j3', name: 'place-order', payload: { customerId: 'x', amount: 1 } });
    console.log('    ', out);
    assert.deepEqual(out, { decision: 'dead-letter', attempts: 1, code: 'VALIDATION_FAILED' });
  });

  test('40001 -> retry, and the retried job succeeds', async () => {
    const reg = await worker.run({ id: 'j4', name: 'register-customer', payload: { email: 'ser@example.com' } });
    assert.equal(reg.decision, 'ack');
    const pool = makePool();
    const { rows: [{ id }] } = await pool.query(`SELECT id FROM customers WHERE email = 'ser@example.com'`);
    await pool.end();
    const [a, b] = await Promise.all([
      worker.run({ id: 'j5', name: 'place-order', payload: { customerId: id, amount: 1 } }),
      worker.run({ id: 'j6', name: 'place-order', payload: { customerId: id, amount: 2 } }),
    ]);
    console.log('    ', a, b);
    assert.deepEqual([a.decision, b.decision], ['ack', 'ack']);
    assert.deepEqual([a.attempts, b.attempts].sort(), [1, 2]);
  });

  test('FK -> CUSTOMER_NOT_FOUND -> drop', async () => {
    const out = await worker.run({ id: 'j7', name: 'place-order', payload: { customerId: 999, amount: 1 } });
    assert.deepEqual(out, { decision: 'drop', attempts: 1, code: 'CUSTOMER_NOT_FOUND' });
  });

  test('programmer bug -> dead-letter after 1 attempt (no pointless retries)', async () => {
    const out = await worker.run({ id: 'j8', name: 'report', payload: {} });
    assert.deepEqual(out, { decision: 'dead-letter', attempts: 1, code: 'INTERNAL' });
  });

  test('DB down -> 3 attempts with backoff, then dead-letter; logged once', async () => {
    const downSink = new LogSink();
    const down = await createAfterWorker({ pgUrl: DEAD_PG_URL, sink: downSink });
    try {
      const out = await down.get(Worker).run({ id: 'j9', name: 'register-customer', payload: { email: 'z@example.com' } });
      console.log('    ', out, 'log records', downSink.records.length);
      assert.deepEqual(out, { decision: 'dead-letter', attempts: 3, code: 'DATABASE_UNAVAILABLE' });
      assert.equal(downSink.records.length, 1);
    } finally { await down.close(); }
  });
});
