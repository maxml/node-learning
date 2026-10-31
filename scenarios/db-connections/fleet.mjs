// Runs N API replicas (+ optional scheduled worker) against the DB and prints one result line.
//   node fleet.mjs --label x --replicas 2 --pool 30 --rate 200 [--port 55441] [--conn-timeout 0]
//                  [--stmt-timeout 0] [--workers-jobs 0 --workers-pool 0] [--duration 20] [--drain 20]
// Observes the DB directly (superuser, port PGPORT): peak backends, DB CPU, pg_stat_statements.
import { fork } from 'node:child_process';
import pg from 'pg';

const a = Object.fromEntries(
  process.argv.slice(2).reduce((acc, x, i, all) => (x.startsWith('--') ? [...acc, [x.slice(2), all[i + 1]]] : acc), []),
);
const num = (k, d) => (a[k] === undefined ? d : Number(a[k]));
const PGPORT = Number(process.env.PGPORT ?? 55441);
const CONTAINER = process.env.PG_CONTAINER ?? 'scen-conn-pg';
const replicas = num('replicas', 2);
const pool = num('pool', 30);
const rate = num('rate', 100);
const port = num('port', PGPORT);
const durationMs = num('duration', 20) * 1000;
const drainMs = num('drain', 20) * 1000;
const workerJobs = num('workers-jobs', 0);
const workerPool = num('workers-pool', 0);

const admin = new pg.Client({ host: '127.0.0.1', port: PGPORT, user: 'postgres', password: 'pg', database: 'postgres' });
await admin.connect();
await admin.query('select pg_stat_statements_reset()');

// DB CPU from the container's cgroup: usage_usec delta / wall time = cores used on average
import { execFileSync } from 'node:child_process';
const cpuUsec = () =>
  Number(/usage_usec (\d+)/.exec(execFileSync('docker', ['exec', CONTAINER, 'cat', '/sys/fs/cgroup/cpu.stat']).toString())[1]);

let peakBackends = 0;
let peakActive = 0;
let sampling = true;
const sampler = (async () => {
  while (sampling) {
    const r = await admin.query(`select count(*)::int n, count(*) filter (where state = 'active')::int act
      from pg_stat_activity where backend_type = 'client backend' and usename = 'app'`);
    peakBackends = Math.max(peakBackends, r.rows[0].n);
    peakActive = Math.max(peakActive, r.rows[0].act);
    await new Promise((r) => setTimeout(r, 250));
  }
})();

const base = { host: '127.0.0.1', port, connTimeout: num('conn-timeout', 0), stmtTimeout: num('stmt-timeout', 0), durationMs, drainMs };
const procs = [];
for (let i = 0; i < replicas; i++) {
  procs.push({ role: 'api', cfg: { ...base, role: 'api', pool, rate: rate / replicas } });
}
if (workerJobs > 0) {
  procs.push({ role: 'worker', cfg: { ...base, role: 'worker', pool: workerPool, jobs: workerJobs, connTimeout: 0, stmtTimeout: 0 } });
}

const cpu0 = cpuUsec();
const t0 = performance.now();
const results = await Promise.all(
  procs.map(
    (p) =>
      new Promise((resolve, reject) => {
        const child = fork(new URL('./replica.mjs', import.meta.url), [JSON.stringify(p.cfg)]);
        child.on('message', (m) => resolve({ role: p.role, ...m }));
        child.on('error', reject);
        child.on('exit', (code) => reject(new Error(`${p.role} replica exited with ${code} before reporting`)));
      }),
  ),
);
const wall = (performance.now() - t0) / 1000;
const cores = (cpuUsec() - cpu0) / 1e6 / wall;
sampling = false;
await sampler;
const pgss = (
  await admin.query(`select calls::int, round(mean_exec_time::numeric, 1) mean from pg_stat_statements
    where query like 'select count(*), coalesce%' order by calls desc limit 1`)
).rows[0] ?? { calls: 0, mean: 0 };
await admin.end();

const pct = (v, p) => {
  if (!v.length) return 0;
  const s = Float64Array.from(v).sort();
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};
const f = (ms) => (ms >= 100 ? ms.toFixed(0) : ms.toFixed(1));
const api = results.filter((r) => r.role === 'api');
const lat = api.flatMap((r) => r.lat);
const wait = api.flatMap((r) => r.wait);
const errs = {};
for (const r of api) for (const [k, v] of Object.entries(r.errors)) errs[k] = (errs[k] ?? 0) + v;
const offered = Math.round(rate * (durationMs / 1000));
const fast = lat.filter((x) => x <= 1000).length;
const worker = results.find((r) => r.role === 'worker');
console.log(
  [
    a.label ?? '',
    `${replicas}x${pool}=${replicas * pool}${workerJobs ? ` +worker ${workerJobs} jobs/pool ${workerPool}` : ''}`,
    `offered ${offered}`,
    `ok ${lat.length} (<=1s: ${fast})`,
    `p50 ${f(pct(lat, 50))}`,
    `p99 ${f(pct(lat, 99))}`,
    `pool-wait p99 ${f(pct(wait, 99))}`,
    `errors ${JSON.stringify(errs)}`,
    `backends peak ${peakBackends} (active ${peakActive})`,
    `DB CPU ${cores.toFixed(2)} cores`,
    `pgss mean ${pgss.mean} ms`,
    `ELD p99 ${f(Math.max(...api.map((r) => r.eldP99)))} ms`,
    worker ? `reports ${worker.lat.length}` : '',
  ]
    .filter(Boolean)
    .join(' | '),
);
