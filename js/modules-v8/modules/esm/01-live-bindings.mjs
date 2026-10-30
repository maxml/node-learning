// ESM live bindings: an imported name is a read-only view of the exporter's variable,
// not a copy. Run: node 01-live-bindings.mjs
import { count, inc } from './counter.mjs';
import * as ns from './counter.mjs';

console.log('before inc:', count);
inc();
inc();
console.log('after inc :', count, '(the importer sees the exporter\'s variable)');

try {
  // eslint-disable-next-line no-import-assign
  count = 10;
} catch (e) {
  console.log('assign to import:', e.constructor.name, '-', e.message);
}
// The namespace object is sealed but not frozen: its properties report writable:true, yet [[Set]] always fails.
console.log('namespace sealed/frozen:', Object.isSealed(ns), Object.isFrozen(ns),
  '| descriptor of count:', JSON.stringify(Object.getOwnPropertyDescriptor(ns, 'count')));
try { ns.count = 5; } catch (e) { console.log('ns.count = 5 ->', e.constructor.name); }
console.log('this at module top level:', this);
console.log('typeof require/module/__dirname:', typeof require, typeof module, typeof __dirname);
console.log('import.meta.dirname ends with:', import.meta.dirname.split('/').slice(-2).join('/'));
console.log('strict by default (function this):', (function () { return this; })());
