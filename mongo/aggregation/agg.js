// Експеримент до нотатки «Просунута агрегація MongoDB».
// Запуск: див. README.md поряд. URI береться з MONGO_URI (типово 127.0.0.1:27047).
'use strict';
const { MongoClient } = require('mongodb');
const P = require('./pipelines');

const URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27047';
const N_ORDERS = Number(process.env.N_ORDERS || 200000);
const N_ITEMS = 10;

// ---------- допоміжне ----------
function rnd(seed) { // детермінований генератор, щоб прогони були порівнянні
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}
async function timed(fn, runs = 3) {
  const ts = [];
  let out;
  for (let i = 0; i < runs; i++) {
    const t0 = process.hrtime.bigint();
    out = await fn();
    ts.push(Number(process.hrtime.bigint() - t0) / 1e6);
  }
  ts.sort((a, b) => a - b);
  return { ms: Math.round(ts[Math.floor(runs / 2)]), out };
}
// Збирає з explain усі вузли, що мають назву стадії, і корисні лічильники.
function walk(node, acc = []) {
  if (Array.isArray(node)) { node.forEach((n) => walk(n, acc)); return acc; }
  if (node && typeof node === 'object') {
    const name = node.stage || Object.keys(node).find((k) => k.startsWith('$'));
    if (name) {
      const pick = {};
      for (const k of ['strategy', 'usedDisk', 'spills', 'spilledDataStorageSize', 'peakTrackedMemBytes',
        'totalDocsExamined', 'totalKeysExamined', 'nReturned', 'indexName', 'limit']) {
        if (node[k] !== undefined) pick[k] = node[k];
        else if (node[name] && typeof node[name] === 'object' && node[name][k] !== undefined) pick[k] = node[name][k];
      }
      acc.push({ stage: name, ...pick });
    }
    for (const v of Object.values(node)) walk(v, acc);
  }
  return acc;
}
const stageNames = (ex) => (ex.stages ? ex.stages.map((s) => Object.keys(s)[0]) : ['(single $cursor / SBE plan)']);
const short = (o) => JSON.stringify(o);

async function seed(db) {
  await db.dropDatabase();
  const r = rnd(42);
  const orders = db.collection('orders');
  const payments = db.collection('payments');
  for (let base = 0; base < N_ORDERS; base += 10000) {
    const batch = [];
    const pay = [];
    for (let i = base; i < base + 10000; i++) {
      const items = [];
      for (let k = 0; k < N_ITEMS; k++) items.push({ sku: `s${Math.floor(r() * 5000)}`, price: Math.floor(r() * 100), qty: 1 + Math.floor(r() * 3) });
      batch.push({ _id: i, cust: i % 20000, status: r() < 0.3 ? 'paid' : 'new', amount: Math.floor(r() * 1000), cents: Math.floor(r() * 100000), items });
      if (i < 100000) pay.push({ _id: i, orderId: i, sum: Math.floor(r() * 1000) });
    }
    await orders.insertMany(batch, { ordered: false });
    if (pay.length) await payments.insertMany(pay, { ordered: false });
  }
  await orders.createIndex({ status: 1, amount: -1 });
  await orders.createIndex({ cents: 1 });
}

// ---------- A. масиви: вирази проти $unwind + $group ----------
async function expA(db) {
  const tail = [{ $group: { _id: null, n: { $sum: 1 }, s: { $sum: '$total' }, k: { $sum: { $size: '$items' } } } }];
  const orders = db.collection('orders');
  // поріг 90: у $group доходить ~10% позицій (вміщується в 100 МБ); поріг 40: ~60% (не вміщується, spill)
  for (const minPrice of [90, 40]) {
    console.log(`\n=== A. $filter/$map проти $unwind+$match+$group (${N_ORDERS} замовлень x ${N_ITEMS} позицій, ціна > ${minPrice}) ===`);
    for (const [label, p] of [['вирази', P.expensiveItemsExpr(minPrice)], ['unwind+group', P.expensiveItemsUnwind(minPrice)]]) {
      const pipeline = [...p, ...tail];
      const { ms, out } = await timed(() => orders.aggregate(pipeline).toArray());
      const ex = await orders.aggregate(pipeline).explain('executionStats');
      const interesting = walk(ex).filter((n) => /GROUP|\$group|UNWIND|\$unwind/i.test(n.stage) && Object.keys(n).length > 1);
      console.log(`${label.padEnd(13)} медіана ${ms} мс; результат ${short(out[0])}`);
      console.log(`   стадії: ${short(stageNames(ex))}`);
      console.log(`   group/unwind у плані: ${short(interesting)}`);
    }
  }
}

