// Object.freeze(Object.prototype): blocks pollution, but triggers the "override mistake".
'use strict';
console.log('node', process.version);
Object.freeze(Object.prototype);

const target = {};
try { Object.prototype.isAdmin = true; } catch (e) { console.log('set Object.prototype.isAdmin ->', e.constructor.name, e.message); }
console.log('({}).isAdmin', ({}).isAdmin);

// Override mistake: assigning an own property that shadows a frozen inherited one throws in strict mode
function Point() {}
const p = new Point();
try { p.toString = () => 'point'; console.log('p.toString assigned'); }
catch (e) { console.log('p.toString = ... ->', e.constructor.name, e.message); }
// defineProperty still works
Object.defineProperty(p, 'toString', { value: () => 'point', writable: true, configurable: true });
console.log('defineProperty toString ->', String(p));
// constructor.prototype path for non-Object prototypes is NOT covered
const arr = [];
arr.constructor.prototype.polluted = 'yes';
console.log('Array.prototype still writable: [].polluted =', [].polluted);
