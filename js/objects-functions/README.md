# Об'єкти, функції, незмінність: експерименти

Код, на який спираються позначки «перевірено» в нотатках
`Obsidian Vault/Engineering/General/JavaScript/`:
«Об'єкти та прототипи в JavaScript», «Функції та замикання в JavaScript»,
«Незмінність і функціональний стиль у JavaScript».

Прогін 2026-10-30: Node v24.14.1, V8 13.6.233.17-node.44, npm 11.12.1, lodash 4.18.1.

```bash
npm ci            # лише для 07-fp.js (lodash)
npm run all       # усі файли по черзі; 05 запускається з --expose-gc
```

Файли навмисно CommonJS без `'use strict'` на верхньому рівні: strict mode вмикається
всередині окремих функцій, щоб в одному прогоні було видно і тиху відмову (sloppy), і
`TypeError` (strict).

| Файл                         | Що показує                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `01-properties.js`           | дескриптори й значення за замовчуванням, freeze/seal/preventExtensions, порядок ключів, `for…in` проти `Object.keys`, `Object.create(null)`, `__proto__` у літералі проти `JSON.parse` |
| `02-prototypes-classes.js`   | `[[Get]]`/`[[Set]]` і затінення, `new` крок за кроком, де `class` не цукор, `#приватні` поля, static block, `super` і HomeObject, поля проти сетерів, міксини |
| `03-proxy-symbols.js`        | символьні ключі, well-known symbols, Proxy/Reflect, інваріанти пасток, Proxy над `Map`      |
| `04-functions-this.js`       | функція як об'єкт, hoisting і TDZ, замикання в циклі `var`/`let`, правила `this`, `arguments`, параметри за замовчуванням, `memoize` |
| `05-closure-retention.js`    | спільний контекст замикань у V8: сусіднє замикання утримує великий об'єкт (WeakRef + `gc()`) |
| `06-immutability.js`         | `const` ≠ незмінність, deep freeze, поверхневі копії, structuredClone проти JSON, методи ES2023 |
| `07-fp.js`                   | каррінг, `bind`, compose/pipe, lodash проти lodash/fp, чистота, відкладений ефект, протікання стану між «запитами» |

Окремо перевіряються помилки в старих прикладах курсу (код не змінено):

- `ex_lodash/fp.js:116` `const showIndexPage;` це `SyntaxError`, файл не запускається взагалі
  (`node --check ex_lodash/fp.js`); `fp.js:77` `curriedSum(1, (2, 3))` це оператор кома, тобто
  `curriedSum(1, 3)`, і результат функція, а не число (рядок у `07-fp.js`).
- `ex_fp/index.js:224` і `:240`: виклики в порядку lodash/fp на звичайному `lodash`
  (`_.map(fn, cars)`, `_.sortBy(prop)`) мовчки дають `[]` (рядки в `07-fp.js`).
- `practice/practice14.js` `simpleProxy`: пастка `set` без `return true` у strict-коді кидає
  `TypeError` навіть на успішному записі (рядок у `03-proxy-symbols.js`).

## Результат прогону 2026-10-30

