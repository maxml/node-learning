'use strict';
// Code under test for the test-doubles experiment.
// Dependencies arrive through the factory (constructor injection), so a test can
// hand in a stub clock, a spy mailer or an in-memory fake repository.
//
// Two implementations with the same observable behaviour:
//   A: saves the order with orders.save(order)
//   B: a refactor that saves through orders.insertMany([order])
// IMPL=b selects B. A classicist test (checks state) must pass for both,
// a mockist test (checks the exact calls) breaks on B.

function createOrderService({ orders, mailer, clock, audit }) {
  const impl = process.env.IMPL === 'b' ? 'b' : 'a';
  return {
    async place(customer, items) {
      if (items.length === 0) throw new Error('empty order');
      const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
      const order = {
        id: await orders.nextId(),
        customer: customer.id,
        total,
        createdAt: clock.now().toISOString(),
      };
      if (impl === 'a') await orders.save(order);
      else await orders.insertMany([order]);
      await mailer.send(customer.email, `Order ${order.id}: ${total}`);
      if (total > 10_000) audit.log('large order', order.id); // audit is untouched for small orders
      return order;
    },
  };
}

// Fake: a working, simplified implementation of the repository contract.
function createInMemoryOrders() {
  const rows = new Map();
  let seq = 0;
  return {
    async nextId() { seq += 1; return `o-${seq}`; },
    async save(order) { rows.set(order.id, structuredClone(order)); },
    async insertMany(list) { for (const o of list) rows.set(o.id, structuredClone(o)); },
    async findById(id) { return rows.get(id) ?? null; },
  };
}

module.exports = { createOrderService, createInMemoryOrders };
