// 1) Zalgo: an API that calls back sometimes sync, sometimes async.
const cache = new Map();
function getUser(id, cb) {
  if (cache.has(id)) return cb(cache.get(id)); // sync path: Zalgo
  setTimeout(() => { cache.set(id, { id }); cb(cache.get(id)); }, 1);
}
function getUserSafe(id, cb) {
  if (cache.has(id)) return queueMicrotask(() => cb(cache.get(id))); // always async
  setTimeout(() => { cache.set(id, { id }); cb(cache.get(id)); }, 1);
}
function caller(api, label) {
  return new Promise((done) => {
    const log = [];
    api(1, () => { log.push('callback'); });
    log.push('after call');
    setTimeout(() => { console.log(label.padEnd(22), log.join(' -> ')); done(); }, 5);
  });
}
await caller(getUser, 'Zalgo, cold cache:');
await caller(getUser, 'Zalgo, warm cache:');
await caller(getUserSafe, 'safe, warm cache:');

// 2) Executor semantics: first settle wins, a throw after resolve is ignored.
const p1 = new Promise((resolve, reject) => {
  resolve('first');
  reject(new Error('ignored'));
  throw new Error('also ignored');
});
console.log('executor:', await p1);
const p2 = new Promise(() => { throw new Error('boom'); });
console.log('throw in executor ->', await p2.catch((e) => `rejected: ${e.message}`));

// 3) try/catch around `return p` does not see the rejection; `return await p` does.
const fail = () => Promise.reject(new Error('db down'));
async function withoutAwait() { try { return fail(); } catch { return 'caught'; } }
async function withAwait() { try { return await fail(); } catch { return 'caught'; } }
console.log('return p       ->', await withoutAwait().catch((e) => `escaped: ${e.message}`));
console.log('return await p ->', await withAwait());

// 4) finally: passes the value through, its return value is ignored, a throw replaces the result.
console.log('finally pass-through ->', await Promise.resolve(1).finally(() => 2));
console.log('finally throw ->', await Promise.resolve(1).finally(() => { throw new Error('cleanup failed'); }).catch((e) => e.message));

// 5) catch recovers the chain: the next then runs with the catch's return value.
const r = await Promise.reject(new Error('x')).catch(() => 'recovered').then((v) => `then got ${v}`);
console.log('catch recovers ->', r);

// 6) then(onOk, onErr) does not catch errors thrown by onOk; then(onOk).catch(onErr) does.
const a = await Promise.resolve().then(() => { throw new Error('in onOk'); }, () => 'onErr saw it').catch((e) => `outer catch: ${e.message}`);
console.log('then(ok, err) ->', a);

// 7) try/catch around a callback-based timer does not catch the callback's throw.
process.once('uncaughtException', (e) => console.log('uncaughtException:', e.message));
try { setTimeout(() => { throw new Error('thrown later'); }, 0); } catch { console.log('never printed'); }
await new Promise((r) => setTimeout(r, 10));

// 8) forEach(async ...) does not wait.
const seen = [];
[1, 2, 3].forEach(async (x) => { await null; seen.push(x); });
console.log('after forEach(async):', JSON.stringify(seen));
await null; await null;
console.log('two ticks later:', JSON.stringify(seen));
