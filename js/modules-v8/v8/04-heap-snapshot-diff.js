// Finding a leak the way DevTools "Comparison" view does: two heap snapshots, diff object counts
// per constructor. Snapshots go to the OS temp dir and are deleted afterwards.
// Run: node 04-heap-snapshot-diff.js
const v8 = require('node:v8');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');

// Count heap nodes by name (constructor name for objects) from a .heapsnapshot (JSON) file.
function countByConstructor(file) {
  const snap = JSON.parse(fs.readFileSync(file, 'utf8'));
  const { node_fields: fields, node_types: [types] } = snap.snapshot.meta;
  const F = fields.length;
  const typeIdx = fields.indexOf('type');
  const nameIdx = fields.indexOf('name');
  const sizeIdx = fields.indexOf('self_size');
  const counts = new Map();
  for (let i = 0; i < snap.nodes.length; i += F) {
    if (types[snap.nodes[i + typeIdx]] !== 'object') continue;
    const name = snap.strings[snap.nodes[i + nameIdx]];
    const c = counts.get(name) ?? { count: 0, size: 0 };
    c.count += 1;
    c.size += snap.nodes[i + sizeIdx];
    counts.set(name, c);
  }
  return counts;
}

class RequestContext { constructor(id) { this.id = id; this.body = 'x'.repeat(1024) + id; } }
const bus = new EventEmitter();
bus.setMaxListeners(0);
function handleRequest(id) {
  const ctx = new RequestContext(id);
  bus.on('shutdown', () => ctx.id); // the leak: listener never removed
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'heap-'));
for (let i = 0; i < 100; i++) handleRequest(i);  // warm-up so one-off allocations are in snapshot 1
const before = v8.writeHeapSnapshot(path.join(dir, '1.heapsnapshot'));
for (let i = 100; i < 5100; i++) handleRequest(i);
const after = v8.writeHeapSnapshot(path.join(dir, '2.heapsnapshot'));

const a = countByConstructor(before);
const b = countByConstructor(after);
const growth = [...b].map(([name, { count, size }]) => ({
  name, delta: count - (a.get(name)?.count ?? 0), size: size - (a.get(name)?.size ?? 0),
})).filter((r) => r.delta > 0).sort((x, y) => y.delta - x.delta).slice(0, 5);
console.log('top growth between snapshots (5000 requests in between):');
for (const r of growth) console.log(`  ${r.name.padEnd(20)} +${String(r.delta).padStart(6)} objects  +${(r.size / 1024).toFixed(0)} KiB self size`);
console.log('snapshot file sizes:', [before, after].map((f) => (fs.statSync(f).size / 2 ** 20).toFixed(1) + ' MB').join(', '));
fs.rmSync(dir, { recursive: true });
