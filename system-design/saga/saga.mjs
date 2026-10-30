// Оркестрована сага поверх MongoDB: замовлення → резерв складу → списання → доставка.
// Кожен «сервіс» пише лише у свою базу (saga_inventory, saga_payments, saga_shipping),
// оркестратор тримає журнал саги в saga_orders.sagas. Сценарії: компенсація після відмови,
// аномалії через брак ізоляції, ідемпотентний повтор компенсації, таймаут без відповіді,
// застрягла сага. Кожен сценарій закінчується перевірками; код виходу 1, якщо хоч одна впала.
import { MongoClient } from 'mongodb';
import { setTimeout as sleep } from 'node:timers/promises';

const url = process.env.MONGO_URL ?? 'mongodb://localhost:27043/?replicaSet=rs0';
const client = new MongoClient(url);
await client.connect();
const inventory = client.db('saga_inventory');
const payments = client.db('saga_payments');
const shipping = client.db('saga_shipping');
const orders = client.db('saga_orders');

class BusinessError extends Error { constructor(code) { super(code); this.code = code; } }
class TimeoutError extends Error {}
class CrashError extends Error {}
const isDup = (e) => e?.code === 11000;
const log = (...a) => console.log('   ', ...a);
let failures = 0;
function check(name, cond) {
  console.log(`  ${cond ? 'OK  ' : 'FAIL'} ${name}`);
  if (!cond) failures++;
}

async function tx(fn) {
  const s = client.startSession();
  try { await s.withTransaction(() => fn(s)); } finally { await s.endSession(); }
}

// ---------- Inventory service ----------
const inv = {
  async reserve(sagaId, sku, qty) {
    try {
      await tx(async (session) => {
        const before = await inventory.collection('stock').findOneAndUpdate(
          { _id: sku, available: { $gte: qty } }, { $inc: { available: -qty } },
          { session, returnDocument: 'before' });
        if (!before) throw new BusinessError('OUT_OF_STOCK');
        // _id = sagaId робить крок ідемпотентним: повтор дасть duplicate key
        await inventory.collection('reservations').insertOne(
          { _id: sagaId, sku, qty, status: 'RESERVED', stockBefore: before.available }, { session });
      });
    } catch (e) {
      if (!isDup(e)) throw e;
      const prev = await inventory.collection('reservations').findOne({ _id: sagaId });
      if (prev.status !== 'RESERVED') throw new BusinessError('RESERVATION_CANCELLED');
    }
  },
  // правильна компенсація: комутативний $inc, ідемпотентна через перехід статусу
  async release(sagaId) {
    await tx(async (session) => {
      const res = inventory.collection('reservations');
      const r = await res.findOneAndUpdate({ _id: sagaId, status: 'RESERVED' },
        { $set: { status: 'RELEASED' } }, { session });
      if (r) await inventory.collection('stock').updateOne({ _id: r.sku }, { $inc: { available: r.qty } }, { session });
      else await res.updateOne({ _id: sagaId }, { $setOnInsert: { status: 'RELEASED', tombstone: true } },
        { upsert: true, session });
    });
  },
  // хибна компенсація: «повернути, як було» записом знімка
  async releaseBySnapshot(sagaId) {
    const r = await inventory.collection('reservations').findOneAndUpdate(
      { _id: sagaId, status: 'RESERVED' }, { $set: { status: 'RELEASED' } });
    if (r) await inventory.collection('stock').updateOne({ _id: r.sku }, { $set: { available: r.stockBefore } });
  },
};