// ---------- B. $lookup з індексом і без ----------
async function expB(db) {
  console.log('\n=== B. $lookup: 1000 замовлень -> payments (100k), foreignField = orderId ===');
  const orders = db.collection('orders');
  const payments = db.collection('payments');
  const outer = [{ $match: { _id: { $lt: 1000 } } }];
  const eq = [...outer, { $lookup: { from: 'payments', localField: '_id', foreignField: 'orderId', as: 'p' } }, { $count: 'n' }];
  const corr = [...outer, { $lookup: { from: 'payments', let: { id: '$_id' }, pipeline: [{ $match: { $expr: { $eq: ['$orderId', '$$id'] } } }], as: 'p' } }, { $count: 'n' }];
  await payments.dropIndexes();
  for (const idx of [false, true]) {
    if (idx) await payments.createIndex({ orderId: 1 });
    for (const [label, p] of [['localField/foreignField', eq], ['let + $expr', corr]]) {
      const runs = (!idx && label.startsWith('let')) ? 1 : 3;
      const { ms, out } = await timed(() => orders.aggregate(p).toArray(), runs);
      const ex = await orders.aggregate(p).explain('executionStats');
      const lk = walk(ex).filter((n) => /LOOKUP|\$lookup/i.test(n.stage));
      console.log(`індекс=${idx ? 'так' : 'ні '} ${label.padEnd(24)} ${String(ms).padStart(6)} мс  n=${out[0] && out[0].n}  план: ${short(lk.map((n) => ({ stage: n.stage, strategy: n.strategy, totalDocsExamined: n.totalDocsExamined, totalKeysExamined: n.totalKeysExamined, indexName: n.indexName })))}`);
    }
  }
}

// ---------- C. $merge: повний перерахунок проти дельти ----------
async function expC(db) {
  console.log('\n=== C. $merge: інкрементальне оновлення підсумків ===');
  const ev = db.collection('events');
  await ev.drop().catch(() => {});
  const docs = [];
  let seq = 0;
  for (let d = 1; d <= 5; d++) for (let k = 0; k < 4; k++) docs.push({ seq: ++seq, day: `2026-10-0${d}`, amount: 10 * d });
  await ev.insertMany(docs);
  const sum = async (c) => (await db.collection(c).find().sort({ _id: 1 }).toArray()).map((x) => `${x._id.slice(-2)}:${x.total}/${x.n}`).join(' ');

  await ev.aggregate(P.dailySummaryReplace('2026-10-01')).toArray();
  console.log('replace, перший прогін      ', await sum('daily_summary'));
  await ev.aggregate(P.dailySummaryReplace('2026-10-01')).toArray();
  console.log('replace, повтор             ', await sum('daily_summary'));

  await ev.aggregate(P.dailySummaryDelta(0)).toArray();
  console.log('delta, перший прогін        ', await sum('daily_summary_delta'));
  await ev.aggregate(P.dailySummaryDelta(0)).toArray(); // ретрай із тим самим водяним знаком
  console.log('delta, повтор (ретрай)      ', await sum('daily_summary_delta'));

  await ev.deleteMany({ day: '2026-10-05' });
  await ev.aggregate(P.dailySummaryReplace('2026-10-01')).toArray();
  console.log('replace після видалення дня 05', await sum('daily_summary'));

  try {
    await ev.aggregate([{ $group: { _id: '$day', t: { $sum: '$amount' } } }, { $set: { day: '$_id' } }, { $unset: '_id' },
      { $merge: { into: 'by_day_no_index', on: 'day' } }]).toArray();
    console.log('$merge on: day без унікального індексу: пройшло (!)');
  } catch (e) { console.log(`$merge on: day без унікального індексу: помилка ${e.code} ${e.codeName}`); }
}

// ---------- D. що робить оптимізатор (explain) ----------
async function expD(db) {
  console.log('\n=== D. Оптимізатор у explain ===');
  const orders = db.collection('orders');
  const show = async (label, p) => {
    const ex = await orders.aggregate(p).explain('queryPlanner');
    // для SBE-плану беремо лише дерево queryPlan (без slotBasedPlan), обхід зверху вниз
    const wp = (ex.stages ? ex.stages[0].$cursor.queryPlanner : ex.queryPlanner).winningPlan;
    const root = { qp: wp.queryPlan || wp };
    const plan = walk(root).filter((n) => /SCAN|SORT|LIMIT|GROUP|LOOKUP|MATCH|PROJECTION/.test(n.stage));
    const rest = ex.stages ? ex.stages.slice(1).map((s) => {
      const k = Object.keys(s)[0];
      const v = s[k];
      if (k === '$lookup') return `$lookup(unwinding=${short(v.unwinding)}, pipeline=${short(v.pipeline)})`;
      if (k === '$sort') return `$sort(limit=${v.limit})`;
      return k;
    }) : [];
    console.log(`${label}\n   $cursor/план: ${short(plan.map((n) => n.stage + (n.indexName ? `(${n.indexName})` : '') + (n.limit ? `[limit ${n.limit}]` : '')))}\n   далі: ${short(rest)}`);
  };
  await show('D1 $sort -> $match -> $limit', [{ $sort: { amount: -1 } }, { $match: { status: 'paid' } }, { $limit: 5 }]);
  await show('D2 $match по обчисленому полю (dollars = cents/100)', [{ $set: { dollars: { $divide: ['$cents', 100] } } }, { $match: { dollars: { $gt: 990 } } }]);
  await show('D2b той самий фільтр, переписаний на сире поле', [{ $match: { cents: { $gt: 99000 } } }, { $set: { dollars: { $divide: ['$cents', 100] } } }]);
  await show('D3 $lookup -> $unwind -> $match', [{ $match: { _id: { $lt: 10 } } }, { $lookup: { from: 'payments', localField: '_id', foreignField: 'orderId', as: 'p' } }, { $unwind: '$p' }, { $match: { 'p.sum': { $gt: 500 } } }]);
  await show('D4 $group -> $sort -> $limit', [{ $group: { _id: '$cust', t: { $sum: '$amount' } } }, { $sort: { t: -1 } }, { $limit: 3 }]);
  await show('D5 $lookup, потім $set+$match по полю вхідного документа (правило 9.0)', [{ $lookup: { from: 'payments', localField: '_id', foreignField: 'orderId', as: 'p' } }, { $set: { big: { $gt: ['$amount', 990] } } }, { $match: { big: true } }]);
}

