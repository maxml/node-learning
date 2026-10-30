'use strict';
// Claims from «Сортування і пошук»:
//  1. lowerBound (first index with a[i] >= x) on a half-open interval [lo, hi) is correct;
//     the classic off-by-one variants are not. Checked against a linear scan.
//  2. BFS gives shortest paths in edges for an unweighted graph; DFS does not.
//  3. Dijkstra with a binary heap gives correct weighted shortest paths (checked against
//     Bellman-Ford) and fails with a negative edge.
//  4. Top-k with a size-k heap is O(n log k) and beats a full sort for k << n.
const assert = require('node:assert/strict');
const { MinHeap } = require('./structures');

console.log(`node ${process.version}, V8 ${process.versions.v8}`);

// ---------- 1. Binary search ----------
function lowerBound(a, x) {
  let lo = 0;
  let hi = a.length; // half-open [lo, hi): hi is never a valid answer candidate to read
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1); // no (lo+hi) overflow in fixed-width languages
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo; // in [0, a.length]; a.length means "all elements < x"
}

// Buggy variant 1: closed interval but `hi = mid` -> infinite loop when lo == hi - 1 and a[mid] >= x... guarded by an iteration cap.
function buggyClosed(a, x) {
  let lo = 0;
  let hi = a.length - 1;
  let guard = 0;
  while (lo <= hi) {
    if (++guard > 1000) return 'INFINITE LOOP';
    const mid = (lo + hi) >> 1;
    if (a[mid] < x) lo = mid + 1;
    else hi = mid; // should be mid - 1 with a closed interval
  }
  return lo;
}

// Buggy variant 2: `mid = (lo + hi) >> 1` with indices above 2^30: >> works on int32.
function midSigned(lo, hi) {
  return (lo + hi) >> 1;
}

function linearLowerBound(a, x) {
  let i = 0;
  while (i < a.length && a[i] < x) i++;
  return i;
}

{
  let checks = 0;
  for (let t = 0; t < 20_000; t++) {
    const n = Math.floor(Math.random() * 20);
    const a = Array.from({ length: n }, () => Math.floor(Math.random() * 10)).sort((p, q) => p - q);
    const x = Math.floor(Math.random() * 12) - 1;
    assert.equal(lowerBound(a, x), linearLowerBound(a, x));
    checks++;
  }
  console.log(`\n1) lowerBound matches linear scan on ${checks} random cases (with duplicates, empty arrays, out-of-range x)`);
  console.log('   closed interval with hi = mid on [1,2,3], x=2 ->', buggyClosed([1, 2, 3], 2));
  const lo = 2 ** 30;
  const hi = 2 ** 31 - 2;
  console.log(`   lo=2^30, hi=2^31-2: (lo + hi) >> 1 = ${midSigned(lo, hi)}; (lo + hi) >>> 1 = ${(lo + hi) >>> 1}; lo + ((hi - lo) >> 1) = ${lo + ((hi - lo) >> 1)}`);
}

// ---------- 2. BFS vs DFS ----------
// Graph as adjacency list: Map<vertex, vertex[]>. O(V + E) memory, O(deg) neighbour scan.
function bfs(adj, start) {
  const dist = new Map([[start, 0]]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const v = queue[head]; // index-based head: no O(n) shift
    for (const w of adj.get(v) ?? []) {
      if (!dist.has(w)) {
        dist.set(w, dist.get(v) + 1);
        queue.push(w);
      }
    }
  }
  return dist;
}
function dfsDepth(adj, start) {
  // iterative DFS with an explicit stack: no recursion depth limit.
  // A vertex is marked when it is popped (visited), as in recursive DFS, and its depth is
  // the length of the path along which DFS first reached it (the DFS tree), not the shortest one.
  const depth = new Map();
  const stack = [[start, 0]];
  while (stack.length) {
    const [v, d] = stack.pop();
    if (depth.has(v)) continue;
    depth.set(v, d);
    const ns = adj.get(v) ?? [];
    for (let i = ns.length - 1; i >= 0; i--) if (!depth.has(ns[i])) stack.push([ns[i], d + 1]); // reverse: visit in listed order
  }
  return depth;
}
{
  // A -> B -> C -> D and a shortcut A -> D
  const adj = new Map([
    ['A', ['D', 'B']],
    ['B', ['C']],
    ['C', ['D']],
    ['D', []],
  ]);
  console.log('\n2) path length to D: BFS =', bfs(adj, 'A').get('D'), ', DFS tree depth =', dfsDepth(adj, 'A').get('D'));
  const adj2 = new Map([
    ['A', ['B', 'D']],
    ['B', ['C']],
    ['C', ['D']],
    ['D', []],
  ]);
  console.log('   same graph, neighbours listed in another order: BFS =', bfs(adj2, 'A').get('D'), ', DFS tree depth =', dfsDepth(adj2, 'A').get('D'));

  // a 1M-vertex chain: iterative DFS is fine, recursive DFS overflows the stack
  const n = 1_000_000;
  const chain = new Map();
  for (let i = 0; i < n; i++) chain.set(i, i + 1 < n ? [i + 1] : []);
  console.log('   iterative DFS on a 1M-vertex chain, depth of last vertex =', dfsDepth(chain, 0).get(n - 1));
  const seen = new Set();
  const rec = (v) => {
    seen.add(v);
    for (const w of chain.get(v)) if (!seen.has(w)) rec(w);
  };
  try {
    rec(0);
    console.log('   recursive DFS: finished');
  } catch (e) {
    console.log(`   recursive DFS: ${e.constructor.name}: ${e.message} after ${seen.size} vertices`);
  }
}

