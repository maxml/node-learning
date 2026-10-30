// Consistent hashing experiment: how many keys move when N -> N+1 (and when a middle
// node is removed), and how evenly keys spread, for mod-N, a ring without and with
// virtual nodes, rendezvous (HRW), jump consistent hash and Maglev.
// Also: key balance != load balance under a Zipf access pattern (hot keys).
// Model, not a production measurement. Run: node hashing.js
import { performance } from 'node:perf_hooks';

const KEYS = Number(process.env.KEYS ?? 1_000_000);
const N = Number(process.env.N ?? 10);

// ---------- hashes ----------
function murmur3(str, seed = 0) {
  let h = seed >>> 0;
  let i = 0;
  const len = str.length;
  for (; i + 4 <= len; i += 4) {
    let k = (str.charCodeAt(i) & 0xff) | ((str.charCodeAt(i + 1) & 0xff) << 8) |
      ((str.charCodeAt(i + 2) & 0xff) << 16) | ((str.charCodeAt(i + 3) & 0xff) << 24);
    k = Math.imul(k, 0xcc9e2d51); k = (k << 15) | (k >>> 17); k = Math.imul(k, 0x1b873593);
    h ^= k; h = (h << 13) | (h >>> 19); h = (Math.imul(h, 5) + 0xe6546b64) | 0;
  }
  let k = 0;
  switch (len & 3) {
    case 3: k ^= (str.charCodeAt(i + 2) & 0xff) << 16; // fallthrough
    case 2: k ^= (str.charCodeAt(i + 1) & 0xff) << 8; // fallthrough
    case 1: k ^= str.charCodeAt(i) & 0xff;
      k = Math.imul(k, 0xcc9e2d51); k = (k << 15) | (k >>> 17); k = Math.imul(k, 0x1b873593); h ^= k;
  }
  h ^= len;
  return fmix32(h);
}
function fmix32(h) {
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}

const keys = Array.from({ length: KEYS }, (_, i) => `user:${i}`);
const kh = new Uint32Array(KEYS);
const kh2 = new Uint32Array(KEYS);
for (let i = 0; i < KEYS; i++) { kh[i] = murmur3(keys[i], 1); kh2[i] = murmur3(keys[i], 2); }
const nodeName = (j, tag = 'node') => `${tag}-${j}`;

// ---------- schemes: build(nodes:string[]) -> (keyIndex) => node position in nodes[] ----------
const modN = (nodes) => (i) => kh[i] % nodes.length;

function ring(vnodes) {
  return (nodes) => {
    const pts = [];
    nodes.forEach((n, j) => { for (let v = 0; v < vnodes; v++) pts.push([murmur3(`${n}#${v}`, 7), j]); });
    pts.sort((a, b) => a[0] - b[0]);
    const pos = new Uint32Array(pts.map((p) => p[0]));
    const own = pts.map((p) => p[1]);
    return (i) => {
      const h = kh[i];
      let lo = 0, hi = pos.length; // first point >= h (clockwise successor), wrap around
      while (lo < hi) { const mid = (lo + hi) >>> 1; if (pos[mid] < h) lo = mid + 1; else hi = mid; }
      return own[lo === pos.length ? 0 : lo];
    };
  };
}

const rendezvous = (nodes) => {
  const nh = nodes.map((n) => murmur3(n, 11));
  return (i) => {
    let best = -1, arg = 0; const h = kh[i];
    for (let j = 0; j < nh.length; j++) { const s = fmix32((h ^ nh[j]) + 0x9e3779b9); if (s > best) { best = s; arg = j; } }
    return arg;
  };
};

// Lamping & Veach 2014, Fig. 1 (64-bit LCG), BigInt arithmetic.
const M64 = (1n << 64n) - 1n;
const key64 = new Array(KEYS);
for (let i = 0; i < KEYS; i++) key64[i] = (BigInt(kh[i]) << 32n) | BigInt(kh2[i]);
function jumpHash(key, buckets) {
  let b = -1n, j = 0n; const n = BigInt(buckets);
  while (j < n) {
    b = j;
    key = (key * 2862933555777941757n + 1n) & M64;
    j = BigInt(Math.floor((Number(b) + 1) * (2 ** 31 / Number((key >> 33n) + 1n))));
  }
  return Number(b);
}
const jump = (nodes) => (i) => jumpHash(key64[i], nodes.length);

// Maglev (Eisenbud et al., NSDI 2016, Pseudocode 1), table size M prime.
function maglev(M = 65537) {
  return (nodes) => {
    const off = nodes.map((n) => murmur3(n, 21) % M);
    const skip = nodes.map((n) => (murmur3(n, 22) % (M - 1)) + 1);
    const next = new Array(nodes.length).fill(0);
    const table = new Int32Array(M).fill(-1);
    let filled = 0;
    while (true) {
      for (let j = 0; j < nodes.length; j++) {
        let c = (off[j] + next[j] * skip[j]) % M;
        while (table[c] >= 0) { next[j]++; c = (off[j] + next[j] * skip[j]) % M; }
        table[c] = j; next[j]++; filled++;
        if (filled === M) return (i) => table[kh[i] % M];
      }
    }
  };
}