```
$ npm run -s all
literal descriptor                           { value: 1, writable: true, enumerable: true, configurable: true }
defineProperty defaults                      { value: 1, writable: false, enumerable: false, configurable: false }
Object.keys(def) (enumerable:false)          []
JSON.stringify(def)                          {}
sloppy write to writable:false               1
strict write to writable:false               TypeError: Cannot assign to read only property 'a' of object '#<Object>'
delete non-configurable (sloppy)             false
writable true->false on non-configurable     false
writable false->true                         TypeError: Cannot redefine property: x
accessor set f=212 -> _c                     100
accessor descriptor keys                     [ 'get', 'set', 'enumerable', 'configurable' ]
freeze is shallow: inner.n, arr              [ 2, [ 1, 2 ] ]
isFrozen / isFrozen(inner)                   [ true, false ]
sealed: change ok, add/delete no-op          { s: 2 }
preventExtensions: add no-op, delete ok      {}
  setter called with                         1
spread result descriptor of v                { value: 1, writable: true, enumerable: true, configurable: true }
spread of getter -> data property            {
  value: 'computed',
  writable: true,
  enumerable: true,
  configurable: true
}
Reflect.ownKeys order                        [
  '1',          '2',
  '4294967294', 'b',
  'a',          '-1',
  '01',         '4294967295',
  'Symbol(s)'
]
for-in                                       [ 'own', 'inherited' ]
Object.keys                                  [ 'own' ]
Object.getOwnPropertyNames                   [ 'own', 'hidden' ]
'inherited' in child / hasOwn                [ true, false ]
null-proto: __proto__ is own key             [ '__proto__' ]
null-proto: typeof dict.toString             undefined
String(nullProtoObj)                         TypeError: Cannot convert object to primitive value
hasOwnProperty on null-proto via Object.hasOwn true
literal __proto__ -> inherited               [ true, [] ]
JSON.parse __proto__ -> own key              [ undefined, [ '__proto__' ] ]
kid.greet() (method from proto, this=kid)        hi from kid
kid.count++ shadows: kid / base                  [ 1, 0 ]
setter on proto: hasOwn(role), _role             [ false, 'ADMIN' ]
assign over non-writable proto prop (sloppy)     [ 1, false ]
same in strict                                   TypeError: Cannot assign to read only property 'id' of object '#<Object>'
defineProperty does shadow                       2
Object.getPrototypeOf(inst) === Ctor.prototype   true
Ctor.__proto__ === Function.prototype            true
arrow has .prototype?                            false
__proto__ is accessor on Object.prototype        function
myNew(Point, 3)                                  [ Point { x: 3 }, true ]
new Weird() returns object from ctor             { hijacked: true }
new Prim() ignores primitive return              Prim { a: 1 }
constructor without new (sloppy) leaks to global 7
call class without new                           TypeError: Class constructor A cannot be invoked without 'new'
class TDZ: use before declaration                ReferenceError: Cannot access 'B' before initialization
class body is strict (this in method call)       undefined
class methods non-enumerable                     [ false, [] ]
P.prototype writable?                            false
method is not a constructor                      TypeError: (intermediate value).method is not a constructor
Reflect.ownKeys(acc)                             []
JSON.stringify(acc)                              {}
#balance in acc / in {}                          [ true, false ]
private through Proxy                            TypeError: Cannot read private member #balance from an object whose class did not declare it
private on foreign this                          TypeError: Cannot read private member #balance from an object whose class did not declare it
static block exports private accessor            s3cr3t
borrowed method keeps its super                  dog>animal
field shadows base setter: own descriptor        { value: 1, writable: true, enumerable: true, configurable: true }
mixin chain                                      [ 'stamped', '{"id":1,"kind":"ser"}', true ]
derived: this before super()                     ReferenceError: Must call super constructor in derived class before accessing 'this' or returning from derived constructor
derived: return primitive                        TypeError: Derived constructors may only return object or undefined
assign over getter-only proto prop               [ 1, false ]
for-in skips inherited key shadowed by non-enumerable own []
shared array on prototype: t2.members            [ 'a' ]
Object.keys / JSON                                 [ [ 'name' ], '{"name":"x"}' ]
Reflect.ownKeys                                    [ 'name', Symbol(id) ]
Symbol('a') === Symbol('a') / Symbol.for           [ false, true ]
spread copies symbol keys                          [ Symbol(id) ]
toPrimitive: +money / `${money}`                   [ 5, '5 UAH' ]
Symbol.iterator: [...range]                        [ 1, 2, 3 ]
Symbol.hasInstance: 4 instanceof Even              true
Symbol.toStringTag                                 [object Custom]
audit trail                                        [ 'set age', 'get name' ]
set trap returns false (sloppy)                    undefined
set trap returns false (strict)                    TypeError: 'set' on proxy: trap returned falsish for property 'a'
practice14-style trap without return, strict       TypeError: 'set' on proxy: trap returned falsish for property 'p'
get invariant violation                            TypeError: 'get' on proxy: property 'k' is a read-only and non-configurable data property on the proxy target but the proxy did not return its actual value (expected '1' but got '2')
has invariant violation                            TypeError: 'has' on proxy: trap returned falsish for property 'k' which exists in the proxy target as non-configurable
ownKeys invariant on non-extensible target         TypeError: 'ownKeys' on proxy: trap result did not include 'a'
Map method through Proxy                           TypeError: Method Map.prototype.get called on incompatible receiver #<Map>
Map method with bound target                       a
revoked proxy access                               TypeError: Cannot perform 'get' on a proxy that has been revoked
typeof add / instanceof Object                       [ 'function', true ]
add.name / add.length (до першого default)           [ 'add', 1 ]
name inference for expressions                       [ 'anon', 'arrow' ]
var before declaration                               undefined
function declaration before line                     hoisted
let before declaration                               ReferenceError: Cannot access 'l' before initialization
typeof in TDZ (not safe!)                            ReferenceError: Cannot access 't' before initialization
typeof undeclared (safe)                             undefined
function expression in var before line               TypeError: fe is not a function
closures over var i                                  [ 3, 3, 3 ]
closures over let j (fresh binding per iteration)    [ 0, 1, 2 ]
closure sees later reassignment                      after
IIFE counter: value / n reachable?                   [ 2, false ]
default binding sloppy / strict                      [ 'globalThis', 'undefined' ]
implicit: obj.who()                                  obj
explicit: who.call({tag})                            call
bind once: bound.call(other)                         bound
rebind ignored: bound.bind(other)()                  bound
new beats bind                                       new
arrow takes this lexically                           arrowObj
arrow as method: this is module scope this           [ 'object', true ]
call/apply cannot change arrow this                  true
sloppy primitive this is boxed                       object
strict primitive this stays primitive                number
(holder.tagOf)() keeps base                          holder
(0, holder.tagOf)() loses base                       undefined
block function visible outside: sloppy / strict      [ 'function', 'undefined' ]
detached method (class body strict)                  TypeError: Cannot read properties of undefined (reading 'ticks')
fixed with bind                                      [ 1, 1 ]
callback via arrow                                   [ [ 2, 3 ], 3 ]
Array#map thisArg                                    [ 'thisArg' ]
sloppy arguments aliases params                      changed
strict arguments does not alias                      orig
non-simple params (default) do not alias             orig
arguments is not an Array                            [ false, 'undefined' ]
arrow has no own arguments                           outer
default evaluated per call (only when undefined)     2
null does not trigger default                        null
later param sees earlier                             6
earlier param cannot see later (TDZ)                 ReferenceError: Cannot access 'b' before initialization
param scope is separate from body var                outer
memoize: underlying calls for 4,4,5                  2
A: no closure mentions big -> big collected?                 true
B: only a sibling closure mentions big -> big collected?     false
C: sibling mentions big, big=null -> big collected?          true
D: keep itself uses big -> big collected?                    false
B after dropping keep -> big collected?                      true
node / v8                                                    v24.14.1 / 13.6.233.17-node.44
const object mutated                                 { port: 8080 }
const rebinding                                      TypeError: Assignment to constant variable.
deepFreeze: nested push (strict)                     TypeError: Cannot add property 1, object is not extensible
frozen Map still mutable (internal slots)            1
shallow copy shares nested                           MUTATED
immutable update: original tags / next tags          [ [ 'a' ], [ 'a', 'b' ] ]
changed branch new, untouched branch shared          [ true, true ]
structuredClone: Date, Map, Set, cycle               [ true, 'x', true, true ]
structuredClone: class instance loses prototype      [ false, undefined ]
structuredClone: function throws                     DOMException: f() {} could not be cloned.
JSON round-trip: cycle                               TypeError: Converting circular structure to JSON
    --> starting at object with constructor 'Object'
    --- property 'self' closes the circle
JSON round-trip: Date -> string, Map -> {}, undefined dropped [ 'string', {}, false, {} ]
JSON: BigInt throws                                  TypeError: Do not know how to serialize a BigInt
toSorted: original untouched                         [ [ 3, 1, 2 ], [ 1, 2, 3 ] ]
toReversed / with(0, 9) / toSpliced(1,1)             [ [ 2, 1, 3 ], [ 9, 1, 2 ], [ 3, 2 ] ]
sort mutates and returns same array                  [ [ 1, 2, 3 ], true ]
frozen array: sort throws, toSorted works            [
  "TypeError: Cannot assign to read only property '0' of object '[object Array]'",
  [ 1, 2 ]
]
Object.groupBy result has null prototype             null
toSorted default compares as strings                 [ 1, 10, 9 ]
with() out of range                                  RangeError: Invalid index : 5
toSorted turns holes into undefined                  [ 1, 3, undefined ]
copy methods are shallow (element identity kept)     true
frozen instance: private field still mutable         [ 5, 10 ]
freeze non-empty Uint8Array                          TypeError: Cannot freeze array buffer views with elements
string index assignment (strict)                     TypeError
string methods return new strings                    [ 'ABC', 'abc' ]
curried: sum3(1)(2)(3) / sum3(1, 2)(3)                   [ 6, 6 ]
ex_lodash/fp.js line 77: sum3(1, (2, 3)) is comma op     function
fn.length stops at a default: fires after 1 arg          6
partial via bind                                         [ 'Hello, Ann', 1 ]
pipe toSlug                                              js-cheerleader
compose(f, g)(x) = f(g(x))                               21
lodash: _.map(collection, iteratee)                      [ 2, 4 ]
lodash/fp: fp.map(iteratee)(collection)                  [ 2, 4 ]
lodash/fp iteratee gets 1 arg (capped)                   [ undefined, undefined ]
lodash: map iteratee gets index                          [ 0, 1 ]
ex_fp line 224: _.map(fn, array) in plain lodash         []
ex_fp line 240: _.sortBy(prop) returns                   []
fp.flow fastest car                                      a
fp.set: original / updated / shared untouched branch     [ 1, 9, true ]
_.set mutates target: same object / target.a.b           [ true, 9 ]
impure: same input, different output                     [ false, true ]
pure: dependency is an argument                          false
building the thunk has no effect                         0
running it does                                          1
mutation through a frozen arg is blocked only shallowly  1
shared mutable defaults: A sees                          B
immutable update per request: A sees                     A
```

`05-closure-retention.js` спирається на WeakRef і примусовий `gc()`; результат стабільний
на V8 13.6, але це поведінка реалізації, а не гарантія мови.
