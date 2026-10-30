// Антипатерн «величезна кількість колекцій»: що коштує кожна колекція й індекс.
// Режими (змінна MODE, задається через --eval): create | stats | touch | write
// Запуск через run_many.sh (див. README.md)
const d = db.getSiblingDB("many");
const N = typeof NCOLL === "number" ? NCOLL : 10000;

function wt() {
  const s = db.serverStatus();
  const dh = s.wiredTiger["data-handle"];
  const ck = s.wiredTiger.checkpoint || {};
  return {
    dhandlesActive: dh["connection data handles currently active"],
    checkpointMostRecentMs: ck["most recent time (msecs)"],
    checkpointMaxMs: ck["max time (msecs)"],
    cacheBytes: s.wiredTiger.cache["bytes currently in the cache"],
    residentMB: s.mem.resident,
  };
}

if (MODE === "create") {
  const t0 = Date.now();
  for (let i = 0; i < N; i++) {
    const c = d.getCollection("views_" + i);   // «колекція переглядів на кожну книгу»
    c.insertOne({ bookId: i, at: new Date(), user: i % 100 });
    c.createIndex({ user: 1 });
  }
  print(JSON.stringify({ phase: "create", collections: N, indexes: 2 * N, ms: Date.now() - t0 }));
}

if (MODE === "stats") {
  const st = d.stats();
  print(JSON.stringify({ phase: "stats", collections: Number(st.collections), indexes: Number(st.indexes), ...wt() }));
}

if (MODE === "touch") {
  // прочитати по документу з кожної колекції: відкриває data handles
  const t0 = Date.now();
  for (let i = 0; i < N; i++) d.getCollection("views_" + i).findOne({ user: 1 });
  print(JSON.stringify({ phase: "touch", ms: Date.now() - t0, ...wt() }));
}

if (MODE === "write") {
  // однаковий потік вставок: в одну колекцію з полем bookId чи розкидано по N колекціях
  const W = 20000;
  const one = db.getSiblingDB("one").views;
  one.drop();
  one.createIndex({ bookId: 1, user: 1 });
  let t0 = Date.now();
  for (let i = 0; i < W; i += 500) {
    const batch = [];
    for (let j = 0; j < 500; j++) batch.push({ bookId: (i + j) % N, at: new Date(), user: j % 100 });
    one.insertMany(batch);
  }
  const tOne = Date.now() - t0;
  t0 = Date.now();
  for (let i = 0; i < W; i++) d.getCollection("views_" + (i % N)).insertOne({ bookId: i % N, at: new Date(), user: i % 100 });
  const tMany = Date.now() - t0;
  t0 = Date.now();
  for (let i = 0; i < W; i++) one.insertOne({ bookId: i % N, at: new Date(), user: i % 100 });
  const tOneSingle = Date.now() - t0;
  print(JSON.stringify({ phase: "write", inserts: W, oneCollectionBatchedMs: tOne,
                         oneCollectionInsertOneMs: tOneSingle, spreadOverNInsertOneMs: tMany }));
}
