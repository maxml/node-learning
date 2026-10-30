// CommonJS requiring ES modules (require(esm)). Run: node 03-require-esm.cjs
console.log('process.features.require_module:', process.features.require_module);

const ns = require('./esm-plain.mjs');
console.log('require(esm) returns the namespace:', Object.keys(ns), '| default():', ns.default());

const Client = require('./esm-module-exports.mjs');
console.log('"module.exports" export name     :', typeof Client, new Client('x').url);

try {
  require('./esm-tla.mjs');
} catch (e) {
  console.log('require(esm with TLA)            :', e.code);
}
import('./esm-tla.mjs').then((m) => console.log('import() of the same module      :', m.config));
