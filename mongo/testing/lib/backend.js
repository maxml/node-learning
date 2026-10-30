// One server per test file; one database per test file (name derived from the file).
// BACKEND=mms-replset (default) | testcontainers | mms-standalone
const path = require("node:path");
const { MongoClient } = require("mongodb");
const servers = require("./servers");

const START = {
  "mms-replset": servers.startMemoryReplSet,
  "mms-standalone": servers.startMemoryStandalone,
  "testcontainers": servers.startTestcontainers,
};

async function setup(testFile, backend = process.env.BACKEND ?? "mms-replset") {
  const srv = await START[backend]();
  const client = await MongoClient.connect(srv.uri);
  const dbName = `t_${path.basename(testFile).replace(/\W/g, "_")}`;
  return {
    srv,
    client,
    db: client.db(dbName),
    async teardown() {
      await client.close();
      await srv.stop();
    },
  };
}

module.exports = { setup };
