// Distributed rate limiting on Valkey/Redis: non-atomic patterns vs Lua scripts.
// Needs a Valkey on 127.0.0.1:6390 (see README). Run: node ratelimit-redis.mjs
//
// 10 connections play 10 app instances; each sends its share of requests concurrently.

import Redis from 'ioredis';
import { createRequire } from 'node:module';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import { setTimeout as delay } from 'node:timers/promises';

const require = createRequire(import.meta.url);
const PORT = Number(process.env.VALKEY_PORT ?? 6390);
const INSTANCES = 10;
const conns = Array.from({ length: INSTANCES }, () => new Redis({ port: PORT, lazyConnect: false }));
const admin = conns[0];
await admin.flushall();
const info = await admin.info('server');
const version = /valkey_version:(\S+)/.exec(info)?.[1] ?? /redis_version:(\S+)/.exec(info)[1];
console.log(`node ${process.version}, valkey ${version}, ioredis ${require('ioredis/package.json').version}, `
  + `rate-limiter-flexible ${require('rate-limiter-flexible/package.json').version}; ${INSTANCES} connections`);

// Fire `total` requests spread over the instances, all at once.
async function burst(total, fn) {
  const jobs = [];
  for (let i = 0; i < total; i++) jobs.push(fn(conns[i % INSTANCES], i));
  return (await Promise.all(jobs)).filter(Boolean).length;
}

// ---------------------------------------------------------------- 1. counter: GET + SET vs INCR vs Lua
const LIMIT = 100, REQUESTS = 500;

