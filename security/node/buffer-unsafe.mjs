// Buffer.allocUnsafe returns uninitialised memory: it may contain earlier data.
// Small allocUnsafe (< Buffer.poolSize / 2) slice a shared pool; poolSize is printed (differs v22 vs v24).
// 64 KiB is above poolSize/2 on both, so these are separate allocations.
console.log('node', process.version, 'Buffer.poolSize', Buffer.poolSize);
const secret = 'SECRET-TOKEN-';
let leaked = 0, nonzero = 0;
for (let i = 0; i < 2000; i++) {
  const a = Buffer.allocUnsafe(1024); a.fill(secret);   // write and drop
  const b = Buffer.allocUnsafe(64 * 1024);              // outside the pool, fresh malloc
  if (b.includes('SECRET-TOKEN')) leaked++;
  if (b.some((x) => x !== 0)) nonzero++;
}
console.log(`allocUnsafe(64 KiB) x2000: contained old secret ${leaked}, non-zero ${nonzero}`);
const z = Buffer.alloc(64 * 1024);
console.log('Buffer.alloc(64 KiB) all zero:', z.every((x) => x === 0));
