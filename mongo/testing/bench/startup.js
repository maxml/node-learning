// (d) Startup time: Testcontainers vs mongodb-memory-server, N runs each.
// Measures create() → first successful ping → stop(). Binary/image are already cached;
// the first MMS run of a new version also downloads the binary (reported separately).
const { MongoClient } = require("mongodb");
const servers = require("../lib/servers");

const N = Number(process.env.RUNS ?? 3);

async function once(start) {
  const t0 = performance.now();
  const srv = await start();
  const client = await MongoClient.connect(srv.uri, { serverSelectionTimeoutMS: 30000 });
  const hello = await client.db("admin").command({ hello: 1 });
  const build = await client.db("admin").command({ buildInfo: 1 });
  const ready = performance.now() - t0;
  // transactions need a replica set: setName present?
  const rs = hello.setName ?? "standalone";
  await client.close();
  const t1 = performance.now();
  await srv.stop();
  const stopMs = performance.now() - t1;
  return { kind: srv.kind, version: build.version, rs, readyMs: Math.round(ready), stopMs: Math.round(stopMs) };
}

(async () => {
  const which = (process.argv[2] ?? "mms-standalone,mms-replset,testcontainers").split(",");
  const map = {
    "testcontainers": () => servers.startTestcontainers({ fastHealthCheck: false }),
    "testcontainers-fast-hc": () => servers.startTestcontainers({ fastHealthCheck: true }),
    "mms-replset": servers.startMemoryReplSet,
    "mms-standalone": servers.startMemoryStandalone,
  };
  for (const k of which) {
    for (let i = 0; i < N; i++) console.log(JSON.stringify(await once(map[k])));
  }
})().catch((e) => { console.error(e); process.exit(1); });
