// Цикл тюнінгу на одному mongod: знайти → виміряти → змінити → перевиміряти.
// Запуск: mongosh --quiet shop tuning.js (після seed.js). Вивід: таблиці й JSON-рядки.
const admin = db.getSiblingDB("admin");
const log = (...a) => print(...a.map((x) => (typeof x === "string" ? x : JSON.stringify(x))));
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

// Обійти будь-який explain (find, aggregate, SBE, classic) і зібрати стадії та лічильники.
function walk(o, acc = { stages: [], strategies: [], keys: 0, docs: 0, spills: 0, usedDisk: false }) {
  if (Array.isArray(o)) { o.forEach((x) => walk(x, acc)); return acc; }
  if (!o || typeof o !== "object") return acc;
  if (typeof o.stage === "string" && !("rejectedPlans" in o)) acc.stages.push(o.stage + (o.indexName ? `[${o.indexName}]` : ""));
  if (typeof o.strategy === "string") acc.strategies.push(o.strategy);
  if (o.usedDisk === true) acc.usedDisk = true;
  if (o.spills !== undefined && typeof o.spills !== "object" || (o.spills && o.spills.low !== undefined)) acc.spills += Number(o.spills);
  for (const [k, v] of Object.entries(o)) {
    if (k === "rejectedPlans" || k === "allPlansExecution" || k === "slotBasedPlan") continue;
    if (k === "executionStages") { // стадії беремо з queryPlan/winningPlan, звідси лише ознаки скидання на диск
      const sub = walk(v); acc.usedDisk = acc.usedDisk || sub.usedDisk; acc.spills += sub.spills; continue;
    }
    walk(v, acc);
  }
  return acc;
}
function counters(ex) {
  // find: executionStats; aggregate: верхній executionStats або stages[0].$cursor.executionStats
  const es = ex.executionStats || (ex.stages && ex.stages[0].$cursor && ex.stages[0].$cursor.executionStats) || {};
  const w = walk(ex);
  // $lookup у класичному рушії рахує свої ключі/документи окремо від курсора
  let lk = 0, ld = 0;
  (ex.stages || []).forEach((s) => { if (s.$lookup) { lk += Number(s.totalKeysExamined || 0); ld += Number(s.totalDocsExamined || 0); } });
  return {
    engine: JSON.stringify(ex).includes("slotBasedPlan") ? "sbe" : "classic",
    stagesAfterCursor: (ex.stages || []).slice(1).map((s) => Object.keys(s)[0]).join(","),
    plan: [...new Set(w.stages)].join(" > "),
    strategy: w.strategies.join(","),
    nReturned: Number(es.nReturned), keys: Number(es.totalKeysExamined), docs: Number(es.totalDocsExamined),
    lookupKeys: lk, lookupDocs: ld, usedDisk: w.usedDisk, spills: w.spills,
  };
}
function timeIt(fn, runs = 5) { fn(); const t = []; for (let i = 0; i < runs; i++) { const s = Date.now(); fn(); t.push(Date.now() - s); } return median(t); }
function qs(coll) { // $queryStats по колекції: execCount і середні на виконання
  return admin.aggregate([{ $queryStats: {} }, { $match: { "key.queryShape.cmdNs.coll": coll } }]).toArray().map((e) => ({
    cmd: e.key.queryShape.command, hash: e.queryShapeHash.slice(0, 12), execCount: Number(e.metrics.execCount),
    totalMicros: Number(e.metrics.totalExecMicros.sum), keys: Number(e.metrics.queryExec.keysExamined.sum), docs: Number(e.metrics.queryExec.docsExamined.sum),
  }));
}
function delta(before, after) { // різниця знімків $queryStats для однієї форми
  const b = before || { execCount: 0, totalMicros: 0, keys: 0, docs: 0 };
  const n = after.execCount - b.execCount;
  return { execCount: n, avgMs: +((after.totalMicros - b.totalMicros) / n / 1000).toFixed(2), avgKeys: Math.round((after.keys - b.keys) / n), avgDocs: Math.round((after.docs - b.docs) / n) };
}

