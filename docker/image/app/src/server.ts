// Minimal HTTP service used to compare base images and Dockerfile variants.
// One production dependency (ms) so that `npm ci --omit=dev` has something to keep,
// and TypeScript as a dev dependency so that the build stage has something to drop.
import { createServer } from 'node:http';
import { availableParallelism } from 'node:os';
import ms from 'ms';

const port = Number(process.env.PORT ?? 3000);
const startedAt = Date.now();

const server = createServer((req, res) => {
  if (req.url === '/healthz') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, uptime: ms(Date.now() - startedAt) }));
    return;
  }
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(
    JSON.stringify({
      node: process.version,
      uid: process.getuid?.(),
      nodeEnv: process.env.NODE_ENV ?? null,
      cpus: availableParallelism(),
    }),
  );
});

server.listen(port, () => console.log(JSON.stringify({ msg: 'listening', port })));

// Graceful shutdown: stop accepting, let in-flight requests finish, then exit.
// The hard deadline is the orchestrator's stop timeout, not ours.
process.once('SIGTERM', () => {
  console.log(JSON.stringify({ msg: 'SIGTERM received, closing' }));
  server.close(() => process.exit(0));
});
