// Dev service for the compose experiment. On start it talks to MongoDB and Redis
// once, by their compose service names, with NO retry: so if it starts before
// its dependencies are ready, it fails, which is what the experiment wants to see.
import net from 'node:net';
import http from 'node:http';
import ms from 'ms'; // the one npm dependency, to make the node_modules trap visible

const { MONGO_HOST = 'mongo', REDIS_HOST = 'redis', PORT = '3000', GREETING = 'hi' } = process.env;

function probe(host, port, payload) {
  return new Promise((resolve, reject) => {
    const s = net.connect({ host, port }, () => (payload ? s.write(payload) : (s.end(), resolve('connected'))));
    s.setTimeout(2000, () => s.destroy(new Error('timeout')));
    s.on('data', (d) => (s.end(), resolve(d.toString().trim())));
    s.on('error', reject);
  });
}

try {
  const redis = await probe(REDIS_HOST, 6379, 'PING\r\n');
  const mongo = await probe(MONGO_HOST, 27017);
  console.log(`deps ok: redis=${redis} mongo=${mongo} (uptime ${ms(Math.round(process.uptime() * 1000))})`);
} catch (e) {
  console.error(`deps FAILED at start: ${e.code ?? e.message}`);
  process.exit(1);
}

http
  .createServer((_req, res) => res.end(`${GREETING}\n`))
  .listen(Number(PORT), () => console.log(`listening on ${PORT}`));
process.once('SIGTERM', () => process.exit(0));
