'use strict';
// Meszaros' five test doubles on one service, plus classicist vs mockist.
// Run: node --test test/doubles.test.js            (implementation A)
//      IMPL=b node --test test/doubles.test.js     (refactor B: same behaviour, different calls)
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createOrderService, createInMemoryOrders } = require('../src/order-service');

const customer = { id: 'c1', email: 'c1@example.test' };
const items = [{ price: 30, qty: 2 }, { price: 40, qty: 1 }];
// Stub: returns canned answers, the test never asserts on it.
const fixedClock = { now: () => new Date('2026-10-30T12:00:00Z') };
// Dummy: has to be passed, is never used on this path. A Proxy makes any use loud.
const dummyAudit = new Proxy({}, { get() { throw new Error('dummy audit was used'); } });

describe('classicist (state verification, real collaborators where cheap)', () => {
  test('order is stored and one mail is sent', async (t) => {
    const orders = createInMemoryOrders();                 // fake
    const mailer = { send: t.mock.fn(async () => {}) };    // spy: records calls
    const svc = createOrderService({ orders, mailer, clock: fixedClock, audit: dummyAudit });

    const order = await svc.place(customer, items);

    assert.deepEqual(await orders.findById(order.id), {
      id: 'o-1', customer: 'c1', total: 100, createdAt: '2026-10-30T12:00:00.000Z',
    });
    assert.equal(mailer.send.mock.callCount(), 1);
    assert.deepEqual(mailer.send.mock.calls[0].arguments, ['c1@example.test', 'Order o-1: 100']);
  });
});

describe('mockist (behaviour verification, every collaborator is a mock)', () => {
  test('service calls nextId, save and send with exact arguments', async (t) => {
    // Mock in Meszaros' sense: expectations are set up front and verified by the mock.
    const expected = [
      ['nextId', []],
      ['save', [{ id: 'o-1', customer: 'c1', total: 100, createdAt: '2026-10-30T12:00:00.000Z' }]],
      ['send', ['c1@example.test', 'Order o-1: 100']],
    ];
    const actual = [];
    const record = (name, ret) => async (...args) => { actual.push([name, args]); return ret; };
    const orders = { nextId: record('nextId', 'o-1'), save: record('save'), insertMany: record('insertMany') };
    const mailer = { send: record('send') };
    const svc = createOrderService({ orders, mailer, clock: fixedClock, audit: dummyAudit });

    await svc.place(customer, items);

    assert.deepEqual(actual, expected); // verify()
  });
});

test('mock.method replaces a method on a real object and can be restored', (t) => {
  const clock = { now: () => new Date() };
  t.mock.method(clock, 'now', () => new Date(0));
  assert.equal(clock.now().getTime(), 0);
  assert.equal(clock.now.mock.callCount(), 1);
  clock.now.mock.restore();
  assert.notEqual(clock.now().getTime(), 0);
});
