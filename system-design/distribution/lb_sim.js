// Load-balancing simulation (discrete-event model, NOT a production measurement).
// 10 servers x 4 workers each, FIFO queue per server, Poisson arrivals.
// Request cost is heterogeneous: 95% cost 5 ms, 5% cost 200 ms (mean 14.75 ms).
// Balancers have an idealised, instant view of each server's outstanding requests.
// Scenarios: A) all servers equal; B) one server 4x slower; C) one server fails fast
// (1 ms error, no queueing), with and without passive outlier detection;
// D) L4 per-connection pinning vs L7 per-request balancing with skewed clients.
// Run: node lb_sim.js   (SEED, REQS env vars)

const S = 10, WORKERS = 4;
const REQS = Number(process.env.REQS ?? 300_000);
const SEED = Number(process.env.SEED ?? 42);
let seed = SEED; // every scenario row restarts from SEED, so rows see the same arrivals
function rnd() { // mulberry32
  seed = (seed + 0x6d2b79f5) | 0; let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const expo = (mean) => -Math.log(1 - rnd()) * mean;
const cost = () => (rnd() < 0.05 ? 200 : 5);
const MEAN_COST = 0.95 * 5 + 0.05 * 200;

// ---------- min-heap of events ----------
class Heap {
  constructor() { this.a = []; }
  push(e) { const a = this.a; a.push(e); let i = a.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (a[p].t <= a[i].t) break; [a[p], a[i]] = [a[i], a[p]]; i = p; } }
  pop() { const a = this.a; const top = a[0]; const last = a.pop(); if (a.length) { a[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < a.length && a[l].t < a[m].t) m = l; if (r < a.length && a[r].t < a[m].t) m = r; if (m === i) break; [a[m], a[i]] = [a[i], a[m]]; i = m; } } return top; }
  get size() { return this.a.length; }
}

// ---------- balancers: pick(servers, now, req) -> index ----------
const pickRandom = (sv) => Math.floor(rnd() * sv.length);
function makeRR() { let i = -1; return (sv) => { i = (i + 1) % sv.length; return i; }; }
const outstanding = (s) => s.busy + s.queue.length - s.qHead + s.failing;
function leastConn(sv) {
  let best = Infinity, cand = [];
  for (let i = 0; i < sv.length; i++) { const o = outstanding(sv[i]); if (o < best) { best = o; cand = [i]; } else if (o === best) cand.push(i); }
  return cand[Math.floor(rnd() * cand.length)];
}
function p2c(sv) {
  const a = pickRandom(sv); let b = pickRandom(sv); while (b === a) b = pickRandom(sv);
  return outstanding(sv[a]) <= outstanding(sv[b]) ? a : b;
}
// Peak-EWMA (Finagle-style): cost = ewma latency * (outstanding + 1), P2C on that cost.
function p2cPeakEwma(sv, now) {
  const c = (s) => s.ewma * (outstanding(s) + 1);
  const a = pickRandom(sv); let b = pickRandom(sv); while (b === a) b = pickRandom(sv);
  return c(sv[a]) <= c(sv[b]) ? a : b;
}

// peak-sensitive EWMA of observed latency: jump up to a spike at once, decay with tau = 1 s
function observe(s, l, now) {
  if (l > s.ewma) s.ewma = l; else { const w = Math.exp(-(now - s.ewmaT) / 1000); s.ewma = s.ewma * w + l * (1 - w); }
  s.ewmaT = now;
}

