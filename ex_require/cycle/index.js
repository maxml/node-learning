console.log('main starting');
const a = require('./first');
const b = require('./second');

console.log('in main, a.done = %j, b.done = %j', a.done, b.done);

// console.log(require('../module').rand)
