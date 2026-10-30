// Byte-for-byte copy of ../counter.cjs at another path: what npm does when two
// dependencies need incompatible versions of the same package (two node_modules copies).
let count = 0;
module.exports = {
  instanceId: Math.random().toString(36).slice(2, 8),
  inc: () => ++count,
};
