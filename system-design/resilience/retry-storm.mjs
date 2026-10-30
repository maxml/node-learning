// Retry storm: discrete-event simulation in virtual time (seeded, reproducible).
//
// Part A — metastable failure. A dependency with W workers and an unbounded FIFO queue
// runs at 70% utilisation. For one second its service time grows 10x (a GC pause, a cold
// cache, a noisy neighbour). Clients time out after T and retry under different policies.
// The server keeps processing requests whose client already gave up (no deadline
// propagation) unless the "drop expired" variant is on.
//
// Part B — synchronized clients (the setting of Brooker's 2015 "Exponential Backoff And
// Jitter"): N clients hit a rate-limited dependency at the same instant and retry rejects.
//
// Run: node retry-storm.mjs            (seed 42)
//      SEEDS=1,2,3,4,5 node retry-storm.mjs

import { mulberry32, expSample, EventQueue } from './lib.mjs';

const SEEDS = (process.env.SEEDS ?? '42').split(',').map(Number);

// ---------------------------------------------------------------- Part A
const A = {
  workers: 10,
  serviceMs: 10, // capacity = 10 / 10 ms = 1000 rps
  slowServiceMs: 100, // during the trigger capacity drops to 100 rps
  rate: 700, // offered logical requests per second (70% utilisation)
  timeoutMs: 150, // client per-attempt timeout
  triggerStart: 2000,
  triggerEnd: 3000,
  arrivalsUntil: 30000,
  simUntil: 31000,
  maxAttempts: 3, // 1 try + 2 retries
  bucketMs: 500,
};

const policiesA = {
  'без ретраїв': { attempts: 1 },
  'миттєві ретраї (×3)': { attempts: 3, delay: () => 0 },
  'exp backoff (50 мс·2^n, cap 2 с)': { attempts: 3, delay: (n) => Math.min(2000, 50 * 2 ** (n - 1)) },
  'backoff + full jitter': { attempts: 3, delay: (n, rnd) => rnd() * Math.min(2000, 50 * 2 ** (n - 1)) },
  'backoff + jitter + бюджет 10%': {
    attempts: 3,
    delay: (n, rnd) => rnd() * Math.min(2000, 50 * 2 ** (n - 1)),
    budget: { perRequest: 0.1, cap: 10 },
  },
  'миттєві ретраї + сервер відкидає прострочені': { attempts: 3, delay: () => 0, dropExpired: true },
  'миттєві ретраї + LIFO + відкидання прострочених': { attempts: 3, delay: () => 0, dropExpired: true, lifo: true },
  'миттєві ретраї + черга ≤ 150 (швидкий 503)': { attempts: 3, delay: () => 0, maxQueue: 150 },
  'jitter + бюджет 10% + черга ≤ 150': {
    attempts: 3,
    delay: (n, rnd) => rnd() * Math.min(2000, 50 * 2 ** (n - 1)),
    budget: { perRequest: 0.1, cap: 10 },
    maxQueue: 150,
  },
};

function runA(policy, seed) {
  const rnd = mulberry32(seed);
  const q = new EventQueue();
  const queue = []; // FIFO of attempts waiting for a worker
  let qHead = 0;
  let busy = 0;
  let calls = 0, wasted = 0, dropped = 0, peakQueue = 0, rejected = 0;
  let budget = policy.budget ? policy.budget.cap : Infinity;
  const logical = [];

  const serviceTime = (t) => (t >= A.triggerStart && t < A.triggerEnd ? A.slowServiceMs : A.serviceMs);

  function startWork(now) {
    while (busy < A.workers && qHead < queue.length) {
      const att = policy.lifo ? queue.pop() : queue[qHead++];
      if (policy.dropExpired && att.abandoned) { dropped++; continue; }
      busy++;
      q.push(now + serviceTime(now), (t) => {
        busy--;
        if (att.abandoned) wasted++;
        else { att.done = true; att.req.ok = true; att.req.end = t; }
        startWork(t);
      });
    }
    if (qHead > 50000) { queue.splice(0, qHead); qHead = 0; }
  }

  function send(req, now) {
    calls++;
    req.attempts++;
    const att = { req, done: false, abandoned: false };
    // Bounded queue: reject at the door, the client learns about it immediately.
    const full = policy.maxQueue !== undefined && queue.length - qHead >= policy.maxQueue;
    if (full) rejected++;
    else {
      queue.push(att);
      peakQueue = Math.max(peakQueue, queue.length - qHead);
      startWork(now);
    }
    q.push(full ? now : now + A.timeoutMs, (t) => {
      if (att.done) return;
      att.abandoned = true;
      const canRetry = req.attempts < policy.attempts && budget >= 1;
      if (canRetry) {
        if (policy.budget) budget -= 1;
        q.push(t + policy.delay(req.attempts, rnd), (t2) => send(req, t2));
      } else { req.ok = false; req.end = t; }
    });
  }

  let t = 0;
  while (t < A.arrivalsUntil) {
    t += expSample(rnd, 1000 / A.rate);
    const at = t;
    q.push(at, (now) => {
      const req = { start: now, attempts: 0, ok: undefined };
      logical.push(req);
      if (policy.budget) budget = Math.min(policy.budget.cap, budget + policy.budget.perRequest);
      send(req, now);
    });
  }
  while (q.size) {
    const ev = q.pop();
    if (ev.t > A.simUntil) break;
    ev.fn(ev.t);
  }

  // Success ratio per arrival bucket; recovered = first bucket after the trigger from which
  // every later bucket (up to arrivalsUntil - 1 s) has >= 95% success.
  const nb = Math.floor((A.arrivalsUntil - 1000) / A.bucketMs);
  const ok = new Array(nb).fill(0), all = new Array(nb).fill(0);
  for (const r of logical) {
    const b = Math.floor(r.start / A.bucketMs);
    if (b >= nb) continue;
    all[b]++; if (r.ok) ok[b]++;
  }
  let recoveredAt = null;
  for (let b = nb - 1; b >= A.triggerEnd / A.bucketMs; b--) {
    if (ok[b] / all[b] >= 0.95) recoveredAt = b * A.bucketMs; else break;
  }
  const done = logical.filter((r) => r.start < A.arrivalsUntil - 1000);
  return {
    calls,
    perLogical: calls / logical.length,
    success: done.filter((r) => r.ok).length / done.length,
    recoverMs: recoveredAt === null ? null : Math.max(0, recoveredAt - A.triggerEnd),
    wasted,
    dropped: dropped + rejected,
    peakQueue,
  };
}