log("server", db.version(), "| internalQueryFrameworkControl", admin.runCommand({ getParameter: 1, internalQueryFrameworkControl: 1 }).internalQueryFrameworkControl);
log("hostInfo.memLimitMB", db.hostInfo().system.memLimitMB, "| WT cache max MB", db.serverStatus().wiredTiger.cache["maximum bytes configured"] / 1048576);

// ---------- A. find: профайлер + $queryStats → індекс → перевимір ----------
log("\n== A. find({userId, type:'click'}).sort({ts:-1}).limit(10) ==");
admin.runCommand({ setParameter: 1, internalQueryStatsSampleRate: 1.0 }); // типово 0.01 з 9.0; для досліду семплюємо все
function resetProfile(level, opts) { // профайлер: свіжа system.profile на 8 МБ (типово 1 МБ)
  db.setProfilingLevel(0); db.system.profile.drop();
  db.createCollection("system.profile", { capped: true, size: 8 * 1048576 });
  db.setProfilingLevel(level, opts);
}
resetProfile(1, { slowms: 20 });
const USERS = Array.from({ length: 30 }, (_, i) => 1000 + i * 1597);
const appQuery = (u) => db.events.find({ userId: u, type: "click" }).sort({ ts: -1 }).limit(10);

const msBefore = USERS.map((u) => { const s = Date.now(); appQuery(u).toArray(); return Date.now() - s; });
const prof = db.system.profile.find({ ns: "shop.events", op: "query" }).toArray();
log("profiler: slow ops (>20 ms) =", prof.length, "of", USERS.length);
const p0 = prof[0];
log("profiler entry:", { millis: p0.millis, planSummary: p0.planSummary, keysExamined: p0.keysExamined, docsExamined: p0.docsExamined, nreturned: p0.nreturned, hasSortStage: p0.hasSortStage, queryFramework: p0.queryFramework, planningTimeMicros: p0.planningTimeMicros, queryShapeHash: (p0.queryShapeHash || "").slice(0, 12), planCacheShapeHash: p0.planCacheShapeHash });
const qsBefore = qs("events").find((e) => e.cmd === "find");
log("$queryStats (before):", qsBefore, "→", delta(null, qsBefore));
const exA0 = counters(appQuery(USERS[0]).explain("executionStats"));
log("explain before:", exA0, "| client median ms", median(msBefore));

db.events.createIndex({ userId: 1, type: 1, ts: -1 }); // ESR: E=userId,type S=ts
resetProfile(1, { slowms: 20 });
const msAfter = USERS.map((u) => { const s = Date.now(); appQuery(u).toArray(); return Date.now() - s; });
log("profiler after: slow ops (>20 ms) =", db.system.profile.countDocuments({ ns: "shop.events", op: "query" }));
const qsAfter = qs("events").find((e) => e.cmd === "find");
log("$queryStats (after, delta):", delta(qsBefore, qsAfter));
const exA1 = counters(appQuery(USERS[0]).explain("executionStats"));
log("explain after:", exA1, "| client median ms", median(msAfter));

