// Factcheck addition: ws closes a peer that never answers Close by itself after
// `closeTimeout` (default 30000 ms in ws 8.22.0). Loopback only, ~31 s run.
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import WebSocket, { WebSocketServer } from 'ws';

async function trial({ pause, closeTimeout }) {
  const server = http.createServer();
  const wss = new WebSocketServer({ server, perMessageDeflate: false, ...(closeTimeout ? { closeTimeout } : {}) });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const accepted = once(wss, 'connection');
  const ws = new WebSocket(`ws://127.0.0.1:${server.address().port}`);
  ws.on('error', () => {});
  await once(ws, 'open');
  const [peer] = await accepted;
  if (pause) ws.pause(); // the peer never reads our Close frame
  const started = Date.now();
  const closed = once(peer, 'close');
  peer.close(1001, 'deploy');
  const [code] = await closed;
  const ms = Date.now() - started;
  ws.terminate();
  await new Promise((resolve) => wss.close(resolve));
  await new Promise((resolve) => server.close(resolve));
  return { pause, closeTimeout: closeTimeout ?? 'default', serverCloseCode: code, ms };
}

const cooperative = await trial({ pause: false });
assert.equal(cooperative.serverCloseCode, 1001);
console.log('cooperative', JSON.stringify(cooperative));

const short = await trial({ pause: true, closeTimeout: 300 });
assert.equal(short.serverCloseCode, 1006);
assert(short.ms >= 300 && short.ms < 1000);
console.log('closeTimeout-300', JSON.stringify(short));

const byDefault = await trial({ pause: true });
assert.equal(byDefault.serverCloseCode, 1006);
assert(byDefault.ms >= 30_000 && byDefault.ms < 31_000);
console.log('closeTimeout-default', JSON.stringify(byDefault));
