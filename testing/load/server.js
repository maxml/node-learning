'use strict';
// A fast endpoint (~sub-ms) with ONE injected hiccup: STALL_AT ms after the first
// request the event loop is blocked for STALL_MS (think: a GC pause, a sync JSON.parse
// of a huge body, a slow DNS lookup on the hot path).
const http = require('node:http');

const PORT = Number(process.env.PORT ?? 3999);
const STALL_AT = Number(process.env.STALL_AT ?? 5000);
const STALL_MS = Number(process.env.STALL_MS ?? 1000);

let first = 0;
let served = 0;
let stalled = false;

const server = http.createServer((req, res) => {
  const now = Date.now();
  if (!first) first = now;
  if (!stalled && now - first >= STALL_AT) {
    stalled = true;
    const until = now + STALL_MS;
    while (Date.now() < until) { /* block the event loop */ }
  }
  served += 1;
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('ok');
});

server.keepAliveTimeout = 65_000;
server.listen(PORT, '127.0.0.1', () => console.log(JSON.stringify({ listening: PORT, STALL_AT, STALL_MS })));
process.on('SIGTERM', () => { console.log(JSON.stringify({ served, stalled })); server.close(); process.exit(0); });
