// Three internal "microservices" in one process, each on its own port.
//   customers (A) ~20 ms, inventory (B) ~30 ms, loyalty (C) ~200 ms.
// Admin API on ADMIN_PORT:
//   POST /slow?svc=C&ms=20000  -> service C now answers after 20 s
//   GET  /stats                -> arrivals per service (every attempt counts), in-flight now
//   POST /reset                -> zero the counters
// A request whose client went away is still "worked on" until its timer fires,
// which is what a real slow dependency does unless it listens to 'close'.

import http from 'node:http';

const BASE = Number(process.env.BASE_PORT ?? 4101);
const ADMIN_PORT = Number(process.env.ADMIN_PORT ?? 4100);

const svc = {
  A: { name: 'customers', delay: 20, port: BASE, arrivals: 0, inflight: 0, maxInflight: 0 },
  B: { name: 'inventory', delay: 30, port: BASE + 1, arrivals: 0, inflight: 0, maxInflight: 0 },
  C: { name: 'loyalty', delay: 200, port: BASE + 2, arrivals: 0, inflight: 0, maxInflight: 0 },
};

for (const [key, s] of Object.entries(svc)) {
  const server = http.createServer((req, res) => {
    s.arrivals++;
    s.inflight++;
    s.maxInflight = Math.max(s.maxInflight, s.inflight);
    const delay = s.delay * (0.9 + Math.random() * 0.2); // ±10% jitter
    setTimeout(() => {
      s.inflight--;
      if (res.destroyed) return; // caller gave up; the work was done anyway
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ svc: key, data: 'x'.repeat(200) }));
    }, delay);
  });
  server.keepAliveTimeout = 65_000;
  server.listen(s.port, '127.0.0.1');
}

http
  .createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'POST' && u.pathname === '/slow') {
      svc[u.searchParams.get('svc')].delay = Number(u.searchParams.get('ms'));
    } else if (req.method === 'POST' && u.pathname === '/reset') {
      for (const s of Object.values(svc)) { s.arrivals = 0; s.maxInflight = s.inflight; }
    }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(Object.fromEntries(Object.entries(svc).map(([k, s]) => [k, {
      delay: s.delay, arrivals: s.arrivals, inflight: s.inflight, maxInflight: s.maxInflight,
    }]))));
  })
  .listen(ADMIN_PORT, '127.0.0.1', () => console.log(JSON.stringify({ ready: true })));
