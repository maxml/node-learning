'use strict';
// Re-runs, unchanged in logic, snippets from the old course files that touch types,
// to show what they actually print. The originals are not modified.
// Run: node 06-old-examples-check.js

const log = (label, value) => console.log(label.padEnd(58), value);

console.log('--- practice/practice1.js ---');
log('typeof NaN', typeof NaN);
log("'' == 0", '' == 0);
log('undefined == false', undefined == false);
log("Number('123a')", Number('123a'));
log('4 > 3 > 2', 4 > 3 > 2);

console.log('\n--- practice/practice2.js exSwitch: string vs object cases ---');
const Ranges = { CHILD: { type: 'CHILD' }, BOYS: { type: 'BOYS' } };
const range = 'BOYS';
let branch;
switch (range) { // switch uses ===; a string is never === an object
  case Ranges.CHILD: branch = 'CHILD'; break;
  case Ranges.BOYS: branch = 'BOYS'; break;
  default: branch = 'default';
}
log("switch('BOYS') with object cases ->", branch);
log('new String(Ranges.CHILD).toLowerCase()', new String(Ranges.CHILD).toLowerCase());

console.log('\n--- practice/practice2.js exBubbleSort mergeArrays ---');
log('[6, 12, 16] + [4, 7, 18, 19]', JSON.stringify([6, 12, 16] + [4, 7, 18, 19]));

console.log('\n--- practice/practice2.js exArray3 validateObjectFields ---');
function validateObjectFields(input) {
  for (let index = 0; index < Object.keys(input).length; index++) {
    const element = Object.keys(input)[index];
    if (!input[element]) delete input[element];
  }
  return input;
}
log('{a:0, b:0, c:1} (deleting while re-reading keys)', JSON.stringify(validateObjectFields({ a: 0, b: 0, c: 1 })));

console.log('\n--- practice/practice2.js exChangeInForEach ---');
const arr = [{ key: 'value' }, 3];
arr.forEach((item) => { if (typeof item === 'object') item.key = 'value2'; else item = 4; });
log('object mutated, primitive slot unchanged', JSON.stringify(arr));

console.log('\n--- practice/practice3.js exObject for...in ---');
const user = { name: 12, hi() {} };
const types = [];
for (const field in user) types.push(typeof field);
log('typeof field in for...in (always string)', types.join(','));

console.log('\n--- practice/practice4.js sum(a)(b) ---');
function sum(a) {
  let currentSum = a;
  function f(state, b) { currentSum += b; return f; }
  f.toString = function () { return currentSum; };
  return f;
}
log('sum(1)(2).toString()   (comment says 3)', sum(1)(2).toString());
log('sum(0)(1)(2)(3)(4)(5).toString() (comment says 15)', sum(0)(1)(2)(3)(4)(5).toString());
function f() { return `${this.name}${this.surname}`; }
log('f.bind({name}).bind({surname})()', f.bind({ name: 'John' }).bind({ surname: 'Pete' })());
