// CDC on MongoDB 9 via change streams (single-node replica set).
// Run: MONGO_URL='mongodb://localhost:27041/?replicaSet=rs0' node mongo_cdc.js
const { MongoClient } = require('mongodb');

const url = process.env.MONGO_URL || 'mongodb://localhost:27041/?replicaSet=rs0';
const show = (e) => {
  const o = { op: e.operationType, key: e.documentKey };
  if (e.updateDescription) o.updated = e.updateDescription.updatedFields;
  if ('fullDocument' in e) o.fullDocument = e.fullDocument;
  if ('fullDocumentBeforeChange' in e) o.before = e.fullDocumentBeforeChange;
  if (e.txnNumber !== undefined) o.txnNumber = Number(e.txnNumber);
  return JSON.stringify(o);
};
// read exactly n events (tryNext + small sleep, so the script never blocks forever)
async function take(cs, n, ms = 5000) {
  const out = []; const end = Date.now() + ms;
  while (out.length < n && Date.now() < end) {
    const e = await cs.tryNext();
    if (e) out.push(e); else await new Promise((r) => setTimeout(r, 50));
  }
  return out;
}

(async () => {
  const client = await MongoClient.connect(url);
  const admin = client.db('admin');
  console.log('server', (await admin.command({ buildInfo: 1 })).version,
    'driver', require('mongodb/package.json').version, 'node', process.version);
  const db = client.db('cdc');
  await db.dropDatabase();
  const items = db.collection('items');
  await db.createCollection('items');

  console.log('\n== 1. insert / update / delete (default: no fullDocument for update)');
  let cs = items.watch();
  await cs.tryNext();                       // open the cursor before writing
  await items.insertOne({ _id: 1, name: 'apple', qty: 10 });
  await items.updateOne({ _id: 1 }, { $set: { qty: 11 } });
  await items.deleteOne({ _id: 1 });
  for (const e of await take(cs, 3)) console.log(show(e));
  await cs.close();

  console.log('\n== 2. updateLookup returns the CURRENT document, not the state at update time');
  await items.insertOne({ _id: 2, name: 'pear', qty: 1 });
  cs = items.watch([], { fullDocument: 'updateLookup' });
  await cs.tryNext();
  await items.updateOne({ _id: 2 }, { $set: { qty: 2 } });
  await items.updateOne({ _id: 2 }, { $set: { qty: 3 } });
  await items.updateOne({ _id: 2 }, { $set: { qty: 4 } });
  for (const e of await take(cs, 3)) console.log(show(e));   // read only after all writes
  console.log('-- same, but the document is deleted before the consumer reads the updates');
  await items.updateOne({ _id: 2 }, { $set: { qty: 5 } });
  await items.deleteOne({ _id: 2 });
  for (const e of await take(cs, 2)) console.log(show(e));
  await cs.close();

  console.log('\n== 3. pre- and post-images (changeStreamPreAndPostImages) give the state at the time of the change');
  await db.command({ collMod: 'items', changeStreamPreAndPostImages: { enabled: true } });
  await items.insertOne({ _id: 3, name: 'plum', qty: 1 });
  cs = items.watch([], { fullDocument: 'required', fullDocumentBeforeChange: 'required' });
  await cs.tryNext();
  await items.updateOne({ _id: 3 }, { $set: { qty: 2 } });
  await items.updateOne({ _id: 3 }, { $set: { qty: 3 } });
  await items.deleteOne({ _id: 3 });
  for (const e of await take(cs, 3)) console.log(show(e));
  await cs.close();

  console.log('\n== 4. resume after consumer restart (resumeAfter = last processed token)');
  cs = items.watch();
  await cs.tryNext();
  await items.insertMany([{ _id: 10 }, { _id: 11 }]);
  const firstBatch = await take(cs, 2);
  const saved = firstBatch[1]._id;           // token of the last PROCESSED event
  console.log('processed before "crash":', firstBatch.map((e) => e.documentKey._id));
  await cs.close();                          // consumer down
  await items.insertMany([{ _id: 12 }, { _id: 13 }, { _id: 14 }]);  // written while down
  cs = items.watch([], { resumeAfter: saved });
  const resumed = await take(cs, 3);
  console.log('after resume:', resumed.map((e) => e.documentKey._id));
  console.log('nothing else pending:', (await take(cs, 1, 1000)).length === 0);
  await cs.close();

  console.log('\n== 5. multi-document transaction: one event per operation, shared lsid/txnNumber, no rolled-back writes');
  cs = items.watch();
  await cs.tryNext();
  const s = client.startSession();
  s.startTransaction();
  await items.insertOne({ _id: 99, ghost: true }, { session: s });
  await s.abortTransaction();
  await s.withTransaction(async () => {
    await items.insertOne({ _id: 20 }, { session: s });
    await items.updateOne({ _id: 10 }, { $set: { moved: true } }, { session: s });
  });
  await s.endSession();
  for (const e of await take(cs, 2)) console.log(show(e), 'lsid?', !!e.lsid);
  console.log('ghost seen:', (await take(cs, 1, 1000)).length > 0);
  await cs.close();

  console.log('\n== 6. drop collection -> drop + invalidate; stream is closed');
  cs = items.watch();
  await cs.tryNext();
  await items.drop();
  for (const e of await take(cs, 2)) console.log(e.operationType);
  console.log('stream closed:', cs.closed);

  await client.close();
})().catch((e) => { console.error(e); process.exit(1); });
