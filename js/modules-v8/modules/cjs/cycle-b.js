// Two ways to receive a's exports while a is still half-evaluated:
const aObj = require('./cycle-a');       // keeps the object: later reads see later writes
const { done, name } = require('./cycle-a'); // copies values NOW: frozen at the partial state
console.log('in b: a.done =', aObj.done, '| destructured done =', done, '| name =', name);
exports.done = true;
exports.readLater = () => ({ viaObject: aObj.done, viaDestructured: done });
