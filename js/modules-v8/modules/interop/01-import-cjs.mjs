// ESM importing CommonJS: default = module.exports; named exports only where the static lexer
// can see them (cjs-module-lexer; since Node 25.6.1 its C++ port "merve"). Run: node 01-import-cjs.mjs
import * as viaExports from './lib-exports.cjs';
import * as viaLiteral from './lib-literal.cjs';
import * as viaDynamic from './lib-dynamic.cjs';

const keys = (ns) => Object.keys(ns).join(', ');
console.log('exports.x = ...        ->', keys(viaExports));
console.log('module.exports = {a,b} ->', keys(viaLiteral));
console.log('module.exports = f()   ->', keys(viaDynamic), '| default has:', Object.keys(viaDynamic.default).join(', '));

try {
  await import('./02-named-missing.mjs');
} catch (e) {
  console.log('import { epsilon } from lib-dynamic.cjs ->', e.constructor.name + ':', e.message.split('\n')[0]);
}
