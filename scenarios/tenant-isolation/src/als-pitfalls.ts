// Where AsyncLocalStorage context is LOST or, worse, SWAPPED to another request.
// Run: node dist/als-pitfalls.js   (needs the database from `npm run setup` for case 3)
import { AsyncLocalStorage, AsyncResource } from 'node:async_hooks';
import { EventEmitter } from 'node:events';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { ADMIN_URL } from './config.js';

const als = new AsyncLocalStorage<{ tenant: number }>();
const tenant = () => als.getStore()?.tenant;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const show = (label: string, value: unknown) => console.log(`${label.padEnd(66)} ${JSON.stringify(value)}`);

// 1. A hand-rolled callback queue (old drivers, generic-pool style): the waiter's callback is
//    invoked from release(), i.e. in the RELEASER's context.
class CallbackQueue {
  private busy = false;
  private waiters: Array<() => void> = [];
  constructor(private readonly bind: boolean) {}
  acquire(cb: () => void) {
    if (!this.busy) { this.busy = true; return cb(); }
    this.waiters.push(this.bind ? AsyncResource.bind(cb) : cb);
  }
  release() { const next = this.waiters.shift(); if (next) next(); else this.busy = false; }
}
for (const bind of [false, true]) {
  const q = new CallbackQueue(bind);
  const seen: unknown[] = [];
  await Promise.all([1, 2].map((t) => als.run({ tenant: t }, () => new Promise<void>((done) => {
    q.acquire(async () => { await sleep(5); seen.push({ request: t, sawTenant: tenant() }); q.release(); done(); });
  }))));
  show(`1. callback queue${bind ? ' + AsyncResource.bind' : ''}`, seen);
}

// 2. EventEmitter: a listener registered by request 1 runs in the context of whoever emits.
for (const bind of [false, true]) {
  const bus = new EventEmitter();
  const seen: unknown[] = [];
  als.run({ tenant: 1 }, () => {
    const listener = () => seen.push({ registeredBy: 1, sawTenant: tenant() });
    bus.on('order', bind ? AsyncResource.bind(listener) : listener);
  });
  als.run({ tenant: 2 }, () => bus.emit('order'));
  show(`2. EventEmitter listener${bind ? ' + AsyncResource.bind' : ''}`, seen);
}

// 3. node-postgres pool with max 1: waiting for a connection held by another tenant.
{
  const pool = new pg.Pool({ connectionString: ADMIN_URL, max: 1 });
  const seen: unknown[] = [];
  await Promise.all([1, 2, 3].map((t) => als.run({ tenant: t }, async () => {
    const c = await pool.connect();
    seen.push({ request: t, afterConnect: tenant() });
    await c.query('SELECT pg_sleep(0.01)');
    c.release();
  })));
  show('3a. pg Pool promise API, queued checkout', seen);
  const seenCb: unknown[] = [];
  await Promise.all([1, 2, 3].map((t) => als.run({ tenant: t }, () => new Promise<void>((done) => {
    pool.query('SELECT pg_sleep(0.01)', (err) => { seenCb.push({ request: t, inCallback: tenant(), err: !!err }); done(); });
  }))));
  show('3b. pg Pool callback API, queued query', seenCb);
  await pool.end();
}

// 4. enterWith() between HTTP requests on the same keep-alive socket: Node 24 default vs legacy.
const child = (flags: string[]) => spawnSync(process.execPath, [...flags, new URL('./enterwith-child.js', import.meta.url).pathname], { encoding: 'utf8' }).stdout.trim();
show('4a. enterWith in handler, Node default (AsyncContextFrame)', JSON.parse(child([])));
show('4b. same with --no-async-context-frame (pre-24 behaviour)', JSON.parse(child(['--no-async-context-frame'])));
