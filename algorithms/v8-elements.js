// Claims from «Складність алгоритмів» (table «Що гарантує специфікація JS»):
//  - a sparse write (a[1e9] = 1) switches an array to dictionary elements (a hash table);
//  - `delete` on an object property switches it to dictionary-mode properties.
// Uses V8 intrinsics, so it must run with the flag (intrinsics are a debugging aid,
// not a stable API: names may change between V8 versions):
//   node --allow-natives-syntax v8-elements.js
const a = [1, 2, 3];
console.log(`node ${process.version}, V8 ${process.versions.v8}`);
console.log('dense array, dictionary elements?        ', %HasDictionaryElements(a));
a[1e9] = 1;
console.log('after a[1e9] = 1, dictionary elements?   ', %HasDictionaryElements(a));

const o = { a: 1, b: 2, c: 3 };
console.log('object literal, fast properties?         ', %HasFastProperties(o));
delete o.a;
console.log('after delete o.a, fast properties?       ', %HasFastProperties(o));
