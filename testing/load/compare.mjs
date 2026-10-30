// Same server, same one-second hiccup, four ways to measure it.
// Run: node load/compare.mjs     (needs Docker for k6; image grafana/k6:2.3.0)
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';

const here = fileURLToPath(new URL('.', import.meta.url));
const PORT = 3999;
const DURATION = 15;
const URL_ = `http://127.0.0.1:${PORT}/`;

async function withServer(fn) {
  const srv = spawn(process.execPath, [`${here}server.js`], { env: { ...process.env, PORT: String(PORT) } });
  await once(srv.stdout, 'data');
  try { return await fn(); } finally {
    srv.kill('SIGTERM');
    const [line] = await once(srv.stdout, 'data');
    process.stderr.write(`  server: ${line}`);
  }
}

const fmt = (r) => ({ ...r, avg: +r.avg.toFixed(2), p50: +r.p50.toFixed(2), p90: +r.p90.toFixed(2), p99: +r.p99.toFixed(2), max: +r.max.toFixed(1) });

async function cannon(label, opts) {
  return withServer(async () => {
    const r = await autocannon({ url: URL_, duration: DURATION, ...opts });
    // latency.totalCount = samples in the histogram; with CO correction it exceeds real responses
    return fmt({ tool: label, requests: r.requests.total, samples: r.latency.totalCount, avg: r.latency.average, p50: r.latency.p50, p90: r.latency.p90, p99: r.latency.p99, max: r.latency.max });
  });
}

async function k6(label, env) {
  return withServer(async () => {
    const args = ['run', '--rm', '--network', 'host', '-v', `${here}:/s:ro`, ...Object.entries({ ...env, TARGET: URL_, DURATION: `${DURATION}s` }).flatMap(([k, v]) => ['-e', `${k}=${v}`]),
      'grafana/k6:2.3.0', 'run', '--quiet', '/s/k6-script.js'];
    const out = execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const j = JSON.parse(out.trim().split('\n').pop());
    return fmt({ tool: label, requests: j.requests, avg: j.avg, p50: j.p50, p90: j.p90, p99: j.p99, max: j.max, dropped: j.dropped_iterations });
  });
}

const which = (process.argv[2] ?? 'all').split(',');
const runs = {
  'autocannon-closed': () => cannon('autocannon -c 10 (closed, unthrottled)', { connections: 10 }),
  'autocannon-rate': () => cannon('autocannon -c 10 -R 1000 (closed, rate-limited, CO "correction" on)', { connections: 10, overallRate: 1000 }),
  'autocannon-rate-raw': () => cannon('autocannon -c 10 -R 1000 -C (correction off)', { connections: 10, overallRate: 1000, ignoreCoordinatedOmission: true }),
  'k6-closed': () => k6('k6 constant-vus 10 (closed)', { MODEL: 'closed', VUS: 10 }),
  'k6-open': () => k6('k6 constant-arrival-rate 1000/s (open)', { MODEL: 'open', RATE: 1000 }),
};
const results = [];
for (const [name, run] of Object.entries(runs)) {
  if (!which.includes('all') && !which.includes(name)) continue;
  process.stderr.write(`${name}...\n`);
  results.push(await run());
}
console.table(results);
console.log(JSON.stringify(results));
