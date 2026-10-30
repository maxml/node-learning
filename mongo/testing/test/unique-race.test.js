// (a) Unique-index race.
// Mutation: SKIP_INDEXES=1 removes createIndexes() from setup. Expected:
//   - "sequential duplicate" stays GREEN (vacuous: findOne alone catches it);
//   - "concurrent duplicates" goes RED (several users with one email).
const { test, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setup } = require("../lib/backend");
const { registerUser, createIndexes } = require("../lib/app");

let env;
before(async () => {
  env = await setup(__filename);
  if (process.env.SKIP_INDEXES !== "1") await createIndexes(env.db);
});
after(() => env.teardown());
// deleteMany keeps the indexes; dropDatabase would remove them (see isolation.test.js)
beforeEach(() => env.db.collection("users").deleteMany({}));

test("sequential duplicate is rejected", async () => {
  assert.equal((await registerUser(env.db, "a@x.io")).ok, true);
  assert.deepEqual(await registerUser(env.db, "a@x.io"), { ok: false, reason: "exists" });
});

test("concurrent duplicates: exactly one user is created", async () => {
  const results = await Promise.all(
    Array.from({ length: 20 }, () => registerUser(env.db, "race@x.io")),
  );
  const created = await env.db.collection("users").countDocuments({ email: "race@x.io" });
  console.log(`# created=${created} ok=${results.filter((r) => r.ok).length}/20`);
  assert.equal(created, 1);
  assert.equal(results.filter((r) => r.ok).length, 1);
});
