// Pin index usage with explain. Mutation: SKIP_INDEXES=1 → the test goes red.
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { setup } = require("../lib/backend");
const { createIndexes, openOrders } = require("../lib/app");

let env;
before(async () => {
  env = await setup(__filename);
  if (process.env.SKIP_INDEXES !== "1") await createIndexes(env.db);
  // seed shape matters: with 10 documents a COLLSCAN is as cheap as anything
  const docs = [];
  for (let i = 0; i < 5000; i++) {
    // first version used i % 10 for status: no open orders for t7 at all, and the
    // assertion docs === nReturned passed as 0 === 0. Hence the nReturned > 0 guard.
    docs.push({ tenantId: `t${i % 50}`, status: i % 7 === 0 ? "open" : "closed", createdAt: new Date(1e12 + i) });
  }
  await env.db.collection("orders").insertMany(docs);
});
after(() => env.teardown());

// collect stage names; 9.0 may return a classic plan or an SBE plan (winningPlan.queryPlan)
function stages(node, out = []) {
  if (!node || typeof node !== "object") return out;
  if (node.stage) out.push(node.indexName ? `${node.stage}:${node.indexName}` : node.stage);
  for (const k of ["inputStage", "queryPlan", "inputStages"]) {
    const v = node[k];
    if (Array.isArray(v)) v.forEach((n) => stages(n, out)); else stages(v, out);
  }
  return out;
}

test("openOrders uses the tenant index, without in-memory SORT", async () => {
  const ex = await (await openOrders(env.db, "t7")).explain("executionStats");
  const plan = stages(ex.queryPlanner.winningPlan);
  const s = ex.executionStats;
  console.log(`# plan=${plan.join(" > ")} keys=${s.totalKeysExamined} docs=${s.totalDocsExamined} n=${s.nReturned}`);
  assert.ok(s.nReturned > 0, "seed does not exercise the query");
  assert.ok(plan.includes("IXSCAN:tenant_status_createdAt"), plan.join(" > "));
  assert.ok(!plan.includes("SORT"), "in-memory sort");
  assert.equal(s.totalDocsExamined, s.nReturned);
});
