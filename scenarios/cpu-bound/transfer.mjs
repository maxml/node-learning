// Cost of moving data to a worker: structured clone vs transfer vs SharedArrayBuffer.
// postMessage serialises on the SENDING thread, synchronously, so a big clone blocks the
// event loop of the API even though the computation itself runs in the worker.

import { Worker } from 'node:worker_threads';
import { once } from 'node:events';

const worker = new Worker(
  `const { parentPort } = require('node:worker_threads');
   parentPort.on('message', (m) => parentPort.postMessage(performance.timeOrigin + performance.now()));`,
  { eval: true },
);

async function measure(name, makePayload, transferList) {
  const payload = makePayload();
  const t0 = performance.timeOrigin + performance.now();
  worker.postMessage(payload, transferList?.(payload));
  const syncMs = performance.timeOrigin + performance.now() - t0; // time the sender's loop was blocked
  const [receivedAt] = await once(worker, 'message');
  console.log(JSON.stringify({ name, postMessageSyncMs: +syncMs.toFixed(1), deliveredMs: +(receivedAt - t0).toFixed(1) }));
}

const ROWS = 1_000_000;
await measure('1M plain objects {id, price, sku} (structured clone)', () => Array.from({ length: ROWS }, (_, i) => ({ id: i, price: i * 0.5, sku: `S${i}` })));
await measure('Float64Array 8M = 64 MB, copied (structured clone)', () => new Float64Array(8_000_000).fill(1));
await measure('Float64Array 8M = 64 MB, transferred (transferList)', () => new Float64Array(8_000_000).fill(1), (p) => [p.buffer]);
await measure('SharedArrayBuffer 64 MB (shared, not copied)', () => new Float64Array(new SharedArrayBuffer(8 * 8_000_000)).fill(1));
await worker.terminate();
