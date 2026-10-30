// CommonJS cycle: the second module gets the first one's exports object as it is at that
// moment (partial). Holding the object sees later writes; destructuring freezes the partial state.
// Same mechanism as examples/ex_require/cycle/, plus the destructuring trap.
// Run: node 02-cycle.js
require('./cycle-a');
const b = require('./cycle-b');
console.log('after both finished:', b.readLater());