// ---------- B. Агрегація: порядок стадій і $lookup ----------
log("\n== B. refunds by tier: $lookup users ==");
const lookup = { $lookup: { from: "users", localField: "userId", foreignField: "uid", as: "u" } };
// $set + $first замість $unwind: $lookup+$unwind (коалесценція) на 9.0.4 не йде в SBE, див. нижче
const tail = [{ $set: { tier: { $first: "$u.tier" } } }, { $group: { _id: "$tier", total: { $sum: "$amount" }, n: { $sum: 1 } } }];
const variants = {
  "match-last (lookup over 1M)": [lookup, ...tail.slice(0, 1), { $match: { type: "refund" } }, tail[1]],
  "match-first": [{ $match: { type: "refund" } }, lookup, ...tail],
  "match-first, $unwind": [{ $match: { type: "refund" } }, lookup, { $unwind: "$u" }, { $group: { _id: "$u.tier", total: { $sum: "$amount" }, n: { $sum: 1 } } }],
};
function runAgg(name, pipeline, coll = db.events, runs = 3) {
  const ex = counters(coll.explain("executionStats").aggregate(pipeline));
  const ms = timeIt(() => coll.aggregate(pipeline).toArray(), runs);
  log(name.padEnd(44), { ms, ...ex });
}
// optimizer: чи переставив він $match перед $lookup? (план першої стадії починається з IXSCAN[type_1])
const optimized = db.events.explain("queryPlanner").aggregate(variants["match-last (lookup over 1M)"]);
log("match-last, optimized first-stage plan:", walk(optimized.queryPlanner || optimized.stages[0].$cursor.queryPlanner).stages.join(" > "));
log("refunds (input of $lookup):", db.events.countDocuments({ type: "refund" }));
// Стратегія $lookup у SBE: NestedLoopJoin / IndexedLoopJoin / HashJoin (див. explain EQ_LOOKUP.strategy).
// Без індексу на 50k users кожен вхідний документ сканує всю users: вхід обмежено 200 документами.
const in200 = [{ $match: { type: "refund" } }, { $limit: 200 }, lookup, ...tail];
runAgg("SBE, no index, users 50k, 200 input", in200, db.events, 1);
db.users.createIndex({ uid: 1 });
runAgg("SBE, index on uid, users 50k, 200 input", in200);
runAgg("SBE, index on uid, all refunds", variants["match-first"]);
runAgg("same with $unwind instead of $first", variants["match-first, $unwind"]);
admin.runCommand({ setParameter: 1, internalQueryFrameworkControl: "forceClassicEngine" });
runAgg("classic, index on uid, all refunds", variants["match-first"]);
db.users.dropIndex({ uid: 1 });
runAgg("classic, no index, users 50k, 200 input", in200, db.events, 1);
admin.runCommand({ setParameter: 1, internalQueryFrameworkControl: "trySbeRestricted" });
// HashJoin: зовнішня колекція ≤ 10 000 документів і ≤ 100 МБ (internalQueryCollectionMax*ToChooseHashJoin)
db.users10k.drop(); db.users10k.insertMany(db.users.find({ uid: { $lt: 10_000 } }, { _id: 0 }).toArray());
const lk10 = { $lookup: { from: "users10k", localField: "userId", foreignField: "uid", as: "u" } };
const p10 = [{ $match: { type: "refund", userId: { $lt: 10_000 } } }, lk10, ...tail];
log("refunds with userId < 10000:", db.events.countDocuments({ type: "refund", userId: { $lt: 10_000 } }));
runAgg("SBE, no index, users10k", p10);
db.users10k.createIndex({ uid: 1 });
runAgg("SBE, index on uid, users10k", p10);
db.users10k.drop();

// ---------- C. $group: ліміт пам'яті й скидання на диск ----------
log("\n== C. $group by userId (50k groups) with 1 MB stage limit ==");
// ліміт 100 МБ на стадію; у SBE його задає окремий параметр, тож знижуємо обидва
const grp = [{ $group: { _id: "$userId", total: { $sum: "$amount" }, last: { $max: "$ts" } } }];
const setGroupLimit = (b) => admin.runCommand({ setParameter: 1, internalDocumentSourceGroupMaxMemoryBytes: b, internalQuerySlotBasedExecutionHashAggApproxMemoryUseInBytesBeforeSpill: b });
runAgg("default limit (100 MB)", grp);
setGroupLimit(1048576);
runAgg("1 MB limit, allowDiskUse default", grp);
try { db.events.aggregate(grp, { allowDiskUse: false }).toArray(); log("allowDiskUse:false → ok"); }
catch (e) { log("allowDiskUse:false →", e.codeName || e.code, (e.message || "").slice(0, 120)); }
setGroupLimit(104857600);

