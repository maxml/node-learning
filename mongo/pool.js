// Пул з'єднань драйвера: прив'язка транзакцій, пули на вузол, черга очікування.
const { MongoClient } = require('mongodb');
const URI = 'mongodb://127.0.0.1:27021,127.0.0.1:27022,127.0.0.1:27023/?replicaSet=rs0';

async function txSpread() {
  // 1. Чи йдуть операції однієї транзакції різними з'єднаннями пулу?
  const c = new MongoClient(URI, { maxPoolSize: 5, monitorCommands: true });
  const byTx = new Map(); // lsid+txnNumber -> Set(connectionId)
  c.on('commandStarted', (e) => {
    const cmd = e.command;
    if (cmd.txnNumber === undefined || !cmd.lsid) return;
    const key = cmd.lsid.id.toString('hex') + ':' + cmd.txnNumber;
    if (!byTx.has(key)) byTx.set(key, new Set());
    byTx.get(key).add(e.connectionId);
  });
  await c.connect();
  const col = c.db('pool').collection('acc');
  await col.deleteMany({});
  await col.insertMany(Array.from({ length: 20 }, (_, i) => ({ _id: i, bal: 100 })));

  let commits = 0, aborts = 0;
  await Promise.all(Array.from({ length: 40 }, async (_, k) => {
    const s = c.startSession();
    try {
      await s.withTransaction(async () => {
        const a = k % 20, b = (k + 7) % 20;
        await col.updateOne({ _id: a }, { $inc: { bal: -1 } }, { session: s });
        await new Promise((r) => setTimeout(r, 5)); // даємо іншим забрати з'єднання
        await col.updateOne({ _id: b }, { $inc: { bal: 1 } }, { session: s });
      });
      commits++;
    } catch (e) { aborts++; } finally { await s.endSession(); }
  }));
  const spread = [...byTx.values()].filter((s) => s.size > 1).length;
  const [{ total }] = await col.aggregate([{ $group: { _id: null, total: { $sum: '$bal' } } }]).toArray();
  console.log(`1) транзакцій (txnNumber, включно з повторами): ${byTx.size}; з них на >1 з'єднанні: ${spread}; commits=${commits}, aborts=${aborts}; сума балансів=${total} (очікується 2000)`);
  await c.close();
}

async function perNode() {
  // 2. Скільки з'єднань драйвер відкриває до кожного вузла (пул + моніторинг)?
  const c = new MongoClient(URI, { maxPoolSize: 10, appName: 'pooltest' });
  const created = {};
  c.on('connectionCreated', (e) => { created[e.address] = (created[e.address] || 0) + 1; });
  await c.connect();
  const col = c.db('pool').collection('acc');
  await Promise.all(Array.from({ length: 30 }, () => col.find({}).toArray()));                                  // primary
  await Promise.all(Array.from({ length: 30 }, () => col.find({}, { readPreference: 'secondary' }).toArray())); // secondaries
  console.log('2) з\'єднань пулу на вузол (maxPoolSize 10):', created);
  const admin = new MongoClient('mongodb://127.0.0.1:27021/?directConnection=true');
  const ops = await admin.db('admin').aggregate([{ $currentOp: { allUsers: true, idleConnections: true } }, { $match: { appName: 'pooltest' } }, { $group: { _id: '$appName', n: { $sum: 1 } } }]).toArray();
  console.log('   на primary з боку сервера ($currentOp, appName pooltest):', JSON.stringify(ops));
  const st = (await admin.db('admin').command({ serverStatus: 1 })).connections;
  console.log('   serverStatus.connections на primary:', JSON.stringify({ current: st.current, available: st.available }));
  await admin.close();
  await c.close();
}

async function holdConnection(col, ms) {
  // Тримає з'єднання ms мілісекунд без серверного JS: getMore по tailable awaitData курсору.
  const cur = col.find({}, { tailable: true, awaitData: true, maxAwaitTimeMS: ms, batchSize: 1000, timeoutMS: ms * 3 });
  await cur.next();
  const t = Date.now();
  await cur.tryNext();
  await cur.close();
  return Date.now() - t;
}

async function waitQueue(opts, label) {
  // 3. Що буде, коли пул вичерпано.
  const c = new MongoClient(URI, { maxPoolSize: 1, ...opts });
  await c.connect();
  const db = c.db('pool');
  try { await db.createCollection('capped', { capped: true, size: 4096 }); } catch {}
  const capped = db.collection('capped');
  if (!(await capped.findOne())) await capped.insertOne({ x: 1 });
  const hold = holdConnection(capped, 2000);
  await new Promise((r) => setTimeout(r, 100));
  const t = Date.now();
  try {
    await db.collection('acc').findOne({ _id: 1 });
    console.log(`3) ${label}: друга операція чекала ${Date.now() - t} мс і виконалась`);
  } catch (e) {
    console.log(`3) ${label}: через ${Date.now() - t} мс ${e.name}: ${e.message}`);
  }
  await hold;
  await c.close();
}

(async () => {
  await txSpread();
  await perNode();
  await waitQueue({}, 'типові налаштування');
  await waitQueue({ waitQueueTimeoutMS: 300 }, 'waitQueueTimeoutMS=300');
  await waitQueue({ timeoutMS: 300 }, 'timeoutMS=300');
})().catch((e) => { console.error(e); process.exit(1); });
