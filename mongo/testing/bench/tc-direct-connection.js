// Does the @testcontainers/mongodb connection string work as-is?
// The module runs rs.initiate() without a config, so the member's host is the
// container's internal hostname; a replica-set-aware client follows it.
process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";
const { MongoDBContainer } = require("@testcontainers/mongodb");
const { MongoClient } = require("mongodb");
const { MONGO_IMAGE } = require("../lib/servers");

(async () => {
  const c = await new MongoDBContainer(MONGO_IMAGE)
    .withName(`kb-mongo-testing-dc-${process.pid}`)
    .withLabels({ "kb.example": "mongo-testing" })
    .start();
  try {
    for (const q of ["", "/?directConnection=true"]) {
      const uri = c.getConnectionString() + q;
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
      try {
        await client.connect();
        await client.db("x").collection("y").insertOne({ a: 1 });
        const hello = await client.db("admin").command({ hello: 1 });
        console.log(JSON.stringify({ uri, ok: true, me: hello.me }));
      } catch (e) {
        console.log(JSON.stringify({ uri, ok: false, error: `${e.name}: ${e.message}`.slice(0, 160) }));
      } finally {
        await client.close();
      }
    }
  } finally {
    await c.stop({ remove: true });
  }
})();
