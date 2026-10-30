// Is the current lodash merge / defaultsDeep / set still pollutable? (run after `npm i` in this dir)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const lodash = require('lodash');
const old = require('lodash-4.17.4');
console.log('node', process.version, 'lodash', lodash.VERSION, 'old', old.VERSION);

const cases = {
  proto: '{"__proto__":{"polluted":"yes"}}',
  ctor: '{"constructor":{"prototype":{"polluted":"yes"}}}',
};
for (const [name, lib] of [['current', lodash], ['4.17.4', old]]) {
  for (const [c, json] of Object.entries(cases)) {
    for (const fn of ['merge', 'defaultsDeep']) {
      try { lib[fn]({}, JSON.parse(json)); } catch (e) { console.log(name, fn, c, 'threw', e.message); }
      console.log(`${name.padEnd(8)} ${fn.padEnd(13)} ${c.padEnd(6)} ({}).polluted =`, ({}).polluted);
      delete Object.prototype.polluted;
    }
  }
  for (const path of ['__proto__.polluted', 'constructor.prototype.polluted']) {
    lib.set({}, path, 'yes');
    console.log(`${name.padEnd(8)} set(${path}) ({}).polluted =`, ({}).polluted);
    delete Object.prototype.polluted;
  }
}

// standalone per-method package, still widely depended on
const merge = require('lodash.merge');
console.log('lodash.merge', require('lodash.merge/package.json').version);
for (const [c, json] of Object.entries(cases)) {
  merge({}, JSON.parse(json));
  console.log(`lodash.merge pkg ${c.padEnd(6)} ({}).polluted =`, ({}).polluted);
  delete Object.prototype.polluted;
}
