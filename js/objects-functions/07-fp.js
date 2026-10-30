// Чисті функції, каррінг, часткове застосування, композиція, lodash/fp. Потрібно: npm ci
const _ = require('lodash');
const fp = require('lodash/fp');
const log = (label, v) => console.log(label.padEnd(56), v);
const err = (fn) => { try { return fn(); } catch (e) { return `${e.constructor.name}: ${e.message}`; } };

// 1. Каррінг за fn.length (як exAdvancedCurry у examples/ex_lodash/fp.js)
const curry = (fn) => function curried(...args) {
  return args.length >= fn.length ? fn.apply(this, args) : (...more) => curried.apply(this, [...args, ...more]);
};
const sum3 = curry((a, b, c) => a + b + c);
log('curried: sum3(1)(2)(3) / sum3(1, 2)(3)', [sum3(1)(2)(3), sum3(1, 2)(3)]);
log('ex_lodash/fp.js line 77: sum3(1, (2, 3)) is comma op', typeof sum3(1, (2, 3)));
log('fn.length stops at a default: fires after 1 arg', curry((a, b = 1) => a + b)(5));

// 2. Часткове застосування через bind
const greet = (greeting, name) => `${greeting}, ${name}`;
const hello = greet.bind(null, 'Hello');
log('partial via bind', [hello('Ann'), hello.length]);

// 3. compose (справа наліво) і pipe (зліва направо)
const compose = (...fns) => (x) => fns.reduceRight((acc, f) => f(acc), x);
const pipe = (...fns) => (x) => fns.reduce((acc, f) => f(acc), x);
const toSlug = pipe((s) => s.split(' '), (ws) => ws.map((w) => w.toLowerCase()), (ws) => ws.join('-'), encodeURIComponent);
log('pipe toSlug', toSlug('JS Cheerleader'));
log('compose(f, g)(x) = f(g(x))', compose((x) => x + 1, (x) => x * 10)(2));

// 4. lodash проти lodash/fp: порядок аргументів і авто-каррінг
log('lodash: _.map(collection, iteratee)', _.map([1, 2], (x) => x * 2));
log('lodash/fp: fp.map(iteratee)(collection)', fp.map((x) => x * 2)([1, 2]));
log('lodash/fp iteratee gets 1 arg (capped)', fp.map((x, i) => i)(['a', 'b']));
log('lodash: map iteratee gets index', _.map(['a', 'b'], (x, i) => i));
// ex_fp/index.js line 224: _.map(fn, cars) у звичайному lodash (не fp)
log('ex_fp line 224: _.map(fn, array) in plain lodash', _.map((c) => c.v, [{ v: 1 }]));
// ex_fp/index.js line 240: _.sortBy(iteratee) у звичайному lodash не каррінговий
log('ex_fp line 240: _.sortBy(prop) returns', _.sortBy(_.property('hp')));
const fastest = fp.flow(fp.sortBy('hp'), fp.last, fp.get('name'));
log('fp.flow fastest car', fastest([{ name: 'a', hp: 200 }, { name: 'b', hp: 100 }]));

// 5. lodash/fp не мутує: fp.set повертає копію зі спільними гілками
const state = { a: { b: 1 }, c: { d: 2 } };
const updated = fp.set('a.b', 9, state);
log('fp.set: original / updated / shared untouched branch', [state.a.b, updated.a.b, updated.c === state.c]);
const target = { a: { b: 1 } };
const mutated = _.set(target, 'a.b', 9);
log('_.set mutates target: same object / target.a.b', [mutated === target, target.a.b]);

// 6. Чистота: та сама відповідь на той самий вхід, без спостережуваних ефектів
let minimum = 21;
const impureCheck = (age) => age >= minimum;
const pureCheck = (min) => (age) => age >= min;
const before = impureCheck(20); minimum = 18; const after = impureCheck(20);
log('impure: same input, different output', [before, after]);
log('pure: dependency is an argument', pureCheck(21)(20));

// 7. Відкладений ефект: функція, що повертає thunk, сама чиста, а виклик thunk ні
const effects = [];
const signUp = (db, attrs) => () => { db.push(attrs); };
const program = signUp(effects, { name: 'ann' });
log('building the thunk has no effect', effects.length);
program();
log('running it does', effects.length);
// 8. Бекенд-баг через спільний змінний стан: модульний DEFAULTS мутується в обробнику,
//    і стан одного «запиту» протікає в інший, навіть якщо вони перемежовуються через await
const DEFAULTS = { headers: { 'x-tenant': 'none' } };
async function handleMutating(tenant) {
  const opts = DEFAULTS;                         // аліас, не копія
  opts.headers['x-tenant'] = tenant;
  await new Promise((r) => setTimeout(r, tenant === 'A' ? 20 : 5));
  return opts.headers['x-tenant'];
}
async function handlePure(tenant) {
  const opts = { ...DEFAULTS, headers: { ...DEFAULTS.headers, 'x-tenant': tenant } };
  await new Promise((r) => setTimeout(r, tenant === 'A' ? 20 : 5));
  return opts.headers['x-tenant'];
}
(async () => {
  log('shared mutable defaults: A sees', (await Promise.all([handleMutating('A'), handleMutating('B')]))[0]);
  DEFAULTS.headers['x-tenant'] = 'none';
  log('immutable update per request: A sees', (await Promise.all([handlePure('A'), handlePure('B')]))[0]);
})();

log('mutation through a frozen arg is blocked only shallowly', err(() => { 'use strict'; const st = Object.freeze({ list: [] }); st.list.push(1); return st.list.length; }));
