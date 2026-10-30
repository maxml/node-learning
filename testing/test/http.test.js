'use strict';
// HTTP-level tests: supertest (pinned 7.3.1) and the same check with plain fetch.
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../src/app');

function fakeUsers() {
  const rows = new Map([['u1', { id: 'u1', email: 'ann@example.test' }]]);
  let seq = 1;
  return {
    async findById(id) { return rows.get(id) ?? null; },
    async create({ email }) { seq += 1; const u = { id: `u${seq}`, email }; rows.set(u.id, u); return u; },
  };
}

describe('supertest: passes the server object, binds an ephemeral port itself', () => {
  const app = createApp({ users: fakeUsers() });

  test('GET existing user', async () => {
    const res = await request(app).get('/users/u1').expect(200).expect('content-type', /json/);
    assert.deepEqual(res.body, { id: 'u1', email: 'ann@example.test' });
  });

  test('POST validates input: 400 for broken JSON, 422 for missing email', async () => {
    await request(app).post('/users').set('content-type', 'application/json').send('{"email":').expect(400);
    await request(app).post('/users').send({ name: 'x' }).expect(422);
  });

  test('POST creates and the resource is readable afterwards', async () => {
    const created = await request(app).post('/users').send({ email: 'bob@example.test' }).expect(201);
    await request(app).get(`/users/${created.body.id}`).expect(200);
  });
});

describe('plain fetch: listen(0) and close in hooks', () => {
  let server; let base;
  before(async () => {
    server = createApp({ users: fakeUsers() });
    await new Promise((r) => server.listen(0, '127.0.0.1', r));
    base = `http://127.0.0.1:${server.address().port}`;
  });
  after(() => new Promise((r) => server.close(r)));

  test('unknown route is a JSON 404', async () => {
    const res = await fetch(`${base}/nope`);
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: 'no route' });
  });
});