// ---------- E. вікна, граф, щільність ----------
async function expE(db) {
  console.log('\n=== E. $setWindowFields, $graphLookup, $densify/$fill ===');
  const sales = db.collection('sales');
  await sales.drop().catch(() => {});
  await sales.insertMany([
    { shop: 'A', day: 1, amount: 10 }, { shop: 'A', day: 2, amount: 30 }, { shop: 'A', day: 3, amount: 20 }, { shop: 'A', day: 4, amount: 30 },
    { shop: 'B', day: 1, amount: 5 }, { shop: 'B', day: 2, amount: 7 },
  ]);
  const w = await sales.aggregate(P.dailyWindow()).toArray();
  console.log('вікна:', w.map((d) => `${d.shop}${d.day}: run=${d.running} prev=${d.prev} avg3=${Math.round(d.movAvg3 * 10) / 10} rank=${d.rank}`).join(' | '));

  const g = db.collection('graph');
  await g.drop().catch(() => {});
  await g.insertMany([{ _id: 'a', next: 'b' }, { _id: 'b', next: 'c' }, { _id: 'c', next: 'a' }]);
  const cyc = await g.aggregate([{ $match: { _id: 'a' } }, { $graphLookup: { from: 'graph', startWith: '$next', connectFromField: 'next', connectToField: '_id', as: 'path', depthField: 'd' } }]).toArray();
  console.log(`цикл a->b->c->a: path=${short(cyc[0].path.map((x) => `${x._id}@${x.d}`))}`);

  const chain = db.collection('chain');
  await chain.drop().catch(() => {});
  const L = 3000;
  const nodes = [];
  for (let i = 0; i < 20000; i++) nodes.push({ id: i, parent: i < L ? i + 1 : null });
  await chain.insertMany(nodes);
  const q = [{ $match: { id: 0 } }, { $graphLookup: { from: 'chain', startWith: '$parent', connectFromField: 'parent', connectToField: 'id', as: 'anc' } }, { $project: { n: { $size: '$anc' } } }];
  const a = await timed(() => chain.aggregate(q).toArray(), 1);
  await chain.createIndex({ id: 1 });
  const b = await timed(() => chain.aggregate(q).toArray(), 3);
  const lim = await chain.aggregate([{ $match: { id: 0 } }, { $graphLookup: { from: 'chain', startWith: '$parent', connectFromField: 'parent', connectToField: 'id', as: 'anc', maxDepth: 9 } }, { $project: { n: { $size: '$anc' } } }]).toArray();
  console.log(`$graphLookup ланцюг ${L} предків у колекції 20k: без індексу на connectToField ${a.ms} мс (n=${a.out[0].n}), з індексом ${b.ms} мс (n=${b.out[0].n}); maxDepth: 9 -> n=${lim[0].n}`);

  const m = db.collection('metrics');
  await m.drop().catch(() => {});
  const D = (h) => new Date(Date.UTC(2026, 9, 30, h));
  await m.insertMany([{ t: D(0), v: 10 }, { t: D(3), v: 40 }, { t: D(4), v: null }, { t: D(5), v: 60 }]);
  const dens = await m.aggregate([
    { $densify: { field: 't', range: { step: 1, unit: 'hour', bounds: 'full' } } },
    { $fill: { sortBy: { t: 1 }, output: { v: { method: 'linear' } } } },
    { $sort: { t: 1 } },
  ]).toArray();
  console.log('densify+fill(linear):', dens.map((d) => `${d.t.getUTCHours()}h=${d.v}`).join(' '));
}

(async () => {
  const client = await MongoClient.connect(URI);
  const db = client.db('aggkb');
  const info = await db.admin().command({ buildInfo: 1 });
  console.log(`MongoDB ${info.version}, Node ${process.version}, N_ORDERS=${N_ORDERS}`);
  const t0 = Date.now();
  await seed(db);
  console.log(`seed: ${Date.now() - t0} мс`);
  const only = process.argv[2];
  for (const [k, f] of Object.entries({ A: expA, B: expB, C: expC, D: expD, E: expE })) {
    if (!only || only.includes(k)) await f(db);
  }
  await client.close();
})().catch((e) => { console.error(e); process.exit(1); });
