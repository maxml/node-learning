import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { setTimeout as delay, setImmediate as immediate } from 'node:timers/promises';
import { writeFile } from 'node:fs/promises';
import WebSocket, { WebSocketServer } from 'ws';
import { Server as SocketIOServer } from 'socket.io';
import { io } from 'socket.io-client';

// Demo identity, not an authentication implementation. No real credentials.
const ORIGIN = 'https://app.example.test';
const DEMO_AUTH = 'Bearer research-demo';
const output = [];
const rows = [];
function log(name, result) {
  rows.push({ name, ...result });
  const line = `${name} ${JSON.stringify(result)}`;
  output.push(line);
  console.log(line);
}
const watchdog = setTimeout(() => {
  console.error('Experiment exceeded 20 seconds');
  process.exit(1);
}, 20_000);

async function connect(url, options = {}) {
  const ws = new WebSocket(url, options);
  ws.on('error', () => {}); // Expected protocol failures are collected server-side.
  await once(ws, 'open');
  return ws;
}
async function finish(ws, code = 1000) {
  if (ws.readyState === WebSocket.CLOSED) return;
  const closed = once(ws, 'close');
  ws.close(code);
  await closed;
}
async function fixture(options = {}) {
  const server = http.createServer((_req, res) => res.end('HTTP'));
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 1024,
    maxFragments: 8,
    maxBufferedChunks: 64,
    perMessageDeflate: false,
    ...options,
  });
  const errors = [];
  const requests = [];
  const peers = [];
  const sockets = new Set();
  let httpRequests = 0;
  let draining = false;
  server.on('request', () => httpRequests++);
  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.once('close', () => sockets.delete(socket));
  });
  server.on('upgrade', (req, socket, head) => {
    socket.on('error', () => {});
    requests.push({ origin: req.headers.origin ?? null });
    const status = draining ? 503
      : req.url !== '/ws' ? 404
      : req.headers.origin && req.headers.origin !== ORIGIN ? 403
      : req.headers.origin && req.headers.authorization !== DEMO_AUTH ? 401 : 0;
    if (status) {
      socket.end(`HTTP/1.1 ${status} Rejected\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
      return;
    }
    // Absent Origin accepted for this localhost experiment ONLY.
    wss.handleUpgrade(req, socket, head, (peer) => wss.emit('connection', peer, req));
  });
  wss.on('connection', (peer) => {
    peers.push(peer);
    peer.on('error', (error) => errors.push(error.code));
    peer.on('message', (data, isBinary) => {
      if (peer.readyState === WebSocket.OPEN) {
        peer.send(data, { binary: isBinary }, (error) => {
          if (error) errors.push(error.code ?? error.message);
        });
      }
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return {
    server, wss, errors, peers, requests,
    url: `ws://127.0.0.1:${server.address().port}/ws`,
    get httpRequests() { return httpRequests; },
    setDraining() { draining = true; },
    async dispose() {
      for (const peer of wss.clients) peer.terminate();
      for (const socket of sockets) socket.destroy();
      await Promise.all([
        new Promise((resolve) => wss.close(resolve)),
        new Promise((resolve) => server.close(resolve)),
      ]);
    },
  };
}

async function usingFixture(options, fn) {
  const f = await fixture(options);
  try { await fn(f); } finally { await f.dispose(); }
}

async function rejected(url, options) {
  const ws = new WebSocket(url, options);
  return new Promise((resolve, reject) => {
    ws.on('error', () => {});
    ws.once('open', () => { ws.terminate(); reject(new Error('unexpected open')); });
    ws.once('unexpected-response', (_req, res) => {
      const status = res.statusCode;
      res.resume();
      ws.terminate();
      resolve(status);
    });
  });
}

async function main() {
  log('versions', {
    node: process.version,
    ws: (await import('ws/package.json', { with: { type: 'json' } })).default.version,
    socketio: (await import('socket.io/package.json', { with: { type: 'json' } })).default.version,
    date: new Date().toISOString(),
  });
  await usingFixture({}, async (f) => {
    const native = new globalThis.WebSocket(f.url);
    await once(native, 'open');
    const message = once(native, 'message');
    native.send('native-echo');
    assert.equal((await message)[0].data, 'native-echo');
    const closed = once(native, 'close');
    native.close();
    await closed;
    assert.equal(f.requests[0].origin, null);
    const ws = await connect(f.url);
    const binary = once(ws, 'message');
    ws.send(Buffer.from([0, 1, 255]));
    const [data, isBinary] = await binary;
    assert.deepEqual([...data], [0, 1, 255]);
    assert.equal(isBinary, true);
    await finish(ws);
    log('native-and-binary', { nativeEcho: true, nativeOrigin: null, binary: [...data], upgradeHttpHandlers: f.httpRequests });
    assert.equal(f.httpRequests, 0);
    const badOrigin = await rejected(f.url, { origin: 'https://evil.example.test', headers: { authorization: DEMO_AUTH } });
    const noAuth = await rejected(f.url, { origin: ORIGIN });
    assert.equal(badOrigin, 403);
    assert.equal(noAuth, 401);
    const authenticated = await connect(f.url, { origin: ORIGIN, headers: { authorization: DEMO_AUTH } });
    await finish(authenticated);
    f.setDraining();
    const drain = await rejected(f.url, { origin: ORIGIN, headers: { authorization: DEMO_AUTH } });
    assert.equal(drain, 503);
    log('upgrade-policy', { badOrigin, noAuth, authenticated: true, draining: drain });
  });
  await usingFixture({}, async (f) => {
    const ws = await connect(f.url);
    const msg = once(ws, 'message');
    ws.send('hel', { fin: false });
    ws.send('lo', { fin: true });
    const [bytes, binary] = await msg;
    assert.equal(bytes.toString(), 'hello');
    assert.equal(binary, false);
    await finish(ws);
    const large = await connect(f.url);
    const closed = once(large, 'close');
    large.send('x'.repeat(600), { fin: false });
    large.send('x'.repeat(600), { fin: true });
    const [code] = await closed;
    assert.equal(code, 1009);
    assert(f.errors.includes('WS_ERR_UNSUPPORTED_MESSAGE_LENGTH'));
    log('message-limit', { fragmentsReassembled: bytes.toString(), aggregateBytes: 1200, maxPayload: 1024, closeCode: code, serverError: f.errors.at(-1) });
  });
  await usingFixture({ maxFragments: 2 }, async (f) => {
    const ws = await connect(f.url);
    const closed = once(ws, 'close');
    ws.send('a', { fin: false });
    ws.send('b', { fin: false });
    ws.send('c', { fin: true });
    const [code] = await closed;
    assert(f.errors.includes('WS_ERR_TOO_MANY_BUFFERED_PARTS'));
    log('fragment-limit', { totalBytes: 3, maxPayload: 1024, maxFragments: 2, closeCode: code, serverError: f.errors.at(-1) });
  });
  await usingFixture({}, async (f) => {
    const good = await connect(f.url);
    const silent = await connect(f.url, { autoPong: false });
    const silentClosed = once(silent, 'close');
    const peerGood = f.peers[0];
    const peerSilent = f.peers[1];
    const pong = once(peerGood, 'pong');
    let silentPongs = 0;
    peerSilent.on('pong', () => silentPongs++);
    peerGood.ping();
    peerSilent.ping();
    await pong;
    // A bounded test deadline, not a production heartbeat recommendation.
    await delay(100);
    assert.equal(silentPongs, 0);
    peerSilent.terminate();
    assert.equal((await silentClosed)[0], 1006);
    assert.equal(good.readyState, WebSocket.OPEN);
    log('heartbeat', { automaticPong: true, silentPongs, terminatedClientCode: 1006, goodStillOpen: true });
    await finish(good);
  });
  await usingFixture({ maxPayload: 128 * 1024 }, async (f) => {
    const ws = await connect(f.url);
    ws.pause();
    let delivered = 0;
    ws.on('message', () => delivered++);
    const peer = f.peers[0];
    await new Promise((resolve, reject) => peer.send('queued-but-not-consumed', (error) => error ? reject(error) : resolve()));
    assert.equal(delivered, 0);
    const callbackDelivered = delivered;
    const limit = 1024 * 1024;
    const payload = Buffer.alloc(64 * 1024);
    let writes = 0;
    // Explicit cap: do not let this demonstration become an OOM test.
    while (writes < 256 && peer.bufferedAmount + payload.length <= limit) {
      peer.send(payload, (error) => { if (error) f.errors.push(error.code ?? error.message); });
      writes++;
      await immediate();
    }
    assert(writes < 256, 'OS did not backpressure within the bounded demonstration');
    assert(peer.bufferedAmount > 0);
    log('slow-consumer', { callbackApplicationMessages: callbackDelivered, writes, bufferedAmount: peer.bufferedAmount, budget: limit, nextSendRejected: true });
    const closed = once(ws, 'close');
    ws.resume();
    peer.close(1008, 'slow consumer');
    const [code] = await closed;
    assert.equal(code, 1008);
  });
  await usingFixture({}, async (f) => {
    const ws = await connect(f.url);
    const httpClosed = new Promise((resolve) => f.server.close(resolve));
    f.server.closeAllConnections();
    const echo = once(ws, 'message');
    ws.send('still-open');
    assert.equal((await echo)[0].toString(), 'still-open');
    const closed = once(ws, 'close');
    f.peers[0].close(1001, 'deploy');
    assert.equal((await closed)[0], 1001);
    await httpClosed;
    log('shutdown', { afterHttpCloseAll: 'still-open', explicitWebSocketClose: 1001 });
  });
  await usingFixture({}, async (f) => {
    const ws = await connect(f.url);
    ws.pause(); // Peer will not read our Close frame.
    const serverClosed = once(f.peers[0], 'close');
    f.peers[0].close(1001, 'deploy');
    await delay(50);
    const forceRequired = f.peers[0].readyState !== WebSocket.CLOSED;
    assert(forceRequired);
    f.peers[0].terminate();
    await serverClosed;
    ws.resume();
    await finish(ws);
    log('shutdown-deadline', { closeHandshakePending: forceRequired, forced: true });
  });
  const server = http.createServer();
  const sio = new SocketIOServer(server, { serveClient: false });
  sio.on('connection', (socket) => socket.on('echo', (data, ack) => ack(data)));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  let raw;
  let client;
  try {
    raw = new globalThis.WebSocket(origin.replace('http:', 'ws:') + '/socket.io/?EIO=4&transport=websocket');
    const first = once(raw, 'message');
    await once(raw, 'open');
    const packet = (await first)[0].data;
    assert.equal(packet[0], '0');
    const engine = JSON.parse(packet.slice(1));
    assert(engine.sid);
    client = io(origin, { transports: ['websocket'], reconnection: false, forceNew: true, timeout: 2000 });
    await once(client, 'connect');
    const ack = await client.timeout(1000).emitWithAck('echo', 'application-echo');
    assert.equal(ack, 'application-echo');
    log('socketio', { rawWebSocketFirstPacket: '0{...Engine.IO handshake...}', plainApplicationEcho: false, socketioAck: ack });
  } finally {
    if (raw) {
      const closed = once(raw, 'close');
      raw.close();
      await closed;
    }
    client?.disconnect();
    await new Promise((resolve) => sio.close(resolve));
  }
  log('result', { passed: true, cases: rows.length - 1 });
  await writeFile(new URL('output.txt', import.meta.url), output.join('\n') + '\n');
  await writeFile(new URL('results.json', import.meta.url), JSON.stringify(rows, null, 2) + '\n');
}

try { await main(); } finally { clearTimeout(watchdog); }
