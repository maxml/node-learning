// BullMQ worker: a separate process (in production a separate ECS service scaled on backlog),
// so the calculation never shares an event loop with the API.

import { Worker } from 'bullmq';
import { countPrimes } from './work.mjs';

const connection = { host: '127.0.0.1', port: Number(process.env.REDIS_PORT ?? 6391) };
const worker = new Worker('heavy', async (job) => countPrimes(job.data.from, job.data.to), {
  connection,
  concurrency: 1, // one CPU job per process: concurrency > 1 does not add CPU to one event loop
});
worker.on('ready', () => console.log(JSON.stringify({ ready: true })));
process.on('SIGTERM', async () => { await worker.close(); process.exit(0); });