// ---------------------------------------------------------------- Part B
const B = {
  clients: 100,
  capacityPerSec: 200, // token bucket at the dependency, burst 20
  burst: 20,
  rttMs: 1,
  maxAttempts: 50,
  baseMs: 10,
  capMs: 1000,
  holdMs: 2, // contention model: a successful call holds the resource for 2 ms
};
const policiesB = {
  'миттєвий ретрай': () => 0,
  'exp backoff без jitter': (n) => Math.min(B.capMs, B.baseMs * 2 ** (n - 1)),
  'equal jitter': (n, rnd) => { const v = Math.min(B.capMs, B.baseMs * 2 ** (n - 1)); return v / 2 + rnd() * (v / 2); },
  'full jitter': (n, rnd) => rnd() * Math.min(B.capMs, B.baseMs * 2 ** (n - 1)),
};

// model 'bucket': the dependency admits 200 rps (token bucket, burst 20), rejects the rest.
// model 'contention': one shared resource (a hot row under optimistic locking, a lock);
// a call succeeds only if nobody holds it, and then holds it for holdMs. This is the
// setting of Brooker's simulation, where overlapping calls make each other fail.
function runB(delay, seed, model) {
  const rnd = mulberry32(seed);
  const q = new EventQueue();
  let tokens = B.burst, last = 0, calls = 0, lastSuccess = 0, failed = 0, succeeded = 0;
  let busyUntil = 0;
  const perBucket = new Map();
  const take = (t) => {
    if (model === 'contention') {
      if (t >= busyUntil) { busyUntil = t + B.holdMs; return true; }
      return false;
    }
    tokens = Math.min(B.burst, tokens + ((t - last) / 1000) * B.capacityPerSec);
    last = t;
    if (tokens >= 1) { tokens -= 1; return true; }
    return false;
  };
  function attempt(c, t) {
    calls++; c.n++;
    const b = Math.floor(t / 10);
    perBucket.set(b, (perBucket.get(b) ?? 0) + 1);
    if (take(t)) { succeeded++; lastSuccess = Math.max(lastSuccess, t + B.rttMs); return; }
    if (c.n >= B.maxAttempts) { failed++; return; }
    q.push(t + B.rttMs + delay(c.n, rnd), (t2) => attempt(c, t2));
  }
  for (let i = 0; i < B.clients; i++) q.push(0, (t) => attempt({ n: 0 }, t));
  while (q.size) { const ev = q.pop(); ev.fn(ev.t); }
  perBucket.delete(0); // the initial synchronized burst is the same for every policy
  return { calls, completeMs: lastSuccess, peak10ms: Math.max(0, ...perBucket.values()), succeeded, failed };
}

// ---------------------------------------------------------------- report
const fmt = (n, d = 0) => (n === null ? '—' : n.toFixed(d));
console.log(`# Part A: metastable failure (W=${A.workers}, capacity 1000 rps, load ${A.rate} rps, `
  + `trigger ${A.triggerStart}-${A.triggerEnd} ms at 100 rps, client timeout ${A.timeoutMs} ms, `
  + `${A.arrivalsUntil / 1000} s run)`);
for (const seed of SEEDS) {
  console.log(`\nseed=${seed}`);
  console.log('policy | calls | calls/logical | success | recover after trigger, ms | wasted work | dropped/rejected | peak queue');
  for (const [name, p] of Object.entries(policiesA)) {
    const r = runA(p, seed);
    console.log(`${name} | ${r.calls} | ${fmt(r.perLogical, 2)} | ${fmt(r.success * 100, 1)}% | `
      + `${r.recoverMs === null ? 'не відновився' : fmt(r.recoverMs)} | ${r.wasted} | ${r.dropped} | ${r.peakQueue}`);
  }
}

for (const model of ['contention', 'bucket']) {
  console.log(`\n# Part B (${model}): ${B.clients} synchronized clients, `
    + (model === 'bucket' ? `dependency ${B.capacityPerSec} rps (burst ${B.burst})` : `one resource held ${B.holdMs} ms per success`)
    + `, base ${B.baseMs} ms, cap ${B.capMs} ms, max ${B.maxAttempts} attempts`);
  for (const seed of SEEDS) {
    console.log(`\nseed=${seed}`);
    console.log('policy | calls | completion, ms | peak calls per 10 ms (after t=0) | succeeded | gave up');
    for (const [name, d] of Object.entries(policiesB)) {
      const r = runB(d, seed, model);
      console.log(`${name} | ${r.calls} | ${fmt(r.completeMs)} | ${r.peak10ms} | ${r.succeeded} | ${r.failed}`);
    }
  }
}
