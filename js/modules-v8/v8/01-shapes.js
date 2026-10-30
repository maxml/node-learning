// Hidden classes (V8 "maps"): which operations keep objects on a shared shape and which do not.
// Uses V8 intrinsics, which are NOT a stable API: node --allow-natives-syntax 01-shapes.js
/* eslint-disable no-undef */
const same = (a, b) => %HaveSameMap(a, b);
const fast = (o) => %HasFastProperties(o);

// The lecture's example (Lection#6, slide 10): same constructor, extra fields added in different order.
function Point(x, y) { this.x = x; this.y = y; }
const p1 = new Point(1, 2); p1.a = 5; p1.b = 6;
const p2 = new Point(3, 4); p2.b = 7; p2.a = 8;
const p3 = new Point(5, 6); p3.a = 1; p3.b = 2;
console.log('Point x,y then a,b  vs  x,y then b,a  same map:', same(p1, p2));
console.log('Point x,y then a,b  vs  x,y then a,b  same map:', same(p1, p3));

// Literals: shape depends on property order, not on the set of names.
console.log('{x,y} vs {y,x} same map:', same({ x: 1, y: 2 }, { y: 2, x: 1 }));

// delete: in every variant tried on V8 13.6 (literal, built by assignment, constructor;
// first or last property) the object went to dictionary (slow) mode.
// Assigning undefined keeps the shape.
const d1 = { x: 1, y: 2, z: 3 }; delete d1.x;
const d2 = { x: 1, y: 2, z: 3 }; delete d2.z;
const d3 = { x: 1, y: 2, z: 3 }; d3.x = undefined;
console.log('delete first prop -> fast properties:', fast(d1));
console.log('delete last prop  -> fast properties:', fast(d2));
console.log('x = undefined     -> fast properties:', fast(d3), '| same map as {x,y,z}:', same(d3, { x: 0, y: 0, z: 0 }));

// Many distinct dynamic keys (a Map used as an object) also end in dictionary mode.
const bag = {};
for (let i = 0; i < 2000; i++) bag['k' + i] = i;
console.log('object with 2000 dynamic keys -> fast properties:', fast(bag));
