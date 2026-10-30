// ESM cycle: no "partial exports object". The binding exists from link time but a const/let/class
// is in TDZ until its declaration runs; a function declaration is usable immediately.
// Run: node 02-cycle.mjs
import './cycle-a.mjs';
import { readALater } from './cycle-b.mjs';
console.log('after evaluation, readALater() =', readALater());
