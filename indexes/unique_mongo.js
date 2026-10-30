// Унікальність у MongoDB: відсутнє поле як null, sparse проти partial, multikey, складений.
const t = db.getSiblingDB("uniq");
t.dropDatabase();
function tryInsert(coll, doc) {
  try { coll.insertOne(doc); return "ok"; } catch (e) { return `${e.code} ${e.errmsg || e.message}`.slice(0, 110); }
}
const out = (label, r) => print(`${label}: ${r}`);

// 1. Звичайний унікальний: відсутнє поле індексується як null
t.plain.createIndex({ email: 1 }, { unique: true });
out("plain, {} #1", tryInsert(t.plain, {}));
out("plain, {} #2", tryInsert(t.plain, {}));
out("plain, {email:null} при наявному {}", tryInsert(t.plain, { email: null }));

// 2. sparse unique: пропускає відсутні поля, але явний null індексує
t.sparse.createIndex({ email: 1 }, { unique: true, sparse: true });
out("sparse, {} #1", tryInsert(t.sparse, {}));
out("sparse, {} #2", tryInsert(t.sparse, {}));
out("sparse, {email:null} #1", tryInsert(t.sparse, { email: null }));
out("sparse, {email:null} #2", tryInsert(t.sparse, { email: null }));
const sp = t.sparse.find().sort({ email: 1 }).explain("queryPlanner").queryPlanner.winningPlan;
out("sparse, find().sort({email:1}) без hint, план", JSON.stringify(sp.queryPlan ? sp.queryPlan.stage : sp.stage) + " / " + JSON.stringify(sp.queryPlan || sp).includes("IXSCAN"));

// 3. partial unique за типом: унікальні лише рядкові email
t.partial.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: "string" } } });
out("partial, {} #1", tryInsert(t.partial, {}));
out("partial, {} #2", tryInsert(t.partial, {}));
out("partial, {email:null} #1", tryInsert(t.partial, { email: null }));
out("partial, {email:null} #2", tryInsert(t.partial, { email: null }));
out("partial, 'a@x.io' #1", tryInsert(t.partial, { email: "a@x.io" }));
out("partial, 'a@x.io' #2", tryInsert(t.partial, { email: "a@x.io" }));

// 4. Частковий унікальний «серед не видалених» (аналог WHERE deleted_at IS NULL)
t.acc.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { deleted: false } });
out("acc, live a #1", tryInsert(t.acc, { email: "a", deleted: false }));
t.acc.updateOne({ email: "a" }, { $set: { deleted: true } });
out("acc, live a після soft delete", tryInsert(t.acc, { email: "a", deleted: false }));
out("acc, друга live a", tryInsert(t.acc, { email: "a", deleted: false }));

// 5. Multikey unique: унікальність між документами, не всередині масиву
t.tags.createIndex({ tags: 1 }, { unique: true });
out("multikey, {tags:['x','x']} в одному документі", tryInsert(t.tags, { tags: ["x", "x"] }));
out("multikey, {tags:['y','x']} другий документ", tryInsert(t.tags, { tags: ["y", "x"] }));
out("multikey, {tags:['y','z']} другий документ", tryInsert(t.tags, { tags: ["y", "z"] }));
out("multikey, {tags:['z']} третій документ", tryInsert(t.tags, { tags: ["z"] }));

// 5b. «Серед не видалених» через відсутність поля: $exists:false у partialFilterExpression не підтримується
try {
  t.acc2.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { deleted_at: { $exists: false } } });
  out("partialFilterExpression {deleted_at:{$exists:false}}", "ok");
} catch (e) { out("partialFilterExpression {deleted_at:{$exists:false}}", `${e.code} ${e.errmsg}`.slice(0, 130)); }
try {
  t.acc3.createIndex({ email: 1 }, { unique: true, partialFilterExpression: { deleted_at: null } });
  out("partialFilterExpression {deleted_at:null}", "ok");
  out("  null-фільтр: live a #1", tryInsert(t.acc3, { email: "a" }));
  t.acc3.updateOne({ email: "a" }, { $set: { deleted_at: new Date() } });
  out("  null-фільтр: live a після soft delete", tryInsert(t.acc3, { email: "a" }));
  out("  null-фільтр: друга live a", tryInsert(t.acc3, { email: "a" }));
} catch (e) { out("partialFilterExpression {deleted_at:null}", `${e.code} ${e.errmsg}`.slice(0, 130)); }

// 6. Складений унікальний з відсутнім полем
t.members.createIndex({ tenant: 1, email: 1 }, { unique: true });
out("compound, {tenant:1} #1", tryInsert(t.members, { tenant: 1 }));
out("compound, {tenant:1} #2", tryInsert(t.members, { tenant: 1 }));
out("compound, {tenant:2} (інший tenant)", tryInsert(t.members, { tenant: 2 }));
t.dropDatabase();
