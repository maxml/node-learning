// Cancellation with AbortSignal, Promise.withResolvers, util.promisify, sequential vs parallel awaits.
import { setTimeout as sleep } from 'node:timers/promises';
import { promisify } from 'node:util';
import { readFile } from 'node:fs';

const why = (e) => `${e.name}${e.code ? ' ' + e.code : ''}: ${e.message}${e.cause ? ` (cause: ${e.cause.name})` : ''}`;

// 1) signal.reason is TimeoutError for AbortSignal.timeout, AbortError for a manual abort.
//    node:timers/promises wraps it: rejects with AbortError and puts the reason into `cause`.
//    signal.throwIfAborted() throws the reason itself.
const dead = AbortSignal.timeout(1);
await sleep(5);
try { dead.throwIfAborted(); } catch (e) { console.log('throwIfAborted ->', why(e)); }
try { await sleep(1000, null, { signal: AbortSignal.timeout(20) }); } catch (e) { console.log('timeout signal ->', why(e)); }
const ac = new AbortController();
setTimeout(() => ac.abort(), 10);
try { await sleep(1000, null, { signal: ac.signal }); } catch (e) { console.log('manual abort   ->', why(e), '| reason:', ac.signal.reason.name); }

// 2) AbortSignal.any: first of (user cancel, deadline) wins.
const user = new AbortController();
const combined = AbortSignal.any([user.signal, AbortSignal.timeout(30)]);
try { await sleep(1000, null, { signal: combined }); } catch (e) { console.log('any(user, 30ms) ->', why(e), '| combined.reason:', combined.reason.name); }

// 3) A signal cancels nothing by itself: work that ignores it keeps running.
let ticks = 0;
async function ignoresSignal(signal) { for (let i = 0; i < 5; i++) { await sleep(10); ticks++; } return 'done anyway'; }
async function honoursSignal(signal) {
  for (let i = 0; i < 5; i++) { signal.throwIfAborted(); await sleep(10, null, { signal }); ticks++; }
  return 'done';
}
ticks = 0;
const s1 = AbortSignal.timeout(15);
console.log('ignores signal  ->', await ignoresSignal(s1), `(steps=${ticks}, aborted=${s1.aborted})`);
ticks = 0;
console.log('honours signal  ->', await honoursSignal(AbortSignal.timeout(15)).catch(why), `(steps=${ticks})`);

// 4) Promise.withResolvers: resolve from outside, e.g. bridging an event.
const { promise, resolve } = Promise.withResolvers();
setTimeout(() => resolve('resolved from outside'), 5);
console.log('withResolvers   ->', await promise);

// 5) promisify: (err, value) callback -> promise; custom symbol for setTimeout.
const readFileP = promisify(readFile);
console.log('promisify(readFile) ->', (await readFileP(new URL(import.meta.url), 'utf8')).split('\n')[0].slice(0, 40) + '…');
console.log('promisify(setTimeout) uses custom:', promisify(setTimeout) === setTimeout[promisify.custom]);

// 6) Sequential vs parallel awaits.
const job = (ms) => sleep(ms);
let t = Date.now();
for (const ms of [50, 50, 50]) await job(ms);
console.log('await in loop:', Date.now() - t, 'ms');
t = Date.now();
await Promise.all([50, 50, 50].map(job));
console.log('Promise.all  :', Date.now() - t, 'ms');
t = Date.now();
const a = job(50), b = job(50); // started together, awaited one by one
await a; await b;
console.log('start then await:', Date.now() - t, 'ms');
