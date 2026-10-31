// Claims of the dev.to article "Back to the basics: Primitive and Object types in Javascript"
// (Rafael Leitão, 2021-03-29), each checked by running it.
// Sloppy mode on purpose: the article's snippets are sloppy scripts. Strict cases use inner functions.
// Run: node 10-article-claims.js

const log = (label, value) => console.log(label.padEnd(52), value);

console.log('--- 1. "cars = [...]" after "newCars = cars": does newCars change? ---');
{
  let cars = ['tesla'];
  const newCars = cars;
  cars = ['tesla', 'audi']; // the article's snippet: reassignment, not mutation
  log('reassign: cars', JSON.stringify(cars));
  log('reassign: newCars (article claims ["tesla","audi"])', JSON.stringify(newCars));
  log('reassign: cars === newCars', cars === newCars);

  let cars2 = ['tesla'];
  const newCars2 = cars2;
  cars2.push('audi'); // mutation: what the article meant to show
  log('mutate: newCars2', JSON.stringify(newCars2));
  log('mutate: cars2 === newCars2', cars2 === newCars2);
}

console.log('\n--- 2. "JS calls valueOf to convert the wrapper back" on a method call? ---');
{
  const original = String.prototype.valueOf;
  let calls = 0;
  String.prototype.valueOf = function () { calls++; return original.call(this); };
  const r = 'car'.toUpperCase();
  log("'car'.toUpperCase() result", r);
  log('String.prototype.valueOf calls during the method call', calls);
  const s = 'abc';
  const n = s.length + s.indexOf('b');
  log('s.length + s.indexOf(...) valueOf calls', `${calls} (n=${n})`);
  // valueOf IS called when an explicit wrapper object meets an operator (ToPrimitive):
  const w = new String('x');
  const joined = w + '!';
  log("new String('x') + '!' valueOf calls", `${calls} (${joined})`);
  String.prototype.valueOf = original;
}

console.log('\n--- 3. method sees a primitive this, not the wrapper (strict) ---');
{
  String.prototype.whoAmI = function () { 'use strict'; return typeof this; };
  log("'x'.whoAmI() typeof this (strict method)", 'x'.whoAmI());
  delete String.prototype.whoAmI;
}

console.log('\n--- 4. car[0] = "b": silent or error? ---');
{
  const car = 'car';
  car[0] = 'b'; // sloppy: silently ignored
  log('sloppy: car after car[0] = "b"', car);
  (function () {
    'use strict';
    try {
      const c = 'car';
      c[0] = 'b';
      log('strict: c[0] = "b"', 'no error');
    } catch (e) {
      log('strict: c[0] = "b"', `${e.constructor.name}: ${e.message}`);
    }
  })();
}

console.log('\n--- 5. typo in the article output: car.year = 2021 ---');
{
  const car = { brand: 'tesla' };
  car.year = 2021;
  log('typeof car.year (article prints "2021")', typeof car.year);
}

console.log('\n--- 6. "objects are mutable": by default; a frozen object is not ---');
{
  const frozen = Object.freeze({ brand: 'tesla' });
  frozen.year = 2021; // sloppy: silently ignored
  log('Object.isFrozen / frozen.year', `${Object.isFrozen(frozen)} / ${frozen.year}`);
  log('Object.isFrozen("abc") (primitives count as frozen)', Object.isFrozen('abc'));
}

console.log('\n--- 7. "copy inside the function" with spread is shallow ---');
{
  const person = { name: 'Paul', address: { city: 'Kyiv' } };
  function move(p) { const copy = { ...p }; copy.address.city = 'Lviv'; return copy; }
  move(person);
  log('caller person.address.city after "pure" move()', person.address.city);
}
