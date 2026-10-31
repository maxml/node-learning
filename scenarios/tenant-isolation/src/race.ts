// Concurrent cross-tenant test against every variant: same load, count leaked responses.
import { burst, serverStats, startVariant } from './harness.js';

const variants = (process.argv[2] ?? 'singleton,explicit,request,als,cls,durable,rls,rls-singleton').split(',');
const rounds = Number(process.env.ROUNDS ?? 20);
const concurrency = Number(process.env.CONCURRENCY ?? 60);

console.log(`node ${process.version}; ${rounds} rounds x ${concurrency} concurrent GET /orders, tenants 1..3`);
for (const v of variants) {
  const app = await startVariant(v);
  try {
    const r = await burst(app.port, rounds, concurrency);
    const s = await serverStats(app.port);
    console.log(JSON.stringify({
      variant: v, requests: r.total, leakedResponses: r.leaks, foreignRows: r.foreignRows,
      wrongRowCount: r.wrongCount, errors: r.errors, serverAlarms: s.alarms, constructed: s.constructed,
    }));
  } finally {
    await app.stop();
  }
}