// ---------- Payment service ----------
const pay = {
  async charge(sagaId, account, amount, { delayMs = 0 } = {}) {
    if (delayMs) await sleep(delayMs);          // повільний PSP: запит уже в дорозі
    const key = `${sagaId}:charge`;
    try {
      await tx(async (session) => {
        await payments.collection('ledger').insertOne(
          { _id: key, sagaId, account, amount: -amount, status: 'CHARGED' }, { session });
        const r = await payments.collection('accounts').updateOne(
          { _id: account, balance: { $gte: amount } }, { $inc: { balance: -amount } }, { session });
        if (r.modifiedCount !== 1) throw new BusinessError('INSUFFICIENT_FUNDS');
      });
      return 'charged';
    } catch (e) {
      if (!isDup(e)) throw e;
      const prev = await payments.collection('ledger').findOne({ _id: key });
      if (prev.status === 'VOID') throw new BusinessError('CHARGE_VOIDED');
      return 'duplicate (вже списано, повтор без ефекту)';
    }
  },
  // правильна компенсація: нова операція повернення, ідемпотентна за ключем саги;
  // якщо списання ще не було, лишає надгробок VOID, і пізнє списання буде відхилено
  async refund(sagaId, { crashAfterEffect = false, failTimes = 0, attempt = 1 } = {}) {
    if (attempt <= failTimes) throw new Error('PSP 503 на refund');
    await tx(async (session) => {
      const ledger = payments.collection('ledger');
      const charge = await ledger.findOne({ _id: `${sagaId}:charge` }, { session });
      if (!charge) {
        await ledger.insertOne({ _id: `${sagaId}:charge`, sagaId, amount: 0, status: 'VOID' }, { session });
        return;
      }
      if (charge.status !== 'CHARGED') return;  // уже повернуто або анульовано
      await ledger.updateOne({ _id: charge._id }, { $set: { status: 'REFUNDED' } }, { session });
      await ledger.insertOne({ _id: `${sagaId}:refund`, sagaId, account: charge.account,
        amount: -charge.amount, status: 'REFUND' }, { session });
      await payments.collection('accounts').updateOne({ _id: charge.account },
        { $inc: { balance: -charge.amount } }, { session });
    });
    if (crashAfterEffect) throw new CrashError('процес упав після refund, до запису в журнал саги');
  },
  // хибна компенсація: без ключа ідемпотентності
  async refundNaive(sagaId, { crashAfterEffect = false } = {}) {
    const charge = await payments.collection('ledger').findOne({ _id: `${sagaId}:charge` });
    await payments.collection('accounts').updateOne({ _id: charge.account }, { $inc: { balance: -charge.amount } });
    await payments.collection('ledger').insertOne({ sagaId, account: charge.account, amount: -charge.amount, status: 'REFUND' });
    if (crashAfterEffect) throw new CrashError('процес упав після refund, до запису в журнал саги');
  },
};

// ---------- Shipping service ----------
const ship = {
  async ship(sagaId, address) {
    if (address.zone === 'unserviceable') throw new BusinessError('UNDELIVERABLE');
    try { await shipping.collection('shipments').insertOne({ _id: sagaId, address }); }
    catch (e) { if (!isDup(e)) throw e; }
  },
};

// ---------- Orchestrator ----------
const STEPS = [
  { name: 'reserve', run: (o, id) => inv.reserve(id, o.sku, o.qty),
    comp: (id, opt) => (opt.snapshotRelease ? inv.releaseBySnapshot : inv.release)(id) },
  { name: 'charge', run: (o, id, a) => pay.charge(id, o.account, o.amount, a),
    comp: (id, opt, attempt) => (opt.naiveRefund ? pay.refundNaive : pay.refund)(id, { ...opt.refund, attempt }) },
  { name: 'ship', run: (o, id) => ship.ship(id, o.address) },   // retriable, без компенсації
];

function withTimeout(p, ms) {
  return Promise.race([p, sleep(ms).then(() => { throw new TimeoutError(`немає відповіді за ${ms} мс`); })]);
}

async function startSaga(id, order) {
  await orders.collection('orders').insertOne({ _id: id, ...order, status: 'PENDING' });  // семантичне блокування
  await orders.collection('sagas').insertOne({ _id: id, order, state: 'RUNNING', done: [], compensated: [] });
}

async function attempt(step, saga, id, opt) {
  const tries = opt.onTimeout === 'retry' ? 3 : 1;
  for (let i = 1; i <= tries; i++) {
    const p = step.run(saga.order, id, opt.attempts?.[step.name]?.[i - 1] ?? {});
    let timedOut = false;                                // логувати лише відповіді, що прийшли після таймауту
    p.then((r) => timedOut && log(`[пізня відповідь] ${step.name}, спроба ${i}: ${r}`),
           (e) => timedOut && log(`[пізня відповідь] ${step.name}, спроба ${i}: ${e.code ?? e.message}`));
    try {
      await withTimeout(p, opt.timeoutMs ?? 5000);
      return { ok: true };
    } catch (e) {
      if (e instanceof BusinessError) return { ok: false, reason: e.code };
      if (!(e instanceof TimeoutError)) throw e;
      timedOut = true;
      log(`${step.name}: спроба ${i} — ${e.message}`);
      if (i < tries) { await sleep(20); continue; }
      return { ok: false, unknown: true, reason: 'TIMEOUT' };
    }
  }
}