// ---------- measurements ----------
function assign(build, nodes) {
  const f = build(nodes);
  const out = new Array(KEYS);
  for (let i = 0; i < KEYS; i++) out[i] = nodes[f(i)];
  return out;
}
function spread(a, nodes) {
  const c = new Map(nodes.map((n) => [n, 0]));
  for (const n of a) c.set(n, c.get(n) + 1);
  const v = [...c.values()]; const mean = KEYS / nodes.length;
  return { max: Math.max(...v) / mean, min: Math.min(...v) / mean };
}
function moved(a, b) { let m = 0; for (let i = 0; i < KEYS; i++) if (a[i] !== b[i]) m++; return m / KEYS; }
// keys that moved between two OLD nodes (not to the newcomer): 0 for a "monotone" scheme
function shuffled(a, b, newcomer) { let m = 0; for (let i = 0; i < KEYS; i++) if (a[i] !== b[i] && b[i] !== newcomer) m++; return m / KEYS; }
const pct = (x) => (100 * x).toFixed(2) + '%';
const r2 = (x) => x.toFixed(2);

const schemes = [
  ['mod N', modN],
  ['ring, 1 point/node', ring(1)],
  ['ring, 10 vnodes', ring(10)],
  ['ring, 100 vnodes', ring(100)],
  ['ring, 1000 vnodes', ring(1000)],
  ['rendezvous (HRW)', rendezvous],
  ['jump hash', jump],
  ['Maglev, M=65537', maglev(65537)],
];

const nodesN = Array.from({ length: N }, (_, j) => nodeName(j));
const nodesN1 = [...nodesN, nodeName(N)];
// remove a node from the middle: names stay, positions shift for position-based schemes
const removed = nodesN.filter((_, j) => j !== 3);

console.log(`# Consistent hashing: ${KEYS.toLocaleString('en')} keys, N=${N} -> ${N + 1}; ideal moved fraction 1/(N+1) = ${pct(1 / (N + 1))}`);
console.log('\n| scheme | moved N->N+1 | of them between old nodes | max/mean (N) | min/mean (N) | moved after removing node-3 | ms |');
console.log('| --- | --- | --- | --- | --- | --- | --- |');
for (const [name, build] of schemes) {
  const t0 = performance.now();
  const a = assign(build, nodesN);
  const b = assign(build, nodesN1);
  let rm = pct(moved(a, assign(build, removed)));
  // jump hash has no node names: buckets are 0..N-1, so dropping node-3 means renumbering
  if (name === 'jump hash') rm = `n/a (renumbering: ${rm})`;
  const s = spread(a, nodesN);
  console.log(`| ${name} | ${pct(moved(a, b))} | ${pct(shuffled(a, b, nodeName(N)))} | ${r2(s.max)} | ${r2(s.min)} | ${rm} | ${(performance.now() - t0).toFixed(0)} |`);
}

// ring without vnodes: spread over 20 different node-name sets
{
  const rows = [];
  for (const v of [1, 10, 100, 1000]) {
    const maxes = [];
    for (let s = 0; s < 20; s++) {
      const ns = Array.from({ length: N }, (_, j) => nodeName(j, `set${s}`));
      maxes.push(spread(assign(ring(v), ns), ns).max);
    }
    maxes.sort((x, y) => x - y);
    rows.push(`| ${v} | ${r2(maxes[10])} | ${r2(maxes[19])} |`);
  }
  console.log(`\n## Ring: max/mean over 20 random node sets (N=${N})\n\n| vnodes per node | median max/mean | worst max/mean |\n| --- | --- | --- |\n${rows.join('\n')}`);
}

// hot keys: Zipf(s) popularity, keys perfectly balanced by count, requests are not
{
  console.log(`\n## Key balance vs load balance (ring, 1000 vnodes, N=${N}), Zipf popularity`);
  console.log('\n| Zipf s | share of top key | max/mean keys | max/mean requests |\n| --- | --- | --- | --- |');
  const a = assign(ring(1000), nodesN);
  for (const s of [0.0, 0.8, 1.0, 1.2]) {
    const w = new Float64Array(KEYS); let H = 0;
    for (let i = 0; i < KEYS; i++) { w[i] = 1 / Math.pow(i + 1, s); H += w[i]; }
    const load = new Map(nodesN.map((n) => [n, 0]));
    for (let i = 0; i < KEYS; i++) load.set(a[i], load.get(a[i]) + w[i] / H);
    const mx = Math.max(...load.values()) * N;
    console.log(`| ${s} | ${pct(w[0] / H)} | ${r2(spread(a, nodesN).max)} | ${r2(mx)} |`);
  }
}
