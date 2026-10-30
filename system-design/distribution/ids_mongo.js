// Index locality in MongoDB: 1M inserts with _id = ObjectId, UUIDv4, UUIDv7 (BSON Binary
// subtype 4), and a monotonically increasing Int64 for reference.
// Measures insert time (median of REPS) and the _id index size after a checkpoint.
// Needs a running mongod (see run.sh). Run: MONGO_URL=... node ids_mongo.js
import { MongoClient, ObjectId, Binary, Long } from 'mongodb';
import { v4, v7, parse } from 'uuid';

const ROWS = Number(process.env.ROWS ?? 1_000_000);
const BATCH = 10_000;
const REPS = Number(process.env.REPS ?? 3);
const client = new MongoClient(process.env.MONGO_URL ?? 'mongodb://127.0.0.1:27061/?directConnection=true');
await client.connect();
const db = client.db('ids');
const uuidBin = (gen) => () => new Binary(Buffer.from(parse(gen())), Binary.SUBTYPE_UUID);
let seq = 0;
const variants = {
  'ObjectId (driver)': () => new ObjectId(),
  'UUIDv4 (Binary 4)': uuidBin(v4),
  'UUIDv7 (Binary 4)': uuidBin(v7),
  'Int64 counter': () => Long.fromNumber(++seq),
};
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const admin = client.db('admin');
const { version } = await admin.command({ buildInfo: 1 });
const ss = await admin.command({ serverStatus: 1 });
const cacheMB = ss.wiredTiger.cache['maximum bytes configured'] / 2 ** 20;
console.log(`# MongoDB ${version}, WiredTiger cache ${cacheMB.toFixed(0)} MB, ${ROWS.toLocaleString('en')} docs, insertMany batches of ${BATCH}, median of ${REPS}\n`);
console.log('| _id | insert s (median) | runs s | _id index MB | data MB (uncompressed) |');
console.log('| --- | --- | --- | --- | --- |');
for (const [name, gen] of Object.entries(variants)) {
  const times = []; let st;
  for (let rep = 0; rep < REPS; rep++) {
    seq = 0;
    await db.collection('t').drop().catch(() => {});
    await db.createCollection('t');
    const t0 = performance.now();
    for (let off = 0; off < ROWS; off += BATCH) {
      const n = Math.min(BATCH, ROWS - off);
      const docs = Array.from({ length: n }, () => ({ _id: gen(), payload: 'x'.repeat(40) }));
      await db.collection('t').insertMany(docs, { ordered: true });
    }
    times.push((performance.now() - t0) / 1000);
    await admin.command({ fsync: 1 }); // checkpoint so on-disk sizes are current
    [st] = await db.collection('t').aggregate([{ $collStats: { storageStats: {} } }]).toArray();
  }
  const mb = (x) => (x / 2 ** 20).toFixed(1);
  console.log(`| ${name} | ${median(times).toFixed(2)} | ${times.map((t) => t.toFixed(2)).join(' / ')} | ${mb(st.storageStats.indexSizes._id_)} | ${mb(st.storageStats.size)} |`);
}
await client.close();
