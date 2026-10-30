// Isolation strategies: dropDatabase vs deleteMany, and indexes in setup.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { setup } = require("../lib/backend");
const { createIndexes } = require("../lib/app");

let env;
before(async () => { env = await setup(__filename); });
after(() => env.teardown());

async function dupInsertSucceeds(db) {
  const users = db.collection("users");
  await users.insertOne({ email: "d@x.io" });
  return users.insertOne({ email: "d@x.io" }).then(() => true, (e) => (e.code === 11000 ? false : Promise.reject(e)));
}

test("deleteMany between tests keeps the unique index", async () => {
  await createIndexes(env.db);
  await env.db.collection("users").deleteMany({});
  assert.equal(await dupInsertSucceeds(env.db), false);
});

test("dropDatabase between tests silently removes the unique index", async () => {
  await createIndexes(env.db);
  await env.db.dropDatabase();
  assert.equal(await dupInsertSucceeds(env.db), true); // constraint gone; tests now lie
  const names = (await env.db.collection("users").indexes()).map((i) => i.name);
  assert.deepEqual(names, ["_id_"]);
});

test("reset cost: dropDatabase + createIndexes vs deleteMany (20 rounds)", async () => {
  const seed = () => env.db.collection("users").insertMany(
    Array.from({ length: 100 }, (_, i) => ({ email: `u${i}@x.io` })),
  );
  let t = performance.now();
  for (let i = 0; i < 20; i++) { await seed(); await env.db.dropDatabase(); await createIndexes(env.db); }
  const drop = (performance.now() - t) / 20;
  t = performance.now();
  for (let i = 0; i < 20; i++) { await seed(); await env.db.collection("users").deleteMany({}); await env.db.collection("orders").deleteMany({}); }
  const del = (performance.now() - t) / 20;
  console.log(`# per round: dropDatabase+createIndexes=${drop.toFixed(1)} ms, deleteMany=${del.toFixed(1)} ms`);
});

test("Mongoose unique: true is not enforced until the index build finishes", async () => {
  const conn = await mongoose.createConnection(env.srv.uri, { dbName: "mongoose_unique" }).asPromise();
  await conn.db.dropDatabase();
  const User = conn.model("User", new mongoose.Schema({ email: { type: String, unique: true } }));
  // no await User.init(): autoIndex is still running in the background
  const early = await Promise.allSettled([User.create({ email: "m@x.io" }), User.create({ email: "m@x.io" })]);
  const earlyOk = early.filter((r) => r.status === "fulfilled").length;
  const indexBuilt = await User.init().then(() => "ok", (e) => `init failed: ${e.code ?? e.message}`);
  console.log(`# without init(): ${earlyOk}/2 inserts accepted; then init(): ${indexBuilt}`);

  await conn.db.dropDatabase();
  const User2 = conn.model("User2", new mongoose.Schema({ email: { type: String, unique: true } }), "users2");
  await User2.init(); // or syncIndexes()/createIndexes() in test setup
  const late = await Promise.allSettled([User2.create({ email: "m@x.io" }), User2.create({ email: "m@x.io" })]);
  const lateOk = late.filter((r) => r.status === "fulfilled").length;
  console.log(`# after init(): ${lateOk}/2 inserts accepted`);
  await conn.close();
  assert.equal(lateOk, 1);
});