const getSet = async (c) => {
  const n = Number((await c.get('rl:getset')) ?? 0);
  if (n >= LIMIT) return false;
  await c.set('rl:getset', n + 1, 'EX', 60);
  return true;
};
const incrThenExpire = async (c) => {
  const n = await c.incr('rl:incr');
  if (n === 1) await c.expire('rl:incr', 60); // second round trip: not atomic with INCR
  return n <= LIMIT;
};
const FIXED_WINDOW_LUA = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
return n`;
const luaFixed = async (c) => (await c.eval(FIXED_WINDOW_LUA, 1, 'rl:lua', 60000)) <= LIMIT;

console.log(`\n1. fixed-window counter, limit ${LIMIT}, ${REQUESTS} concurrent requests`);
console.log(`   GET + SET (read-modify-write): accepted ${await burst(REQUESTS, getSet)}`);
console.log(`   INCR, then EXPIRE if first:    accepted ${await burst(REQUESTS, incrThenExpire)}, TTL ${await admin.ttl('rl:incr')}`);
console.log(`   Lua INCR+PEXPIRE:              accepted ${await burst(REQUESTS, luaFixed)}, TTL ${await admin.ttl('rl:lua')}`);

// ---------------------------------------------------------------- 2. the instance dies between INCR and EXPIRE
{
  const victim = new Redis({ port: PORT });
  await victim.incr('rl:orphan');
  victim.disconnect(); // crash before EXPIRE
  await delay(100);
  console.log(`\n2. instance dies between INCR and EXPIRE: TTL of key = ${await admin.ttl('rl:orphan')} `
    + '(-1 = never expires: this user stays limited until someone deletes the key)');
}

// ---------------------------------------------------------------- 3. EXPIRE on every request
{
  // Bug: refreshing the TTL on every hit turns "10 per 1 s" into "10 until you stop for 1 s".
  let accepted = 0;
  for (let i = 0; i < 30; i++) { // 5 requests/s for 6 s: half the limit
    const n = await admin.incr('rl:refresh');
    await admin.pexpire('rl:refresh', 1000);
    if (n <= 10) accepted++;
    await delay(200);
  }
  console.log(`\n3. EXPIRE on every request, limit 10/s, client at 5/s for 6 s: accepted ${accepted} of 30 `
    + '(a correct limiter accepts all 30)');
}

// ---------------------------------------------------------------- 4. token bucket: app-side vs Lua
const CAP = 100;
const appBucket = async (c) => {
  const [tokens, ts] = await c.hmget('tb:app', 'tokens', 'ts');
  const now = Date.now();
  const t = tokens === null ? CAP : Math.min(CAP, Number(tokens) + ((now - Number(ts)) / 1000) * 10);
  if (t < 1) return false;
  await c.hset('tb:app', 'tokens', t - 1, 'ts', now);
  return true;
};
const TOKEN_BUCKET_LUA = `
local cap, rate, now = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local s = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local tokens = tonumber(s[1]) or cap
local ts = tonumber(s[2]) or now
tokens = math.min(cap, tokens + (now - ts) / 1000 * rate)
local ok = 0
if tokens >= 1 then tokens = tokens - 1; ok = 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(cap / rate * 1000))
return ok`;
// Server time instead of client clocks would be TIME inside the script; we pass the app clock
// here to keep the script identical in structure to the app-side version.
const luaBucket = async (c) => (await c.eval(TOKEN_BUCKET_LUA, 1, 'tb:lua', CAP, 10, Date.now())) === 1;
console.log(`\n4. token bucket capacity ${CAP} (10/s refill), ${REQUESTS} concurrent requests`);
console.log(`   app-side HMGET + HSET: accepted ${await burst(REQUESTS, appBucket)}`);
console.log(`   Lua script:            accepted ${await burst(REQUESTS, luaBucket)}`);

// ---------------------------------------------------------------- 5. rate-limiter-flexible
{
  const rl = new RateLimiterRedis({ storeClient: admin, keyPrefix: 'rlflx', points: LIMIT, duration: 60 });
  const ok = await burst(REQUESTS, async () => rl.consume('user-1').then(() => true, () => false));
  console.log(`\n5. rate-limiter-flexible RateLimiterRedis (Lua inside), limit ${LIMIT}: accepted ${ok} of ${REQUESTS}`);

  // Its window is fixed and starts at the key's first request: the edge burst is still there.
  const rl2 = new RateLimiterRedis({ storeClient: admin, keyPrefix: 'rlflx2', points: 10, duration: 1 });
  const t0 = Date.now();
  const times = [];
  const hit = async () => { try { await rl2.consume('u'); times.push(Date.now() - t0); } catch {} };
  await hit(); // opens the window
  await delay(950);
  await Promise.all(Array.from({ length: 9 }, hit));
  await delay(Math.max(0, 1010 - (Date.now() - t0)));
  await Promise.all(Array.from({ length: 10 }, hit));
  const span = times[times.length - 1] - times[1];
  console.log(`   edge burst, limit 10/1 s: accepted ${times.length}, of them ${times.length - 1} within ${span} ms`);
}

// ---------------------------------------------------------------- 6. store down: fail-open vs fail-closed
{
  const dead = new Redis({ port: 6399, lazyConnect: true, maxRetriesPerRequest: 0, enableOfflineQueue: false });
  const closed = new RateLimiterRedis({ storeClient: dead, points: 10, duration: 1, rejectIfRedisNotReady: true });
  const open = new RateLimiterRedis({
    storeClient: dead, points: 10, duration: 1, rejectIfRedisNotReady: true,
    insuranceLimiter: new (require('rate-limiter-flexible').RateLimiterMemory)({ points: 5, duration: 1 }),
  });
  const res = async (rl) => rl.consume('k').then(() => 'allowed', (e) => (e instanceof Error ? `error: ${e.message}` : 'limited'));
  console.log('\n6. store unreachable');
  console.log(`   no insurance:                         ${await res(closed)}  (caller decides fail-open or fail-closed)`);
  const r = []; for (let i = 0; i < 8; i++) r.push(await res(open));
  console.log(`   insuranceLimiter (in-memory, 5/s):    ${r.join(', ')}`);
  dead.disconnect();
}

for (const c of conns) c.disconnect();