// ---------- D. Plan cache і replanning ----------
log("\n== D. plan cache: {country, channel} with cross-skewed values ==");
db.events.getPlanCache().clear();
resetProfile(2);
const pc = (c, ch) => db.events.find({ country: c, channel: ch }).toArray().length;
pc("PL", "web"); pc("PL", "web"); pc("PL", "web"); // рідкісна країна → кешується план за country
const entry = db.events.aggregate([{ $planCacheStats: {} }, { $match: { "createdFromQuery.query.country": { $exists: true } } }]).toArray()
  .map((e) => ({ isActive: e.isActive, works: e.works, planCacheShapeHash: e.planCacheShapeHash, plan: walk(e.cachedPlan).stages.join(" > ") }));
log("$planCacheStats after PL/web ×3:", entry);
const n = pc("UA", "sms"); // поширена країна, рідкісний канал: кешований план надто дорогий
const last = db.system.profile.find({ ns: "shop.events", op: "query", "command.filter.country": "UA" }).sort({ ts: -1 }).limit(1).next();
log("UA/sms:", { nreturned: n, replanned: last.replanned, replanReason: last.replanReason, planSummary: last.planSummary, keysExamined: last.keysExamined, millis: last.millis, fromPlanCache: last.fromPlanCache });
log("$planCacheStats after UA/sms:", db.events.aggregate([{ $planCacheStats: {} }, { $match: { "createdFromQuery.query.country": { $exists: true } } }]).toArray()
  .map((e) => ({ isActive: e.isActive, works: e.works, plan: walk(e.cachedPlan).stages.join(" > ") })));
log("planCacheClear:", db.runCommand({ planCacheClear: "events" }).ok, "| entries left", db.events.aggregate([{ $planCacheStats: {} }]).toArray().length);
db.setProfilingLevel(0);

// ---------- E. Гігієна індексів ----------
log("\n== E. $indexStats after the workload ==");
db.events.aggregate([{ $indexStats: {} }]).toArray().forEach((s) => log(s.name.padEnd(22), "ops", s.accesses.ops));
db.events.hideIndex("type_1");
log("hidden type_1; app query plan:", counters(appQuery(USERS[1]).explain("executionStats")).plan);
db.events.unhideIndex("type_1");

log("\n== E2. write amplification: insertMany 200k docs ==");
function ins(nIdx) {
  db.w.drop(); db.createCollection("w");
  const specs = [{ userId: 1 }, { type: 1 }, { ts: -1 }, { country: 1, channel: 1 }, { amount: 1 }, { userId: 1, type: 1, ts: -1 }];
  specs.slice(0, nIdx).forEach((s) => db.w.createIndex(s));
  const docs = db.events.find({}, { _id: 0 }).limit(200_000).toArray();
  const s = Date.now();
  for (let i = 0; i < docs.length; i += 10_000) db.w.insertMany(docs.slice(i, i + 10_000), { ordered: false });
  const ms = Date.now() - s;
  const st = db.w.stats();
  return { secondaryIndexes: nIdx, ms, totalIndexSizeMB: +(st.totalIndexSize / 1048576).toFixed(1), storageSizeMB: +(st.storageSize / 1048576).toFixed(1) };
}
for (const k of [0, 3, 6]) { const r = [ins(k), ins(k), ins(k)]; log({ ...r[0], ms: median(r.map((x) => x.ms)) }); }
db.w.drop();

log("\n== F. cache counters ==");
const c = db.serverStatus().wiredTiger.cache;
log({ maxMB: c["maximum bytes configured"] / 1048576, inCacheMB: Math.round(c["bytes currently in the cache"] / 1048576), dirtyMB: Math.round(c["tracked dirty bytes in the cache"] / 1048576), evictedByAppThreads: c["pages evicted by application threads"] });
