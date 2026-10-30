// V8 engine detail, not language semantics: elements kinds of an array.
// Run: node --allow-natives-syntax coll-02-elements-kinds.js
// %Has*Elements are V8 internal test helpers; they may change between V8 versions.
const kind = (a) => [
  %HasSmiElements(a) && 'SMI',
  %HasDoubleElements(a) && 'DOUBLE',
  %HasObjectElements(a) && 'ELEMENTS',
  %HasHoleyElements(a) ? 'HOLEY' : 'PACKED',
].filter(Boolean).join(' ');

const a = [1, 2, 3];
console.log('[1,2,3]                ', kind(a));
a.push(4.5);
console.log('push(4.5)              ', kind(a));
a[3] = 4;
console.log('overwrite 4.5 with 4   ', kind(a), '(no way back)');
a.push('x');
console.log("push('x')              ", kind(a));
const h = [1, 2, 3];
h[10] = 4;
console.log('[1,2,3]; h[10] = 4     ', kind(h));
h.length = 3;
console.log('length = 3 again       ', kind(h), '(stays holey)');
console.log('new Array(3)           ', kind(new Array(3)));
console.log('Array.from({length:3}) ', kind(Array.from({ length: 3 }, () => 0)));
console.log('V8', process.versions.v8);
