// How many server-side connections one MongoClient holds, with and without FaaS detection,
// plus how long a failed server selection takes. For "MongoDB в AWS.md".
// Usage: node faas-monitoring.js <uri> <label>
//   Run once normally and once with AWS_EXECUTION_ENV=AWS_Lambda_nodejs24.x to emulate Lambda
//   (the driver detects FaaS from env vars; this is NOT a real Lambda run).
const { MongoClient } = require("mongodb");

const uri = process.argv[2];
const label = process.argv[3] || "run";
const appName = `kbfaas-${label}-${process.pid}`;

async function countConnections(admin) {
  const ops = await admin.db("admin").aggregate([
    { $currentOp: { allUsers: true, idleConnections: true, localOps: false } },
    { $match: { appName } },
  ]).toArray();
  return ops.length;
}

(async () => {
  const admin = new MongoClient(uri, { appName: "kbfaas-observer" });
  await admin.connect();

  const current = async () => (await admin.db("admin").command({ serverStatus: 1 })).connections.current;
  const before = await current();

  const t0 = Date.now();
  const client = new MongoClient(uri, { appName, maxPoolSize: 5 });
  await client.db("t").collection("c").findOne({}); // first op = "cold start"
  const firstOpMs = Date.now() - t0;

  // Let monitors settle: stream mode opens an extra RTT connection per server after a heartbeat
  // (heartbeatFrequencyMS defaults to 10 s), so wait longer than one heartbeat.
  await new Promise((r) => setTimeout(r, 12000));
  const conns = await countConnections(admin);
  const delta = (await current()) - before;
  console.log(`RESULT ${label}: faas_env=${process.env.AWS_EXECUTION_ENV || "-"} ` +
    `serverMonitoringMode=${client.options.serverMonitoringMode} first_op_ms=${firstOpMs} ` +
    `currentOp_with_appName=${conns} serverStatus_connections_delta=${delta}`);
  await client.close();

  // Failed server selection: unreachable port, default vs short serverSelectionTimeoutMS.
  for (const ssto of [undefined, 2000]) {
    const opts = ssto ? { serverSelectionTimeoutMS: ssto } : {};
    const bad = new MongoClient("mongodb://127.0.0.1:1/?directConnection=true", opts);
    const t = Date.now();
    try { await bad.db("t").collection("c").findOne({}); } catch (e) {
      console.log(`RESULT ${label}: serverSelectionTimeoutMS=${ssto ?? "default"} failed_after_ms=${Date.now() - t} error=${e.name}`);
    }
    await bad.close();
    if (!ssto && label !== "normal") break; // the 30 s default only needs to be shown once
  }
  await admin.close();
})().catch((e) => { console.error(e); process.exit(1); });
