// Child for als-pitfalls case 4: does a request see the store a PREVIOUS request entered with enterWith()?
import { AsyncLocalStorage } from 'node:async_hooks';
import http from 'node:http';

const als = new AsyncLocalStorage<{ tenant: string }>();
const server = http.createServer((req, res) => {
  const before = als.getStore()?.tenant ?? null;           // what this request sees before entering
  als.enterWith({ tenant: String(req.headers['x-tenant']) });
  res.end(JSON.stringify(before));
});
server.listen(0, '127.0.0.1', async () => {
  const { port } = server.address() as { port: number };
  const agent = new http.Agent({ keepAlive: true, maxSockets: 1 });      // same socket for both
  const get = (t: string) => new Promise<string>((resolve) => {
    http.get({ port, host: '127.0.0.1', agent, headers: { 'x-tenant': t } }, (res) => {
      let b = ''; res.on('data', (d) => (b += d)); res.on('end', () => resolve(JSON.parse(b)));
    });
  });
  const first = await get('A');
  const second = await get('B');
  console.log(JSON.stringify({ requestA_sawBefore: first, requestB_sawBefore: second }));
  agent.destroy();
  server.close();
});