// ---------- 3. Dijkstra ----------
function dijkstra(n, edges, src) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) adj[u].push([v, w]);
  const dist = new Array(n).fill(Infinity);
  dist[src] = 0;
  const heap = new MinHeap((a, b) => a[0] - b[0]);
  heap.push([0, src]);
  while (heap.size) {
    const [d, u] = heap.pop();
    if (d > dist[u]) continue; // stale entry: lazy deletion instead of decrease-key
    for (const [v, w] of adj[u]) {
      if (d + w < dist[v]) {
        dist[v] = d + w;
        heap.push([dist[v], v]);
      }
    }
  }
  return dist;
}
// Textbook Dijkstra (CLRS): a vertex is final once extracted and is never revisited.
function dijkstraSettled(n, edges, src) {
  const adj = Array.from({ length: n }, () => []);
  for (const [u, v, w] of edges) adj[u].push([v, w]);
  const dist = new Array(n).fill(Infinity);
  const done = new Array(n).fill(false);
  dist[src] = 0;
  const heap = new MinHeap((a, b) => a[0] - b[0]);
  heap.push([0, src]);
  while (heap.size) {
    const [, u] = heap.pop();
    if (done[u]) continue;
    done[u] = true;
    for (const [v, w] of adj[u]) {
      if (!done[v] && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        heap.push([dist[v], v]);
      } else if (done[v] && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w; // improvement found too late: v's successors are not updated
      }
    }
  }
  return dist;
}
function bellmanFord(n, edges, src) {
  const dist = new Array(n).fill(Infinity);
  dist[src] = 0;
  for (let i = 0; i < n - 1; i++) {
    for (const [u, v, w] of edges) if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;
  }
  return dist;
}
{
  for (let t = 0; t < 300; t++) {
    const n = 2 + Math.floor(Math.random() * 30);
    const edges = [];
    for (let k = 0; k < n * 3; k++) {
      edges.push([Math.floor(Math.random() * n), Math.floor(Math.random() * n), Math.floor(Math.random() * 20)]);
    }
    const bf = bellmanFord(n, edges, 0);
    assert.deepEqual(dijkstra(n, edges, 0), bf);
    assert.deepEqual(dijkstraSettled(n, edges, 0), bf);
  }
  console.log("\n3) Dijkstra (both variants) == Bellman-Ford on 300 random graphs with non-negative weights");
  // negative edge: 0->1 (1), 0->2 (5), 2->1 (-10). True dist[1] = -5.
  // Make 1 settle before 2 and give 1 an outgoing edge, so the late improvement is not propagated.
  const neg = [
    [0, 1, 1],
    [0, 2, 5],
    [2, 1, -10],
    [1, 3, 1],
  ];
  console.log('   negative edge, textbook Dijkstra:', JSON.stringify(dijkstraSettled(4, neg, 0)), 'Bellman-Ford:', JSON.stringify(bellmanFord(4, neg, 0)));
  console.log('   negative edge, lazy-deletion variant (re-inserts vertices):', JSON.stringify(dijkstra(4, neg, 0)), '(correct here only because it stops being Dijkstra: vertices are re-processed)');
}

// ---------- 4. Top-k ----------
function topKHeap(xs, k) {
  const h = new MinHeap(); // min-heap of the k largest seen so far; root = smallest of them
  for (const x of xs) {
    if (h.size < k) h.push(x);
    else if (x > h.peek()) {
      h.pop();
      h.push(x);
    }
  }
  const out = [];
  while (h.size) out.push(h.pop());
  return out.reverse();
}
{
  const n = 2_000_000;
  const k = 10;
  const xs = Array.from({ length: n }, () => Math.random());
  topKHeap(xs.slice(0, 1000), k); // warm-up
  let t0 = process.hrtime.bigint();
  const a = topKHeap(xs, k);
  const heapMs = Number(process.hrtime.bigint() - t0) / 1e6;
  t0 = process.hrtime.bigint();
  const b = [...xs].sort((p, q) => q - p).slice(0, k);
  const sortMs = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.deepEqual(a, b);
  console.log(`\n4) top-${k} of ${n}: heap ${heapMs.toFixed(0)} ms, full sort ${sortMs.toFixed(0)} ms (same result)`);
}
