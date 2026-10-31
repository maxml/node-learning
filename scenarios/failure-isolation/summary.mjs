// Prints the README table from results.jsonl (written by `node run.mjs > results.jsonl`).
import { readFileSync } from 'node:fs';

const [meta, ...runs] = readFileSync(new URL('./results.jsonl', import.meta.url), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
console.log(`node ${meta.node}, ${meta.date}; healthy ${meta.HEALTHY_S} s, slow ${meta.SLOW_S} s; ${meta.ORDER_RPS}+${meta.PROFILE_RPS} rps; client timeout ${meta.CLIENT_TIMEOUT_MS} ms\n`);
const rows = [
  ['/order healthy p50 / p99, ms', (r) => `${r.healthy.order.p50} / ${r.healthy.order.p99}`],
  ['/profile healthy p50 / p99, ms', (r) => `${r.healthy.profile.p50} / ${r.healthy.profile.p99}`],
  ['/order slow: ok / degraded / error', (r) => `${r.slow.order.ok} / ${r.slow.order.degraded} / ${r.slow.order.errors}`],
  ['/order slow p50 / p99, ms', (r) => `${r.slow.order.p50} / ${r.slow.order.p99}`],
  ['/profile slow: ok / error', (r) => `${r.slow.profile.ok} / ${r.slow.profile.errors}`],
  ['/profile slow p50 / p99, ms', (r) => `${r.slow.profile.p50} / ${r.slow.profile.p99}`],
  ['gateway max in-flight', (r) => r.gatewayDuringSlow.maxInflight],
  ['gateway max pool waiters', (r) => r.gatewayDuringSlow.maxPoolWaiting],
  ['max idle in transaction (pg)', (r) => r.gatewayDuringSlow.maxIdleInTx],
  ['gateway max RSS / heap, MB', (r) => `${r.gatewayDuringSlow.maxRssMB} / ${r.gatewayDuringSlow.maxHeapMB}`],
  ['gateway event-loop delay p99 max, ms', (r) => r.gatewayDuringSlow.maxEldP99ms],
  ['requests at gateway per logical request', (r) => r.gatewayRequestsPerLogical],
  ['calls at loyalty per logical /order', (r) => r.loyaltyCallsPerLogicalOrder],
  ['loyalty max in-flight', (r) => r.loyaltyMaxInflight],
  ['breaker states seen / breaker rejects / bulkhead rejects', (r) => `${r.gatewayDuringSlow.breakerStates.join(',')} / ${r.gatewayDuringSlow.breakerRejects} / ${r.gatewayDuringSlow.bulkheadRejects}`],
];
console.log(`| metric | ${runs.map((r) => r.mode).join(' | ')} |`);
console.log(`| --- |${runs.map(() => ' ---: |').join('')}`);
for (const [name, f] of rows) console.log(`| ${name} | ${runs.map(f).join(' | ')} |`);
