// Тести фіксують поведінку конвеєрів на маленьких фікстурах, а не форму масиву стадій.
// Запуск: MONGO_URI=mongodb://127.0.0.1:27047 node --test aggregation/pipelines.test.js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MongoClient } = require('mongodb');
const P = require('./pipelines');

const URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27047';
let client;
let db;

test.before(async () => {
  client = await MongoClient.connect(URI);
  db = client.db(`aggkb_test_${process.pid}`); // окрема база на прогін, щоб тести не заважали один одному
});
test.after(async () => { await db.dropDatabase(); await client.close(); });

async function fixture(name, docs) {
  const c = db.collection(name);
  await c.drop().catch(() => {});
  if (docs.length) await c.insertMany(docs);
  return c;
}

test('вирази зберігають замовлення без дорогих позицій, unwind+group їх губить', async () => {
  const c = await fixture('orders', [
    { _id: 1, items: [{ price: 100, qty: 2 }, { price: 5, qty: 1 }] },
    { _id: 2, items: [{ price: 5, qty: 1 }] },
    { _id: 3, items: [] },
  ]);
  const expr = await c.aggregate([...P.expensiveItemsExpr(50), { $sort: { _id: 1 } }]).toArray();
  assert.deepEqual(expr.map((d) => [d._id, d.total, d.items.length]), [[1, 200, 1], [2, 0, 0], [3, 0, 0]]);

  const unw = await c.aggregate([...P.expensiveItemsUnwind(50), { $sort: { _id: 1 } }]).toArray();
  assert.deepEqual(unw.map((d) => [d._id, d.total]), [[1, 200]]);
});

test('повний перерахунок через $merge replace ідемпотентний', async () => {
  const ev = await fixture('events', [
    { seq: 1, day: 'd1', amount: 10 }, { seq: 2, day: 'd1', amount: 5 }, { seq: 3, day: 'd2', amount: 7 },
  ]);
  await fixture('daily_summary', []);
  await ev.aggregate(P.dailySummaryReplace('d1')).toArray();
  const first = await db.collection('daily_summary').find().sort({ _id: 1 }).toArray();
  await ev.aggregate(P.dailySummaryReplace('d1')).toArray();
  const second = await db.collection('daily_summary').find().sort({ _id: 1 }).toArray();
  assert.deepEqual(second, first);
  assert.deepEqual(first, [{ _id: 'd1', total: 15, n: 2 }, { _id: 'd2', total: 7, n: 1 }]);
});

test('дельта через whenMatched-pipeline при повторі подвоює підсумок', async () => {
  const ev = await fixture('events', [{ seq: 1, day: 'd1', amount: 10 }]);
  await fixture('daily_summary_delta', []);
  await ev.aggregate(P.dailySummaryDelta(0)).toArray();
  await ev.aggregate(P.dailySummaryDelta(0)).toArray();
  const [doc] = await db.collection('daily_summary_delta').find().toArray();
  assert.equal(doc.total, 20); // фіксує відомий дефект підходу: не ідемпотентний
});

test('replace не видаляє підсумок дня, з якого видалили всі події', async () => {
  const ev = await fixture('events', [{ seq: 1, day: 'd1', amount: 10 }, { seq: 2, day: 'd2', amount: 3 }]);
  await fixture('daily_summary', []);
  await ev.aggregate(P.dailySummaryReplace('d1')).toArray();
  await ev.deleteMany({ day: 'd2' });
  await ev.aggregate(P.dailySummaryReplace('d1')).toArray();
  const ids = (await db.collection('daily_summary').find().toArray()).map((d) => d._id).sort();
  assert.deepEqual(ids, ['d1', 'd2']); // d2 «завис»: його треба прибирати окремо
});

test('вікна: наростаючий підсумок, $shift і ранг з однаковими значеннями', async () => {
  const c = await fixture('sales', [
    { shop: 'A', day: 1, amount: 10 }, { shop: 'A', day: 2, amount: 30 },
    { shop: 'A', day: 3, amount: 20 }, { shop: 'A', day: 4, amount: 30 },
  ]);
  const r = await c.aggregate(P.dailyWindow()).toArray();
  assert.deepEqual(r.map((d) => d.running), [10, 40, 60, 90]);
  assert.deepEqual(r.map((d) => d.prev), [null, 10, 30, 20]);
  assert.deepEqual(r.map((d) => d.rank), [4, 1, 3, 1]); // $rank: рівні значення ділять місце, далі пропуск
});
