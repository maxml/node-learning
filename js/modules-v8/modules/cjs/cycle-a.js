exports.done = false;
exports.name = 'a';
const b = require('./cycle-b');          // b starts, requires a, gets a's PARTIAL exports
console.log('in a: b.done =', b.done);
exports.done = true;
