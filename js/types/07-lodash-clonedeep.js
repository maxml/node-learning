'use strict';
// lodash cloneDeep vs structuredClone: what each keeps and drops.
// Run: npm ci && node 07-lodash-clonedeep.js

const _ = require('lodash');
const log = (label, value) => console.log(label.padEnd(48), value);

class User {
  constructor(name) { this.name = name; }
  greet() { return `hi ${this.name}`; }
}
const sym = Symbol('k');
const src = {
  user: new User('ann'),
  when: new Date(0),
  map: new Map([['a', 1]]),
  fn() { return 1; },
  [sym]: 'symbol-keyed',
};
src.self = src;

const lc = _.cloneDeep(src);
log('lodash: cycle kept (lc.self === lc)', lc.self === lc);
log('lodash: prototype kept (instanceof User)', lc.user instanceof User);
log('lodash: Date and Map kept', lc.when instanceof Date && lc.map instanceof Map);
log('lodash: function property', typeof lc.fn === 'function' ? `same function: ${lc.fn === src.fn}` : typeof lc.fn);
log('lodash: symbol-keyed property', lc[sym]);
log('lodash: _.cloneDeep(fn) top-level', JSON.stringify(_.cloneDeep(() => 1)));

const plain = { user: new User('ann'), [sym]: 'symbol-keyed' };
const sc = structuredClone(plain);
log('structuredClone: prototype kept', sc.user instanceof User);
log('structuredClone: symbol-keyed property', sc[sym]);
