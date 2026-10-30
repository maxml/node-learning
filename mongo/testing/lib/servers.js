// Three ways to get a real mongod for tests. Each returns { uri, stop, kind }.
// Testcontainers: Docker image mongo:9 (already local), random host port,
// container name prefixed "kb-mongo-testing-" so it never clashes with other agents.
// Ryuk (the reaper container) is disabled so no extra image is pulled; stop() removes
// the container explicitly instead.
process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";

// "mongo:9" is the local image (9.0.4); a floating tag is fine here only because
// nothing is pulled. In CI pin the full tag (mongo:9.0.4) or a digest.
const MONGO_IMAGE = process.env.MONGO_IMAGE ?? "mongo:9";
// mongodb-memory-server-core 11.3.0 defaults to 8.2.6; pin the same server as the image.
const MMS_VERSION = process.env.MONGOMS_VERSION ?? "9.0.4";

function suffix() {
  return `${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
}

// The module's own health check (rs.initiate + wait for primary) runs every 5000 ms,
// and Docker runs the first check only after one interval: ~5 s of every start is waiting.
// fastHealthCheck supplies the same command with a 300 ms interval.
const RS_INIT = `mongosh --quiet --eval 'try { rs.status(); } catch (e) { rs.initiate(); } while (db.runCommand({isMaster: 1}).ismaster==false) { sleep(100); }'`;

async function startTestcontainers({ fastHealthCheck = process.env.TC_FAST_HC === "1" } = {}) {
  const { MongoDBContainer } = require("@testcontainers/mongodb");
  let def = new MongoDBContainer(MONGO_IMAGE)
    .withName(`kb-mongo-testing-${suffix()}`)
    .withLabels({ "kb.example": "mongo-testing" });
  if (fastHealthCheck) {
    def = def.withHealthCheck({ test: ["CMD-SHELL", RS_INIT], interval: 300, timeout: 60000, retries: 1000 });
  }
  const container = await def.start();
  // The module runs rs.initiate() with the container's internal hostname, so a
  // replica-set-aware client would try to reach that hostname. directConnection=true
  // talks to the mapped port only.
  const uri = `${container.getConnectionString()}/?directConnection=true`;
  const kind = fastHealthCheck ? "testcontainers-fast-hc" : "testcontainers";
  return { kind, uri, stop: () => container.stop({ remove: true }) };
}

async function startMemoryReplSet() {
  const { MongoMemoryReplSet } = require("mongodb-memory-server-core");
  const rs = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
    binary: { version: MMS_VERSION },
  });
  return { kind: "mms-replset", uri: rs.getUri(), stop: () => rs.stop() };
}

async function startMemoryStandalone() {
  const { MongoMemoryServer } = require("mongodb-memory-server-core");
  const s = await MongoMemoryServer.create({ binary: { version: MMS_VERSION } });
  return { kind: "mms-standalone", uri: s.getUri(), stop: () => s.stop() };
}

module.exports = { startTestcontainers, startMemoryReplSet, startMemoryStandalone, MONGO_IMAGE, MMS_VERSION };
