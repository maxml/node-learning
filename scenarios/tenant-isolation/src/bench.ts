// Throughput cost of each fix. DB_MODE=memory isolates Nest/DI cost (no Postgres in the loop);
// DB_MODE=pg compares the extra round trips of the RLS transaction.
// Variants are interleaved over REPEAT passes so machine noise hits all of them; median is reported.
import autocannon from 'autocannon';
import { startVariant } from './harness.js';

const mode = process.env.DB_MODE ?? 'memory';
const variants = (process.argv[2] ?? (mode === 'memory'
  ? 'explicit,als,cls,durable,request'
  : 'explicit,rls')).split(',');
const duration = Number(process.env.DURATION ?? 10);
const connections = Number(process.env.CONNECTIONS ?? 50);
const repeat = Number(process.env.REPEAT ?? 3);

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const runs: Record<string, { rps: number; p99: number }[]> = {};

console.log(`node ${process.version}; DB_MODE=${mode}; autocannon ${connections} connections x ${duration}s, ${repeat} interleaved passes`);
for (let pass = 1; pass <= repeat; pass++) {
  for (const v of variants) {
    const app = await startVariant(v, { DB_MODE: mode, SLOW_MS: '0' });
    try {
      let n = 0;
      const result = await autocannon({
        url: `http://127.0.0.1:${app.port}/orders`, connections, duration,
        requests: [{
          setupRequest: (req: Record<string, unknown>) => ({
            ...req, headers: { authorization: `Bearer tenant:${(n++ % 3) + 1}` },
          }),
        }],
      });
      if (result.non2xx || result.errors) throw new Error(`${v}: ${result.non2xx} non-2xx, ${result.errors} errors`);
      (runs[v] ??= []).push({ rps: Math.round(result.requests.average), p99: result.latency.p99 });
      console.log(`pass ${pass} ${v}: ${Math.round(result.requests.average)} req/s, p99 ${result.latency.p99} ms`);
    } finally {
      await app.stop();
    }
  }
}
const base = median(runs[variants[0]].map((r) => r.rps));
console.log('\nmedian over passes (relative to first variant):');
for (const v of variants) {
  const rps = median(runs[v].map((r) => r.rps));
  console.log(JSON.stringify({ variant: v, reqPerSec: rps, p99ms: median(runs[v].map((r) => r.p99)), relative: +(rps / base).toFixed(2) }));
}
