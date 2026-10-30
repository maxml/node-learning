// A leak in a GC language = memory that stays REACHABLE although the program no longer needs it.
// Three classic roots: a listener on a long-lived emitter, an unbounded Map cache, an uncleared interval.
// Each "request" allocates a 100 KB payload; we serve 2000 requests per scenario and measure
// heapUsed after a forced full GC. Run: node --expose-gc 03-leaks.js
const { EventEmitter } = require('node:events');
const v8 = require('node:v8');

if (typeof gc !== 'function') { console.error('run with --expose-gc'); process.exit(1); }
const REQUESTS = 2000;
const mb = (n) => (n / 2 ** 20).toFixed(1).padStart(6) + ' MB';
const heapAfterGc = () => { gc(); gc(); return process.memoryUsage().heapUsed; };
const payload = () => ({ rows: new Array(100 * 1024 / 8).fill(1.5) }); // ~100 KB of doubles

const bus = new EventEmitter();   // lives as long as the process (like an app-wide event bus)
bus.setMaxListeners(0);           // silence MaxListenersExceededWarning: it is the canary we turn off
const cache = new Map();          // module-level cache without bounds
const timers = [];

const scenarios = {
  'listener leak (on, never off)': (i) => {
    const data = payload();
    bus.on('config-changed', () => data.rows.length); // closure captures data -> bus -> data
  },
  'listener fixed (once/off)': (i) => {
    const data = payload();
    const onChange = () => data.rows.length;
    bus.on('config-changed', onChange);
    bus.off('config-changed', onChange);             // request done -> listener removed
  },
  'Map cache keyed by request id': (i) => {
    cache.set('req-' + i, payload());                 // id never reused -> grows forever
  },
  'WeakMap keyed by request object': (i) => {
    const req = { id: i };
    weak.set(req, payload());                         // entry dies with req
  },
  'setInterval never cleared': (i) => {
    const data = payload();
    timers.push(setInterval(() => data.rows.length, 60_000).unref());
  },
};
const weak = new WeakMap();

const base = heapAfterGc();
console.log(`node ${process.version}, heap_size_limit ${mb(v8.getHeapStatistics().heap_size_limit)}`);
console.log(`baseline heapUsed ${mb(base)}; each scenario: ${REQUESTS} requests x ~100 KB`);
for (const [name, run] of Object.entries(scenarios)) {
  const before = heapAfterGc();
  for (let i = 0; i < REQUESTS; i++) run(i);
  const after = heapAfterGc();
  console.log(`${name.padEnd(34)} retained ${mb(after - before)}`);
}
console.log('listeners still on bus:', bus.listenerCount('config-changed'), '| cache size:', cache.size);

// Releasing the roots makes the memory collectable again: the "leak" was reachability, not lost memory.
bus.removeAllListeners();
cache.clear();
timers.forEach(clearInterval);
console.log(`after removing listeners, clearing cache and intervals: heapUsed ${mb(heapAfterGc())} (baseline ${mb(base)})`);
