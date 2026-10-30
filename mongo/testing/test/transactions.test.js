// (b) Transactions and change streams need replica-set mode.
// Same code against a single-node replica set and a standalone mongod.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { setup } = require("../lib/backend");

async function transfer(client, db) {
  const accounts = db.collection("accounts");
  await client.withSession((session) =>
    session.withTransaction(async () => {
      await accounts.updateOne({ _id: "a" }, { $inc: { bal: -10 } }, { session });
      await accounts.updateOne({ _id: "b" }, { $inc: { bal: 10 } }, { session });
    }),
  );
}

let rs, sa;
before(async () => {
  rs = await setup(__filename, process.env.RS_BACKEND ?? "mms-replset");
  sa = await setup(__filename, "mms-standalone");
  for (const e of [rs, sa]) {
    await e.db.collection("accounts").insertMany([{ _id: "a", bal: 100 }, { _id: "b", bal: 0 }]);
  }
});
after(async () => { await rs.teardown(); await sa.teardown(); });

test("replica set: transaction commits", async () => {
  await transfer(rs.client, rs.db);
  const b = await rs.db.collection("accounts").findOne({ _id: "b" });
  assert.equal(b.bal, 10);
});

test("standalone: transaction fails; driver 7.7 hides IllegalOperation (code 20)", async () => {
  const err = await transfer(sa.client, sa.db).then(() => null, (e) => e);
  const orig = err?.errorResponse?.originalError;
  console.log(`# ${err?.name} code=${err?.code} msg="${err?.message}"`);
  console.log(`# originalError: code=${orig?.code} codeName=${orig?.codeName} errmsg="${orig?.errorResponse?.errmsg}"`);
  // The top-level message is misleading: it says to add retryWrites=false, and stays the
  // same even when retryWrites=false is set. The real server error is nested.
  assert.equal(err?.code, undefined);
  assert.match(err.message, /does not support retryable writes/);
  assert.equal(orig?.code, 20);
  assert.match(orig.errorResponse.errmsg, /Transaction numbers are only allowed on a replica set member or mongos/);
  // nothing was applied
  assert.equal((await sa.db.collection("accounts").findOne({ _id: "a" })).bal, 100);
});

test("standalone: change stream fails with code 40573", async () => {
  const cs = sa.db.collection("accounts").watch();
  const err = await cs.tryNext().then(() => null, (e) => e);
  await cs.close().catch(() => {});
  console.log(`# ${err?.name} code=${err?.code} msg="${err?.message}"`);
  assert.equal(err?.code, 40573);
});
