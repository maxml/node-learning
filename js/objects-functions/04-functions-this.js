// Функції як об'єкти, hoisting і TDZ, замикання в циклі, правила this, arguments, параметри.
// CommonJS без 'use strict' на верхньому рівні, strict вмикається всередині окремих функцій.
const log = (label, v) => console.log(label.padEnd(52), v);
const err = (fn) => { try { fn(); return 'no error'; } catch (e) { return `${e.constructor.name}: ${e.message}`; } };

// 1. Функція це об'єкт: має властивості, name і length
function add(a, b = 1, ...rest) { return a + b; }
add.calls = 0;
log('typeof add / instanceof Object', [typeof add, add instanceof Object]);
log('add.name / add.length (до першого default)', [add.name, add.length]);
const anon = function () {}; const arrow = () => {};
log('name inference for expressions', [anon.name, arrow.name]);

// 2. Hoisting і TDZ
log('var before declaration', (() => { const r = v; var v = 1; return r; })());
log('function declaration before line', (() => { return f(); function f() { return 'hoisted'; } })());
log('let before declaration', err(() => { l; let l = 1; }));
log('typeof in TDZ (not safe!)', err(() => { typeof t; let t; }));
log('typeof undeclared (safe)', typeof neverDeclared);
log('function expression in var before line', err(() => { fe(); var fe = function () {}; }));

// 3. Замикання захоплює зв'язування (binding), а не значення
const withVar = []; for (var i = 0; i < 3; i++) withVar.push(() => i);
const withLet = []; for (let j = 0; j < 3; j++) withLet.push(() => j);
log('closures over var i', withVar.map((f) => f()));
log('closures over let j (fresh binding per iteration)', withLet.map((f) => f()));
let later = 'before';
const readLater = () => later;
later = 'after';
log('closure sees later reassignment', readLater());

// 4. Лічильник і приватний стан через замикання (module pattern / IIFE)
const counter = (function () {
  let n = 0;
  return { inc: () => ++n, get value() { return n; } };
})();
counter.inc(); counter.inc();
log('IIFE counter: value / n reachable?', [counter.value, 'n' in counter]);

// 5. Правила this
function who() { return this === undefined ? 'undefined' : this === globalThis ? 'globalThis' : this.tag; }
function whoStrict() { 'use strict'; return this === undefined ? 'undefined' : this.tag; }
const obj = { tag: 'obj', who, whoStrict };
log('default binding sloppy / strict', [who(), whoStrict()]);
log('implicit: obj.who()', obj.who());
log('explicit: who.call({tag})', who.call({ tag: 'call' }));
const bound = who.bind({ tag: 'bound' });
log('bind once: bound.call(other)', bound.call({ tag: 'other' }));
log('rebind ignored: bound.bind(other)()', bound.bind({ tag: 'other' })());
function Tagged() { this.tag = 'new'; return undefined; }
const BoundCtor = Tagged.bind({ tag: 'ignored' });
log('new beats bind', new BoundCtor().tag);
const arrowObj = { tag: 'arrowObj', m() { return [1].map(() => this.tag)[0]; }, a: () => typeof this };
log('arrow takes this lexically', arrowObj.m());
log('arrow as method: this is module scope this', [arrowObj.a(), this === module.exports]);
log('call/apply cannot change arrow this', (() => { const f = () => this; return f.call({ x: 1 }) === this; })());
log('sloppy primitive this is boxed', (function () { return typeof this; }).call(5));
log('strict primitive this stays primitive', (function () { 'use strict'; return typeof this; }).call(5));

// 5b. this визначає форма виразу виклику (Reference Record), а не місце, де лежить функція
function tagOf() { 'use strict'; return this === undefined ? 'undefined' : this.tag; }
const holder = { tag: 'holder', tagOf };
log('(holder.tagOf)() keeps base', (holder.tagOf)());
log('(0, holder.tagOf)() loses base', (0, holder.tagOf)());

// 5c. Оголошення функції в блоці: sloppy (Annex B) видно після блоку, strict ні
const sloppyBlockFn = new Function('{ function g() {} } return typeof g;')();
const strictBlockFn = new Function("'use strict'; { function g() {} } return typeof g;")();
log('block function visible outside: sloppy / strict', [sloppyBlockFn, strictBlockFn]);

// 6. Втрата this у колбеку
class Timer {
  constructor() { this.ticks = 0; }
  tick() { this.ticks++; return this.ticks; }
}
const t = new Timer();
log('detached method (class body strict)', err(() => { const fn = t.tick; fn(); }));
log('fixed with bind', [t.tick.bind(t)(), t.ticks]);
log('callback via arrow', [[1, 2].map(() => t.tick()), t.ticks]);
log('Array#map thisArg', [1].map(function () { return this.tag; }, { tag: 'thisArg' }));

// 7. arguments проти rest
function sloppyArgs(a) { arguments[0] = 'changed'; return a; }
function strictArgs(a) { 'use strict'; arguments[0] = 'changed'; return a; }
function withDefault(a = 0) { arguments[0] = 'changed'; return a; }
log('sloppy arguments aliases params', sloppyArgs('orig'));
log('strict arguments does not alias', strictArgs('orig'));
log('non-simple params (default) do not alias', withDefault('orig'));
log('arguments is not an Array', (function () { return [Array.isArray(arguments), typeof arguments.map]; })(1));
log('arrow has no own arguments', (function () { return (() => arguments[0])(); })('outer'));

// 8. Параметри за замовчуванням: обчислюються при кожному виклику, мають власну область
let calls = 0;
const def = (x = ++calls) => x;
def(); def(); def(5);
log('default evaluated per call (only when undefined)', calls);
log('null does not trigger default', ((x = 'dflt') => x)(null));
log('later param sees earlier', ((a, b = a * 2) => b)(3));
log('earlier param cannot see later (TDZ)', err(() => ((a = b, b = 1) => a)()));
const scopeX = 'outer';
log('param scope is separate from body var', ((p = () => scopeX) => { var scopeX = 'body'; return p(); })());

// 9. Функції вищого порядку: memoize як декоратор (лекція 4, задача 3)
function memoize(fn) {
  const cache = new Map();
  return function (arg) {
    if (!cache.has(arg)) cache.set(arg, fn.call(this, arg));
    return cache.get(arg);
  };
}
let slowCalls = 0;
const square = memoize((n) => { slowCalls++; return n * n; });
square(4); square(4); square(5);
log('memoize: underlying calls for 4,4,5', slowCalls);
