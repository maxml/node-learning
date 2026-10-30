// (c) Tenant filter at one choke point: driver guard, scoped repository,
// Mongoose plugin (and what bypasses it), $jsonSchema requiring tenantId.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { setup } = require("../lib/backend");
const { TenantFilterError, tenantOf, scopedCollection, guardedCollection } = require("../lib/tenant");

let env;
before(async () => {
  env = await setup(__filename);
  await env.db.createCollection("orders", {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["tenantId"],
        properties: { tenantId: { bsonType: "string", minLength: 1 } },
      },
    },
  });
  await env.db.collection("orders").insertMany([
    { tenantId: "t1", n: 1, status: "open" },
    { tenantId: "t1", n: 2, status: "open" },
    { tenantId: "t2", n: 3, status: "open" },
  ]);
});
after(() => env.teardown());

test("guard rejects a query without tenantId", async () => {
  const orders = guardedCollection(env.db.collection("orders"));
  await assert.rejects(async () => orders.find({ status: "open" }).toArray(), TenantFilterError);
  await assert.rejects(async () => orders.deleteMany({}), TenantFilterError);
  // the key is present but the predicate is not an equality: still cross-tenant
  await assert.rejects(async () => orders.find({ tenantId: { $ne: "t1" } }).toArray(), TenantFilterError);
  await assert.rejects(async () => orders.aggregate([{ $group: { _id: "$tenantId" } }]).toArray(), TenantFilterError);
  // fail closed: anything not on the allow-list is blocked
  assert.throws(() => orders.bulkWrite([]), TenantFilterError);
  assert.throws(() => orders.estimatedDocumentCount(), TenantFilterError);
  // scoped queries pass
  assert.equal((await orders.find({ tenantId: "t1", status: "open" }).toArray()).length, 2);
  assert.equal((await orders.find({ $and: [{ tenantId: "t2" }, { n: 3 }] }).toArray()).length, 1);
});

test("scoped repository cannot express a cross-tenant query", async () => {
  const t1 = scopedCollection(env.db.collection("orders"), "t1");
  assert.equal((await t1.find({}).toArray()).length, 2);
  // a caller-supplied tenantId is ANDed with the scope, not substituted for it
  assert.equal((await t1.find({ tenantId: "t2" }).toArray()).length, 0);
  assert.equal((await t1.aggregate([{ $count: "c" }]).toArray())[0].c, 2);
  assert.equal((await t1.deleteMany({ n: 3 })).deletedCount, 0); // n:3 belongs to t2
});

test("$jsonSchema rejects a write without tenantId (code 121)", async () => {
  const err = await env.db.collection("orders").insertOne({ n: 9 }).then(() => null, (e) => e);
  console.log(`# insert without tenantId: code=${err?.code} ${err?.codeName}`);
  assert.equal(err?.code, 121);
  // the validator guards writes only: an unscoped READ still sees every tenant
  assert.equal(await env.db.collection("orders").countDocuments({}), 3);
});

test("Mongoose plugin: which operations it covers and which bypass it", async () => {
  const conn = await mongoose.createConnection(env.srv.uri, { dbName: env.db.databaseName }).asPromise();
  const schema = new mongoose.Schema({ tenantId: String, n: Number, status: String }, { collection: "orders" });
  const QUERY_OPS = [
    "find", "findOne", "countDocuments", "estimatedDocumentCount", "distinct",
    "updateOne", "updateMany", "replaceOne", "deleteOne", "deleteMany",
    "findOneAndUpdate", "findOneAndDelete", "findOneAndReplace",
  ];
  schema.pre(QUERY_OPS, function () {
    if (!tenantOf(this.getFilter())) throw new TenantFilterError(`${this.op} without tenantId`);
  });
  schema.pre("aggregate", function () {
    if (!tenantOf(this.pipeline()[0]?.$match)) throw new TenantFilterError("aggregate without tenantId");
  });
  const Order = conn.model("Order", schema);

  const probes = {
    "find": () => Order.find({}),
    "findOne": () => Order.findOne({ n: 3 }),
    "countDocuments": () => Order.countDocuments({}),
    "estimatedDocumentCount": () => Order.estimatedDocumentCount(),
    "distinct": () => Order.distinct("tenantId"),
    "updateMany": () => Order.updateMany({}, { $set: { status: "seen" } }),
    "deleteMany (no match)": () => Order.deleteMany({ n: 999 }),
    "findOneAndUpdate": () => Order.findOneAndUpdate({ n: 3 }, { $set: { status: "seen" } }),
    "aggregate": () => Order.aggregate([{ $match: {} }]),
    "query .where().ne()": () => Order.find().where("tenantId").ne("t1"),
    // filter {} matches every tenant; the update is a no-op value so later probes stay valid
    "bulkWrite updateMany": () => Order.bulkWrite([{ updateMany: { filter: {}, update: { $set: { status: "open" } } } }]),
    "Model.collection.find": () => Order.collection.find({}).toArray(),
    "conn.db.collection().find": () => conn.db.collection("orders").find({}).toArray(),
  };
  const result = {};
  for (const [name, run] of Object.entries(probes)) {
    try {
      await run();
      result[name] = "BYPASSED";
    } catch (e) {
      result[name] = e instanceof TenantFilterError ? "blocked" : `error: ${e.message}`;
    }
  }
  console.log(`# ${JSON.stringify(result)}`);
  await conn.close();
  for (const op of ["find", "findOne", "countDocuments", "estimatedDocumentCount", "distinct",
    "updateMany", "deleteMany (no match)", "findOneAndUpdate", "aggregate", "query .where().ne()"]) {
    assert.equal(result[op], "blocked", op);
  }
  // documented gaps: model-level bulkWrite and the raw driver collection skip query middleware
  assert.equal(result["bulkWrite updateMany"], "BYPASSED");
  assert.equal(result["Model.collection.find"], "BYPASSED");
  assert.equal(result["conn.db.collection().find"], "BYPASSED");
});