// ---------- simulation ----------
function simulate({ balancer, load = 0.7, slow = -1, slowFactor = 4, failing = -1, outlier = false, conns = null }) {
  const sv = Array.from({ length: S }, () => ({ busy: 0, queue: [], qHead: 0, failing: 0, ewma: MEAN_COST, ewmaT: 0, consecErr: 0, ejectedUntil: -1, served: 0, busyTime: 0 }));
  const lambda = (load * S * WORKERS) / MEAN_COST; // req per ms
  const ev = new Heap();
  const lat = []; let errors = 0, toBad = 0, done = 0;
  let t = 0;
  for (let n = 0; n < REQS; n++) { t += expo(1 / lambda); ev.push({ t, type: 'arr', c: cost(), conn: conns ? conns.pick() : -1 }); }
  const start = (s, idx, req, now) => {
    s.busy++; const c = idx === slow ? req.c * slowFactor : req.c;
    s.busyTime += c; ev.push({ t: now + c, type: 'dep', s: idx, arr: req.t });
  };
  while (ev.size) {
    const e = ev.pop(); const now = e.t;
    if (e.type === 'arr') {
      let pool = sv, map = null;
      if (outlier) { // passive outlier detection: ejected hosts are invisible to the balancer
        const eligible = []; for (let i = 0; i < S; i++) if (sv[i].ejectedUntil <= now) eligible.push(i);
        if (eligible.length < S) { pool = eligible.map((i) => sv[i]); map = eligible; }
      }
      let idx = conns ? conns.server(e.conn) : balancer(pool, now, e);
      if (map) idx = map[idx];
      const s = sv[idx]; s.served++;
      if (idx === failing) { // fast failure: 1 ms error, no worker used
        toBad++; s.failing++; ev.push({ t: now + 1, type: 'err', s: idx }); continue;
      }
      if (s.busy < WORKERS) start(s, idx, e, now); else s.queue.push(e);
    } else if (e.type === 'err') {
      const s = sv[e.s]; s.failing--; errors++; done++;
      s.consecErr++;
      observe(s, 1, now); // the client sees a fast (1 ms) response: an error looks "fast"
      if (outlier && s.consecErr >= 5) { s.ejectedUntil = now + 30_000; s.consecErr = 0; } // Envoy defaults: 5 consecutive 5xx, 30 s
    } else {
      const s = sv[e.s]; s.busy--; done++; const l = now - e.arr; lat.push(l); s.consecErr = 0;
      observe(s, l, now);
      if (s.qHead < s.queue.length) { const r = s.queue[s.qHead]; s.queue[s.qHead++] = undefined; start(s, e.s, r, now); }
    }
  }
  lat.sort((a, b) => a - b);
  const q = (p) => lat[Math.min(lat.length - 1, Math.floor(p * lat.length))];
  const horizon = t;
  const util = sv.map((s) => s.busyTime / (horizon * WORKERS));
  return { p50: q(0.5), p99: q(0.99), p999: q(0.999), errPct: (100 * errors) / REQS, badShare: (100 * toBad) / REQS, maxUtil: Math.max(...util) };
}

const fmt = (x) => (x >= 100 ? x.toFixed(0) : x.toFixed(1));
const balancers = [['round robin', () => makeRR()], ['random', () => pickRandom], ['least connections', () => leastConn], ['P2C (least of 2)', () => p2c], ['P2C + peak-EWMA', () => p2cPeakEwma]];
function table(title, opts, cols = ['p50', 'p99', 'p999']) {
  console.log(`\n## ${title}\n\n| balancer | p50 ms | p99 ms | p99.9 ms | errors % | share to bad server % |\n| --- | --- | --- | --- | --- | --- |`);
  for (const [name, mk] of balancers) {
    seed = SEED; const r = simulate({ balancer: mk(), ...opts });
    console.log(`| ${name} | ${fmt(r.p50)} | ${fmt(r.p99)} | ${fmt(r.p999)} | ${r.errPct.toFixed(2)} | ${opts.failing >= 0 ? r.badShare.toFixed(1) : '-'} |`);
  }
}

console.log(`# LB simulation: ${S} servers x ${WORKERS} workers, ${REQS.toLocaleString('en')} requests, cost 95% 5 ms / 5% 200 ms, seed ${SEED}`);
table('A. Equal servers, load 70%', { load: 0.7 });
table('B. One server 4x slower, load 70%', { load: 0.7, slow: 0 });
table('C. One server fails fast (1 ms error), load 70%', { load: 0.7, failing: 0 });
table('C+. Same, with passive outlier detection (5 consecutive errors -> eject 30 s)', { load: 0.7, failing: 0, outlier: true });

// D. Connection pinning: 20 long-lived client connections with Zipf(1) request rates.
{
  const C = 20; const w = Array.from({ length: C }, (_, i) => 1 / (i + 1)); const H = w.reduce((a, b) => a + b, 0);
  const cdf = []; w.reduce((acc, x, i) => (cdf[i] = acc + x / H), 0);
  const pick = () => { const u = rnd(); let i = 0; while (i < C - 1 && cdf[i] < u) i++; return i; };
  console.log(`\n## D. 20 long-lived connections, request rate per connection Zipf(1) (top connection ${(100 / H).toFixed(1)}% of requests), load 50%\n\n| balancing unit | p50 ms | p99 ms | offered load on busiest server |\n| --- | --- | --- | --- |`);
  seed = SEED; let r = simulate({ balancer: null, load: 0.5, conns: { pick, server: (c) => c % S } });
  console.log(`| per connection (L4, round robin of connections) | ${fmt(r.p50)} | ${fmt(r.p99)} | ${(100 * r.maxUtil).toFixed(0)}% of capacity |`);
  seed = SEED; r = simulate({ balancer: p2c, load: 0.5, conns: null });
  console.log(`| per request (L7, P2C) | ${fmt(r.p50)} | ${fmt(r.p99)} | ${(100 * r.maxUtil).toFixed(0)}% |`);
}
