// Resume token that fell out of the oplog window -> ChangeStreamHistoryLost.
// Needs a replica set with a tiny oplog (mongod --oplogSize 1), see README.
// Run: MONGO_URL='mongodb://localhost:27042/?replicaSet=rs1' node mongo_history_lost.js
const { MongoClient } = require('mongodb');
const url = process.env.MONGO_URL || 'mongodb://localhost:27042/?replicaSet=rs1';

(async () => {
  const client = await MongoClient.connect(url);
  const local = client.db('local');
  const stats = await local.command({ collStats: 'oplog.rs' });
  console.log('oplog maxSize MB:', Math.round(stats.maxSize / 1024 / 1024));
  const c = client.db('cdc').collection('hl');
  await c.drop().catch(() => {});

  const cs = c.watch();
  await cs.tryNext();
  await c.insertOne({ _id: 'last-processed' });
  let ev = null;
  while (!ev) ev = await cs.tryNext();
  const token = ev._id;
  await cs.close();                                       // consumer goes down
  console.log('saved token of', ev.documentKey._id);

  // Write while the consumer is down until the oplog is truncated past the saved event.
  // Truncation is asynchronous (observed: the oldest entry moves in jumps, roughly once a minute),
  // so keep writing ~1 MB rounds with a checkpoint (fsync) and poll, bounded by 240 s.
  const pad = 'x'.repeat(10000);                          // ~10 KB per document
  const tsNum = (ts) => ts.t * 2 ** 32 + ts.i;
  const t0 = Date.now();
  let first; let mb = 0;
  while (Date.now() - t0 < 240000) {
    for (let i = 0; i < 5; i++) {
      await c.insertMany(Array.from({ length: 20 }, (_, j) => ({ i, j, pad })));
    }
    mb += 1;
    await client.db('admin').command({ fsync: 1 });
    await new Promise((r) => setTimeout(r, 1000));
    first = await local.collection('oplog.rs').findOne({}, { sort: { $natural: 1 } });
    if (tsNum(first.ts) > tsNum(ev.clusterTime)) break;
  }
  console.log('written while down: ~' + mb + ' MB in', Math.round((Date.now() - t0) / 1000), 's;',
    'event clusterTime t =', ev.clusterTime.t, '| oldest oplog entry t =', first.ts.t,
    '| event still in oplog window?', tsNum(first.ts) <= tsNum(ev.clusterTime));

  try {
    const resumed = c.watch([], { resumeAfter: token });
    await resumed.tryNext();
    console.log('resumed without error');
  } catch (err) {
    console.log('resume failed:', err.codeName, err.code, '|', err.message.slice(0, 160));
  }
  await client.close();
})().catch((e) => { console.error(e); process.exit(1); });
