// Closed-loop sweep: C connections, each running the API query back to back for T seconds.
// No pool queue here: this measures what the DATABASE does with C concurrent queries.
//   node sweep.mjs [--levels 1,2,4,8,16,32,64,90] [--seconds 10]
import pg from 'pg';
import { execFileSync } from 'node:child_process';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const levels = arg('levels', '1,2,4,8,16,32,64,90').split(',').map(Number);
const seconds = Number(arg('seconds', 10));
const PGPORT = Number(process.env.PGPORT ?? 55441);
const CONTAINER = process.env.PG_CONTAINER ?? 'scen-conn-pg';
const Q = 'select count(*), coalesce(sum(amount), 0) from orders where customer_id = $1';
const cpuUsec = () =>
  Number(/usage_usec (\d+)/.exec(execFileSync('docker', ['exec', CONTAINER, 'cat', '/sys/fs/cgroup/cpu.stat']).toString())[1]);
const pct = (v, p) => {
  const s = Float64Array.from(v).sort();
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

console.log('connections | queries/s | p50 ms | p99 ms | DB CPU cores | L = λ·W');
for (const n of levels) {
  const clients = await Promise.all(
    Array.from({ length: n }, async () => {
      const c = new pg.Client({ host: '127.0.0.1', port: PGPORT, user: 'app', password: 'app', database: 'postgres' });
      await c.connect();
      return c;
    }),
  );
  // warm-up
  await Promise.all(clients.map((c) => c.query(Q, [1])));
  const lat = [];
  const cpu0 = cpuUsec();
  const t0 = performance.now();
  const end = t0 + seconds * 1000;
  await Promise.all(
    clients.map(async (c) => {
      while (performance.now() < end) {
        const s = performance.now();
        await c.query(Q, [1 + Math.floor(Math.random() * 50000)]);
        lat.push(performance.now() - s);
      }
    }),
  );
  const wall = (performance.now() - t0) / 1000;
  const cores = (cpuUsec() - cpu0) / 1e6 / wall;
  await Promise.all(clients.map((c) => c.end()));
  const tput = lat.length / wall;
  const mean = lat.reduce((a, b) => a + b, 0) / lat.length;
  console.log(
    `${n} | ${tput.toFixed(0)} | ${pct(lat, 50).toFixed(1)} | ${pct(lat, 99).toFixed(1)} | ${cores.toFixed(2)} | ${((tput * mean) / 1000).toFixed(1)}`,
  );
}