async function runSaga(id, opt = {}) {
  const sagas = orders.collection('sagas');
  let saga = await sagas.findOne({ _id: id });
  if (saga.state === 'RUNNING') {
    for (const step of STEPS) {
      if (saga.done.includes(step.name)) continue;
      const out = await attempt(step, saga, id, opt);
      if (out.ok) {
        await sagas.updateOne({ _id: id }, { $push: { done: step.name } });
        saga.done.push(step.name);
        await opt.afterStep?.(step.name);
        continue;
      }
      const toCompensate = [...saga.done];
      // невідомо, чи крок відбувся: політика 'abort' компенсує і його
      if (out.unknown && opt.onTimeout === 'abort') toCompensate.push(step.name);
      log(`${step.name} відмовив (${out.reason}); компенсуємо: [${toCompensate.join(', ')}]`);
      await sagas.updateOne({ _id: id }, { $set: { state: 'COMPENSATING', reason: out.reason, toCompensate } });
      saga = await sagas.findOne({ _id: id });
      break;
    }
    if (saga.state === 'RUNNING') {
      await sagas.updateOne({ _id: id }, { $set: { state: 'COMPLETED' } });
      await orders.collection('orders').updateOne({ _id: id }, { $set: { status: 'APPROVED' } });
      return 'COMPLETED';
    }
  }
  if (saga.state === 'COMPENSATING') return compensate(id, opt);
  return saga.state;
}

async function compensate(id, opt) {
  const sagas = orders.collection('sagas');
  const saga = await sagas.findOne({ _id: id });
  for (const name of [...saga.toCompensate].reverse()) {
    if (saga.compensated.includes(name)) continue;
    const step = STEPS.find((s) => s.name === name);
    if (!step.comp) continue;
    let err = null;
    for (let i = 1; i <= 3; i++) {                       // компенсацію повторюють, а не кидають
      try { await step.comp(id, opt, i); err = null; break; }
      catch (e) { if (e instanceof CrashError) throw e; err = e; log(`компенсація ${name}, спроба ${i}: ${e.message}`); }
    }
    if (err) {
      await sagas.updateOne({ _id: id }, { $set: { state: 'NEEDS_ATTENTION', error: err.message } });
      return 'NEEDS_ATTENTION';
    }
    await sagas.updateOne({ _id: id }, { $push: { compensated: name } });
  }
  await sagas.updateOne({ _id: id }, { $set: { state: 'CANCELLED' } });
  await orders.collection('orders').updateOne({ _id: id }, { $set: { status: 'CANCELLED' } });
  return 'CANCELLED';
}

// ---------- helpers ----------
async function reset(stock = 5, balance = 1000) {
  for (const db of [inventory, payments, shipping, orders]) await db.dropDatabase();
  for (const [db, c] of [[inventory, 'stock'], [inventory, 'reservations'], [payments, 'accounts'],
    [payments, 'ledger'], [shipping, 'shipments'], [orders, 'orders'], [orders, 'sagas']]) await db.createCollection(c);
  await inventory.collection('stock').insertOne({ _id: 'sku-1', available: stock });
  await payments.collection('accounts').insertOne({ _id: 'acc-1', balance });
}
const available = async () => (await inventory.collection('stock').findOne({ _id: 'sku-1' })).available;
const balance = async () => (await payments.collection('accounts').findOne({ _id: 'acc-1' })).balance;
const ledger = async (sagaId) => (await payments.collection('ledger').find({ sagaId }).toArray())
  .map((l) => `${l.status}:${-l.amount}`).join(', ');
const reserved = async () => (await inventory.collection('reservations')
  .find({ status: 'RESERVED' }).toArray()).reduce((s, r) => s + r.qty, 0);
const order = (zone) => ({ sku: 'sku-1', qty: 1, account: 'acc-1', amount: 100, address: { zone } });

// ---------- scenarios ----------
console.log(`MongoDB ${(await client.db('admin').command({ buildInfo: 1 })).version}, Node ${process.version}`);

console.log('\n1. Відмова на кроці 3 (ship) → компенсації у зворотному порядку');
await reset();
await startSaga('s1', order('unserviceable'));
const r1 = await runSaga('s1');
log(`сага: ${r1}; склад: ${await available()}; баланс: ${await balance()}; журнал оплат: ${await ledger('s1')}`);
check('сагу скасовано, склад і баланс повернуто', r1 === 'CANCELLED' && (await available()) === 5 && (await balance()) === 1000);
check('компенсація це нова операція: в журналі і списання, і повернення', (await ledger('s1')) === 'REFUNDED:100, REFUND:-100');

console.log('\n2a. Брак ізоляції: читач посеред саги бачить ефект, якого «не було»');
await reset();
await startSaga('s2', order('unserviceable'));
let seen;
await runSaga('s2', {
  afterStep: async (name) => {
    if (name !== 'charge') return;
    const naiveRevenue = (await payments.collection('ledger').find({ status: 'CHARGED' }).toArray())
      .reduce((s, l) => s + -l.amount, 0);
    const approved = await orders.collection('orders').countDocuments({ status: 'APPROVED' });
    const pending = await orders.collection('orders').countDocuments({ status: 'PENDING' });
    seen = { naiveRevenue, approved, pending, stock: await available() };
    log(`звіт посеред саги: виручка за журналом ${naiveRevenue}, склад ${seen.stock}; ` +
        `за статусом замовлення: APPROVED=${approved}, PENDING=${pending}`);
  },
});
log(`після саги: ${(await orders.collection('orders').findOne({ _id: 's2' })).status}, виручка за журналом ` +
    `${(await payments.collection('ledger').find({ status: 'CHARGED' }).toArray()).length * 100}`);
