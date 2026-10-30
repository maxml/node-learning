// Retry amplification across call depth, over real HTTP on loopback.
// client → A → B → C → D(always 503). Every hop that retries makes up to 3 attempts.
// Run: node amplification.mjs

import http from 'node:http';

const ATTEMPTS = 3;
let dCalls = 0;

function listen(handler) {
  return new Promise((resolve) => {
    const s = http.createServer(handler).listen(0, '127.0.0.1', () => resolve(s));
  });
}

async function callWithRetries(url, attempts) {
  let last;
  for (let i = 0; i < attempts; i++) {
    const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
    await r.arrayBuffer();
    last = r.status;
    if (r.status < 500) return r.status;
  }
  return last;
}

async function chain(retryAt) {
  // retryAt: set of layer names that retry ('client','A','B','C'); others make 1 attempt.
  const servers = [];
  const d = await listen((req, res) => { dCalls++; res.writeHead(503).end(); });
  servers.push(d);
  let next = `http://127.0.0.1:${d.address().port}/`;
  for (const name of ['C', 'B', 'A']) {
    const target = next;
    const s = await listen(async (req, res) => {
      const st = await callWithRetries(target, retryAt.has(name) ? ATTEMPTS : 1);
      res.writeHead(st).end();
    });
    servers.push(s);
    next = `http://127.0.0.1:${s.address().port}/`;
  }
  dCalls = 0;
  const status = await callWithRetries(next, retryAt.has('client') ? ATTEMPTS : 1);
  for (const s of servers) s.close();
  return { status, dCalls };
}

const cases = [
  ['ретраї лише в клієнта', new Set(['client'])],
  ['клієнт + A', new Set(['client', 'A'])],
  ['клієнт + A + B', new Set(['client', 'A', 'B'])],
  ['кожен рівень (клієнт, A, B, C)', new Set(['client', 'A', 'B', 'C'])],
];
console.log(`node ${process.version}; ${ATTEMPTS} attempts per retrying hop; D always answers 503`);
console.log('retrying layers | calls reaching D for ONE user action | final status');
for (const [name, set] of cases) {
  const r = await chain(set);
  console.log(`${name} | ${r.dCalls} | ${r.status}`);
}
