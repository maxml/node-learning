'use strict';
// Reusable data structures for the experiments in this folder.
// Each one is small on purpose: it shows the invariant, not a production library.
// Run `node structures.js` to execute the self-tests at the bottom.

// Ring buffer (circular array) used as a FIFO queue.
// enqueue/dequeue are O(1) amortized: no element is ever moved on dequeue,
// only the head index advances modulo capacity. Grows by doubling when full.
class RingQueue {
  constructor(capacity = 16) {
    this.buf = new Array(capacity);
    this.head = 0; // index of the oldest element
    this.size = 0;
  }
  enqueue(value) {
    if (this.size === this.buf.length) this.#grow();
    this.buf[(this.head + this.size) % this.buf.length] = value;
    this.size++;
  }
  dequeue() {
    if (this.size === 0) return undefined;
    const value = this.buf[this.head];
    this.buf[this.head] = undefined; // drop the reference so GC can collect it
    this.head = (this.head + 1) % this.buf.length;
    this.size--;
    return value;
  }
  peek() {
    return this.size === 0 ? undefined : this.buf[this.head];
  }
  #grow() {
    const next = new Array(this.buf.length * 2);
    for (let i = 0; i < this.size; i++) next[i] = this.buf[(this.head + i) % this.buf.length];
    this.buf = next;
    this.head = 0;
  }
}

// Fixed-size ring of timestamps: sliding-window log for a rate limiter.
// Keeps the last `limit` request times; a request is allowed if the oldest of them
// is older than the window. O(1) per request, O(limit) memory per key.
class SlidingWindowLimiter {
  constructor(limit, windowMs) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.times = new Array(limit).fill(-Infinity);
    this.next = 0; // slot that holds the oldest timestamp
  }
  tryAcquire(now) {
    const oldest = this.times[this.next];
    if (now - oldest < this.windowMs) return false;
    this.times[this.next] = now;
    this.next = (this.next + 1) % this.limit;
    return true;
  }
}

// Binary min-heap over an array. Parent of i is (i-1)>>1, children 2i+1 and 2i+2.
// push/pop O(log n), peek O(1), heapify O(n).
class MinHeap {
  constructor(compare = (a, b) => a - b) {
    this.a = [];
    this.cmp = compare;
  }
  get size() {
    return this.a.length;
  }
  peek() {
    return this.a[0];
  }
  push(x) {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) >= 0) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    if (a.length === 0) return undefined;
    const top = a[0];
    const last = a.pop();
    if (a.length > 0) {
      a[0] = last;
      this.#siftDown(0);
    }
    return top;
  }
  #siftDown(i) {
    const a = this.a;
    const n = a.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < n && this.cmp(a[l], a[m]) < 0) m = l;
      if (r < n && this.cmp(a[r], a[m]) < 0) m = r;
      if (m === i) return;
      [a[i], a[m]] = [a[m], a[i]];
      i = m;
    }
  }
}

// LRU cache on top of Map: Map iterates keys in insertion order (ECMA-262),
// so "touch" = delete + set moves a key to the end, and the first key is the LRU one.
// get/set O(1) on average.
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }
  set(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.capacity) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }
}

// Trie (prefix tree): lookup by prefix is O(length of the key), independent of how many keys are stored.
class Trie {
  constructor() {
    this.root = { children: new Map(), end: false };
  }
  insert(word) {
    let node = this.root;
    for (const ch of word) {
      if (!node.children.has(ch)) node.children.set(ch, { children: new Map(), end: false });
      node = node.children.get(ch);
    }
    node.end = true;
  }
  #walk(prefix) {
    let node = this.root;
    for (const ch of prefix) {
      node = node.children.get(ch);
      if (!node) return null;
    }
    return node;
  }
  has(word) {
    const node = this.#walk(word);
    return node !== null && node.end;
  }
  withPrefix(prefix, limit = Infinity) {
    const start = this.#walk(prefix);
    const out = [];
    const stack = start ? [[start, prefix]] : [];
    while (stack.length && out.length < limit) {
      const [node, acc] = stack.pop();
      if (node.end) out.push(acc);
      const kids = [...node.children].sort((x, y) => (x[0] < y[0] ? 1 : -1));
      for (const [ch, child] of kids) stack.push([child, acc + ch]);
    }
    return out;
  }
}

module.exports = { RingQueue, SlidingWindowLimiter, MinHeap, LRUCache, Trie };

if (require.main === module) {
  const assert = require('node:assert/strict');

  const q = new RingQueue(2);
  for (let i = 0; i < 10; i++) q.enqueue(i);
  for (let i = 0; i < 5; i++) assert.equal(q.dequeue(), i);
  for (let i = 10; i < 20; i++) q.enqueue(i); // wraps around and grows
  for (let i = 5; i < 20; i++) assert.equal(q.dequeue(), i);
  assert.equal(q.dequeue(), undefined);

  const lim = new SlidingWindowLimiter(3, 1000);
  const decisions = [0, 10, 20, 30, 999, 1001, 1015].map((t) => lim.tryAcquire(t));
  assert.deepEqual(decisions, [true, true, true, false, false, true, true]);

  const h = new MinHeap();
  const xs = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 1e6));
  xs.forEach((x) => h.push(x));
  const out = [];
  while (h.size) out.push(h.pop());
  assert.deepEqual(out, [...xs].sort((a, b) => a - b));

  // Map.set on an existing key updates the value in place and does NOT move the key:
  // that is why LRUCache "touches" with delete + set.
  const m = new Map([['a', 1], ['b', 2]]);
  m.set('a', 10);
  assert.deepEqual([...m.keys()], ['a', 'b']);

  const lru = new LRUCache(2);
  lru.set('a', 1);
  lru.set('b', 2);
  lru.get('a'); // a becomes most recent
  lru.set('c', 3); // evicts b
  assert.deepEqual([...lru.map.keys()], ['a', 'c']);

  const t = new Trie();
  ['car', 'cart', 'care', 'cat', 'dog'].forEach((w) => t.insert(w));
  assert.equal(t.has('car'), true);
  assert.equal(t.has('ca'), false);
  assert.deepEqual(t.withPrefix('car'), ['car', 'care', 'cart']);

  console.log('structures.js: all self-tests passed');
}
