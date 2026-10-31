// Orchestrator: for each MODE start services + gateway, drive an OPEN-loop load
// (constant arrival rate, like real users: new requests keep coming no matter how slow we are),
// make loyalty (C) go from 200 ms to 20 s, and summarise.
//
// Run: node run.mjs                 (all modes)   MODES=fixed node run.mjs   (one mode)
// Needs PostgreSQL at PG_URL (see README for the docker command).

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createInterface } from 'node:readline';
import { setTimeout as sleep } from 'node:timers/promises';

const MODES = (process.env.MODES ?? 'naive,retries,retries-notx,fixed').split(',');
const HEALTHY_S = Number(process.env.HEALTHY_S ?? 10);
const SLOW_S = Number(process.env.SLOW_S ?? 40);
const ORDER_RPS = 50, PROFILE_RPS = 50;
const CLIENT_TIMEOUT_MS = 10_000;
const SLOW_MS = 20_000;
const ADMIN = 'http://127.0.0.1:4100';
const API = 'http://127.0.0.1:4000';
const orderBody = JSON.stringify({ customer: 7, items: Array.from({ length: 150 }, (_, i) => ({ sku: `SKU-${i}`, qty: 1, note: 'n'.repeat(80) })) });

function pct(arr, p) {
  if (!arr.length) return NaN;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1))];
}

function start(file, env) {
  const child = spawn(process.execPath, [file], { env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
  const lines = [];
  const ready = new Promise((resolve) => {
    createInterface({ input: child.stdout }).on('line', (l) => {
      const j = JSON.parse(l);
      if (j.ready) resolve(); else lines.push(j);
    });
  });
  return { child, lines, ready };
}

async function oneAttempt(path, isOrder) {
  try {
    const r = await fetch(API + path, {
      method: isOrder ? 'POST' : 'GET',
      body: isOrder ? orderBody : undefined,
      headers: isOrder ? { 'content-type': 'application/json' } : undefined,
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
    const text = await r.text();
    if (r.status >= 500) return { ok: false, kind: `http${r.status}` };
    return { ok: true, degraded: text.includes('"degraded":true') };
  } catch (e) {
    return { ok: false, kind: e.name === 'TimeoutError' ? 'client-timeout' : 'conn-error' };
  }
}

async function logical(path, isOrder, clientAttempts, rec) {
  const t = performance.now();
  let res, n = 0;
  do { n++; res = await oneAttempt(path, isOrder); } while (!res.ok && n < clientAttempts);
  rec.push({ ms: performance.now() - t, attempts: n, ...res });
}

async function runMode(mode) {
  const services = start('services.mjs', {});
  await services.ready;
  const gw = start('gateway.mjs', { MODE: mode });
  await gw.ready;
  const clientAttempts = mode.startsWith('retries') ? 3 : 1;
  // warmup (first 3 s: pool connects, JIT) and boundary (last 2 s before the slowdown, whose
  // requests overlap it) are sent but not summarised
  const rec = { warmup: { order: [], profile: [] }, healthy: { order: [], profile: [] }, boundary: { order: [], profile: [] }, slow: { order: [], profile: [] } };
  const pending = [];
  const t0 = performance.now();
  let sentO = 0, sentP = 0, phase = 'warmup', slowStartedAt = 0, attemptsAtSlow = {};
  while (true) {
    const el = (performance.now() - t0) / 1000;
    if (phase === 'warmup' && el >= 3) phase = 'healthy';
    if (phase === 'healthy' && el >= HEALTHY_S - 2) phase = 'boundary';
    if (phase === 'boundary' && el >= HEALTHY_S) {
      phase = 'slow';
      slowStartedAt = gw.lines.length;
      attemptsAtSlow = gw.lines.at(-1)?.attempts ?? {};
      await fetch(`${ADMIN}/reset`, { method: 'POST' });
      await fetch(`${ADMIN}/slow?svc=C&ms=${SLOW_MS}`, { method: 'POST' });
    }
    if (el >= HEALTHY_S + SLOW_S) break;
    while (sentO < el * ORDER_RPS) { sentO++; pending.push(logical('/order', true, clientAttempts, rec[phase].order)); }
    while (sentP < el * PROFILE_RPS) { sentP++; pending.push(logical(`/profile?id=${sentP % 100}`, false, clientAttempts, rec[phase].profile)); }
    await sleep(5);
  }
  const slowEndedAt = gw.lines.length;
  await Promise.race([Promise.all(pending), sleep(45_000)]);
  const svcStats = await (await fetch(`${ADMIN}/stats`)).json();
  gw.child.kill(); services.child.kill();
  await Promise.all([once(gw.child, 'exit'), once(services.child, 'exit')]);

  const slowLines = gw.lines.slice(slowStartedAt, slowEndedAt);
  const max = (k) => Math.max(...slowLines.map((l) => l[k] ?? 0));
  const summ = (arr) => ({
    n: arr.length,
    ok: arr.filter((r) => r.ok && !r.degraded).length,
    degraded: arr.filter((r) => r.ok && r.degraded).length,
    errors: arr.filter((r) => !r.ok).length,
    errorKinds: arr.filter((r) => !r.ok).reduce((m, r) => ((m[r.kind] = (m[r.kind] ?? 0) + 1), m), {}),
    clientAttempts: arr.reduce((s, r) => s + r.attempts, 0),
    p50: Math.round(pct(arr.map((r) => r.ms), 50)),
    p99: Math.round(pct(arr.map((r) => r.ms), 99)),
  });
  const lastLine = gw.lines.at(-1) ?? {};
  return {
    mode,
    healthy: { order: summ(rec.healthy.order), profile: summ(rec.healthy.profile) },
    slow: { order: summ(rec.slow.order), profile: summ(rec.slow.profile) },
    gatewayDuringSlow: {
      maxInflight: max('inflight'), maxRssMB: max('rssMB'), maxHeapMB: max('heapMB'),
      maxPoolWaiting: max('poolWaiting'), maxIdleInTx: max('idleInTx'), maxEldP99ms: max('eldP99ms'),
      breakerStates: [...new Set(slowLines.map((l) => l.breaker))],
      shed: lastLine.shed, bulkheadRejects: lastLine.bulkheadRejects, breakerRejects: lastLine.breakerRejects,
    },
    gatewayAttemptsToCSinceSlow: (lastLine.attempts?.C ?? 0) - (attemptsAtSlow.C ?? 0),
    gatewayRequestsPerLogical: +((rec.slow.order.reduce((s, r) => s + r.attempts, 0) + rec.slow.profile.reduce((s, r) => s + r.attempts, 0)) / (rec.slow.order.length + rec.slow.profile.length)).toFixed(2),
    loyaltyArrivalsSinceSlow: svcStats.C.arrivals,
    loyaltyMaxInflight: svcStats.C.maxInflight,
    loyaltyCallsPerLogicalOrder: +(svcStats.C.arrivals / rec.slow.order.length).toFixed(2),
    timeline: slowLines.map((l) => ({ t: l.t, inflight: l.inflight, rssMB: l.rssMB, poolWaiting: l.poolWaiting, idleInTx: l.idleInTx, breaker: l.breaker })),
  };
}

console.log(JSON.stringify({ node: process.version, date: new Date().toISOString(), HEALTHY_S, SLOW_S, ORDER_RPS, PROFILE_RPS, CLIENT_TIMEOUT_MS, SLOW_MS, orderBodyBytes: orderBody.length }));
for (const mode of MODES) console.log(JSON.stringify(await runMode(mode)));