check('наївний звіт побачив виручку 100 за замовленням, яке скасовано (dirty read)', seen.naiveRevenue === 100);
check('звіт, що поважає семантичне блокування (PENDING), не рахує її', seen.approved === 0 && seen.pending === 1);

console.log('\n2b. Lost update: компенсація записом знімка проти комутативного $inc');
for (const snapshotRelease of [true, false]) {
  await reset();
  await startSaga('A', order('unserviceable'));
  await startSaga('B', order('ok'));
  await runSaga('A', {
    snapshotRelease,
    afterStep: async (name) => { if (name === 'reserve') log(`B між кроками A: ${await runSaga('B')}`); },
  });
  const a = await available(), held = await reserved();
  log(`${snapshotRelease ? '$set знімка' : '$inc +qty  '}: available=${a}, зарезервовано=${held}, разом ${a + held} з 5`);
  check(snapshotRelease ? 'знімок затер списання B: одиниць стало 6 з 5 (oversell)'
                        : '$inc зберіг списання B: 4 + 1 = 5', snapshotRelease ? a + held === 6 : a + held === 5);
}

console.log('\n3. Повтор компенсації після падіння оркестратора');
for (const naiveRefund of [false, true]) {
  await reset();
  await startSaga('s3', order('unserviceable'));
  try { await runSaga('s3', { naiveRefund, refund: { crashAfterEffect: true } }); }
  catch (e) { if (!(e instanceof CrashError)) throw e; log(`падіння: ${e.message}; баланс ${await balance()}`); }
  const st = await orders.collection('sagas').findOne({ _id: 's3' });
  log(`журнал саги після падіння: state=${st.state}, compensated=[${st.compensated}]`);
  const r = await runSaga('s3', { naiveRefund });       // відновлення: той самий журнал, повтор
  log(`${naiveRefund ? 'без ключа    ' : 'ідемпотентний'}: після відновлення ${r}, баланс ${await balance()}, журнал: ${await ledger('s3')}`);
  check(naiveRefund ? 'без ідемпотентності повернуто двічі: 1100' : 'ідемпотентний refund: рівно 1000, сага CANCELLED',
    naiveRefund ? (await balance()) === 1100 : (await balance()) === 1000 && r === 'CANCELLED');
}

console.log('\n4. Таймаут не каже, чи крок відбувся (PSP відповідає за 300 мс, таймаут 100 мс)');
for (const policy of ['naive', 'retry', 'abort']) {
  await reset();
  await startSaga('s4', order('ok'));
  const attempts = { charge: policy === 'retry' ? [{ delayMs: 300 }, { delayMs: 0 }] : [{ delayMs: 300 }] };
  const r = await runSaga('s4', { timeoutMs: 100, attempts, onTimeout: policy === 'naive' ? undefined : policy });
  await sleep(500);                                     // дочекатися «пізньої» відповіді PSP
  const st = (await orders.collection('orders').findOne({ _id: 's4' })).status;
  log(`${policy.padEnd(5)}: сага ${r}, замовлення ${st}, склад ${await available()}, баланс ${await balance()}, журнал: ${await ledger('s4')}`);
  if (policy === 'naive') check('таймаут як відмова: замовлення скасовано, а гроші списано', st === 'CANCELLED' && (await balance()) === 900);
  if (policy === 'retry') check('повтор з тим самим ключем: рівно одне списання, замовлення APPROVED', st === 'APPROVED' && (await balance()) === 900);
  if (policy === 'abort') check('скасування з надгробком VOID: пізнє списання відхилено', st === 'CANCELLED' && (await balance()) === 1000);
}

console.log('\n5. Компенсація відмовляє постійно → сага застрягла, потрібна людина');
await reset();
await startSaga('s5', order('unserviceable'));
const r5 = await runSaga('s5', { refund: { failTimes: 99 } });
const stuck = await orders.collection('sagas').find({ state: { $in: ['COMPENSATING', 'NEEDS_ATTENTION'] } }).toArray();
log(`сага: ${r5}; застряглі: ${stuck.map((s) => `${s._id}:${s.state} (${s.error})`)}; склад ${await available()}, баланс ${await balance()}`);
check('після 3 невдалих спроб сага в NEEDS_ATTENTION, резерв складу ще не знято', r5 === 'NEEDS_ATTENTION' && (await available()) === 4);

await client.close();
console.log(failures ? `\n${failures} перевірок впало` : '\nусі перевірки пройшли');
process.exit(failures ? 1 : 0);
