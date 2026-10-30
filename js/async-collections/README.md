# Асинхронність, колекції й регулярні вирази в JavaScript

Код експериментів, на які спираються нотатки
`Obsidian Vault/Engineering/General/JavaScript/` (позначки «перевірено»):
«Асинхронність у JavaScript», «Масиви та колекції в JavaScript», «Регулярні вирази в JavaScript».

Прогін 2026-10-30, Node v24.14.1 (V8 13.6.233.17-node.44), Linux x86_64. Залежностей немає.
Таймінги залежать від машини й навантаження (прогін ішов паралельно з іншими процесами): дивіться
на порядок величин і на те, як вони ростуть, а не на точні мілісекунди.

```bash
node async-01-ticks.mjs
node async-02-zalgo-and-errors.mjs
node async-03-combinators.mjs
node async-04-unhandled-rejection.mjs
node async-05-abort-promisify.mjs
node coll-01-arrays.mjs
node --allow-natives-syntax coll-02-elements-kinds.js
node --expose-gc coll-03-map-set-weak.js
node coll-04-iterators.mjs
node re-01-semantics.mjs
node re-02-backtracking.js
node --enable-experimental-regexp-engine re-02-backtracking.js
node --enable-experimental-regexp-engine-on-excessive-backtracks re-02-backtracking.js
```

## `async-01-ticks.mjs`: скільки мікрозадач коштує форма промісу

Годинник перезапускає себе через `queueMicrotask`; число це кількість тіків до того, як операція
завершилась. Важлива різниця між рядками.

```
 1 Promise.resolve(1).then
 1 async () => 1
 2 async: await nativePromise; return
 3 async: return nativePromise
 2 async: return await nativePromise
 3 async: await thenable
 3 new Promise(r => r(nativePromise))
 1 new Promise(r => r(1))
Promise.resolve(p) === p: true
order: sync end -> then
```

Висновки: розв'язання промісу іншим промісом чи thenable коштує +2 тіки
(`NewPromiseResolveThenableJob` і його `then`); `return p` в async-функції повільніший за
`return await p`; `await` нативного промісу коштує 1 тік, бо `PromiseResolve` повертає той самий
об'єкт.

## `async-02-zalgo-and-errors.mjs`: Zalgo, виконавець, `return await`, `finally`

```
Zalgo, cold cache:     after call -> callback
Zalgo, warm cache:     callback -> after call
safe, warm cache:      after call -> callback
executor: first
throw in executor -> rejected: boom
return p       -> escaped: db down
return await p -> caught
finally pass-through -> 1
finally throw -> cleanup failed
catch recovers -> then got recovered
then(ok, err) -> outer catch: in onOk
uncaughtException: thrown later
after forEach(async): []
two ticks later: [1,2,3]
```

## `async-03-combinators.mjs`: як падають `all` / `allSettled` / `race` / `any`

```
all          settled at ~20ms: rejected Error: B failed
             jobs that still ran to the end: B, C, A
allSettled   settled at ~100ms: ok ["fulfilled","rejected"]
             jobs that still ran to the end: B, A
race         settled at ~20ms: rejected Error: B failed
             jobs that still ran to the end: B, A
any          settled at ~100ms: ok "A"
             jobs that still ran to the end: B, A
any (all fail) settled at ~30ms: rejected AggregateError: All promises were rejected ["A failed","B failed"]
             jobs that still ran to the end: B, A
all([])      settled at ~0ms: ok []
             jobs that still ran to the end: 
race([])     settled at ~50ms: ok "timeout"
             jobs that still ran to the end: timeout
any([])      settled at ~0ms: rejected AggregateError: All promises were rejected []
             jobs that still ran to the end: 
```

Жоден комбінатор нічого не скасовує: решта задач добігає кінця. `Promise.race([])` не
завершується ніколи (тут його «рятує» зовнішній таймер).

## `async-04-unhandled-rejection.mjs`: необроблене відхилення в Node 24

Кожен випадок у дочірньому процесі.

```
no handler                                     exit=1 stdout="" stderr~"Error: lost"
--unhandled-rejections=warn                    exit=0 stdout="still alive" stderr~"(node:4004596) UnhandledPromiseRejectionWarning: Error: lost"
catch attached in same sync turn               exit=0 stdout="handled" stderr~""
catch attached after setTimeout 0              exit=1 stdout="" stderr~"Error: x"
catch attached after await of another promise  exit=1 stdout="" stderr~"Error: x"
start two, await one by one (2nd fails first)  exit=1 stdout="" stderr~"Error: bad"
same with Promise.all                          exit=0 stdout="caught bad" stderr~""
process.on(unhandledRejection)                 exit=0 stdout="hook saw: lost\nstill alive" stderr~""
node v24.14.1
```

Рядок «start two, await one by one»: `const a = f(); const b = g(); try { await a; await b } catch {}`
валить процес, якщо `b` відхилився, поки код чекав на `a`. `try/catch` тут не допомагає.

## `async-05-abort-promisify.mjs`: AbortSignal, `withResolvers`, `promisify`, послідовно чи паралельно

```
throwIfAborted -> TimeoutError 23: The operation was aborted due to timeout
timeout signal -> AbortError ABORT_ERR: The operation was aborted (cause: TimeoutError)
manual abort   -> AbortError ABORT_ERR: The operation was aborted (cause: AbortError) | reason: AbortError
any(user, 30ms) -> AbortError ABORT_ERR: The operation was aborted (cause: TimeoutError) | combined.reason: TimeoutError
ignores signal  -> done anyway (steps=5, aborted=true)
honours signal  -> AbortError ABORT_ERR: The operation was aborted (cause: TimeoutError) (steps=1)
withResolvers   -> resolved from outside
promisify(readFile) -> // Cancellation with AbortSignal, Promis…
promisify(setTimeout) uses custom: true
await in loop: 154 ms
Promise.all  : 54 ms
start then await: 50 ms
```

`node:timers/promises` відхиляє з `AbortError` і кладе `signal.reason` у `cause`; сам
`signal.reason` для `AbortSignal.timeout` це `TimeoutError`.

## `coll-01-arrays.mjs`: масив як об'єкт, дірки, сортування, методи-копії

```
Object.keys([x,y,z])                 ["0","1","2"]
a['1'] === a[1]                      true
after a.length = 1                   ["x"]
b[99] = 1 -> length                  100
b["-1"], b["1.5"] -> length          100
b.at(-1) vs b[-1]                    [1,"neg"]
length = 2**32                       RangeError: Invalid array length
1 in [1,,3]                          false
forEach visits indices               [0,2]
for-of yields                        [1,null,3]
map keeps the hole (keys)            ["0","2"]
toSorted fills hole with undefined   ["0","1","2"]
Array(3) keys / Array.from keys      [[],["0","1","2"]]
delete d[1] -> length, 1 in d        [3,false]
[10, 9, 1, 2].sort()                 [1,10,2,9]
[10, 9, 1, 2].sort((x, y) => x - y)  [1,2,9,10]
['b', undefined, 'a', , 'C'].sort()  ["C","a","b","undefined",null]
['é','z','e'].sort() vs localeCompare [["e","z","é"],["e","é","z"]]
sort stable for 20 equal-key items   true
toSorted leaves source               {"src":[3,1,2],"sorted":[1,2,3]}
with(1, 9)                           [3,9,2]
with(5, 0)                           RangeError: Invalid index : 5
toSpliced(0, 1)                      [1,2]
findLast / findLastIndex             [3,2]
includes(NaN) vs indexOf(NaN)        [true,-1]
Object.groupBy                       {"odd":[1,3],"even":[2,4]}
groupBy result prototype is null     true
Map.groupBy keeps object key         [1,2]
Array.fromAsync(asyncGen)            [1,2]
Array.fromAsync([p1, p2], x => x * 10) [10,20]
drain 10000: shift vs pop (ms)       [5,1.2]
drain 30000: shift vs pop (ms)       [229,2.8]
drain 100000: shift vs pop (ms)      [3007,1.1]
Math.max(...100000 items)            ok
Math.max(...200000 items)            RangeError: Maximum call stack size exceeded
Math.max(...1000000 items)           RangeError: Maximum call stack size exceeded
```

`JSON.stringify` показує дірку (і `undefined`) як `null`; рядок «for-of yields» насправді дає
`undefined`. Межа для spread в аргументи залежить від рушія й розміру стека. Черга на `shift`:
у 3.3 раза більше елементів дали в 13 разів більший час (квадратична поведінка); на 10 000
елементів її ще не видно. Аналогічний разовий прогін (`node -e`, той самий цикл) на 400 000 елементів тривав 93 с проти 3 мс
для `pop`.

## `coll-02-elements-kinds.js`: elements kinds у V8 (деталь рушія)

`%Has*Elements` це внутрішні тестові хелпери V8, доступні з `--allow-natives-syntax`.

```
[1,2,3]                 SMI PACKED
push(4.5)               DOUBLE PACKED
overwrite 4.5 with 4    DOUBLE PACKED (no way back)
push('x')               ELEMENTS PACKED
[1,2,3]; h[10] = 4      SMI HOLEY
length = 3 again        SMI HOLEY (stays holey)
new Array(3)            SMI HOLEY
Array.from({length:3})  SMI PACKED
V8 13.6.233.17-node.44
```

## `coll-03-map-set-weak.js`: Map проти об'єкта, методи Set, слабкі посилання

```
obj[1] and obj["1"]                      ["1"]
object key order                         ["1","2","b","a"]
Map key order (and 1 !== "1")            ["b",2,"a",1,"1"]
'toString' in {}                         true
Object.assign({}, JSON __proto__) isAdmin true
'toString' in Object.create(null)        false
Map.set('__proto__') is just a key       ["__proto__"]
get(sameRef) / get(equalShape)           ["v",null]
Map NaN key / -0 vs +0                   ["nan","zero"]
JSON.stringify(new Map([[1,2]]))         {}
Object.fromEntries(map)                  {"a":1}
union                                    [1,2,3,4]
intersection                             [2,3]
difference A-B                           [1]
symmetricDifference                      [1,4]
isSubsetOf / isSupersetOf / isDisjointFrom [true,true,true]
union with a Map (set-like: size/has/keys) [1,2,3,9]
union with an array                      TypeError: The .size property is NaN
Set of objects dedups by reference       2
WeakMap iterable?                        undefined
WeakMap.set(primitive key)               TypeError: Invalid value used as weak map key
WeakMap with non-registered symbol key   1
WeakMap.set(Symbol.for(...))             TypeError: Invalid value used as weak map key
deref() before GC                        object
deref() after GC (next task)             undefined
cleanup callbacks after 500ms            ["kept-registry"]
```

Останній рядок: на той самий об'єкт зареєстровано два `FinalizationRegistry`; той, на який після
виходу з функції ніхто не посилається, свій колбек не викликав у жодному з прогонів. Перша версія
скрипта, де єдиний реєстр не був захоплений жодним замиканням, теж не отримала колбека ні разу (3 з 3).

## `coll-04-iterators.mjs`: протоколи ітерації, генератори, iterator helpers, typed arrays

```
[...range]                                   [1,2,3]
  return() called (cleanup)                  yes
  return() called (cleanup)                  yes
const [first] = range                        1
spread iterator twice                        [[1,2,3],[]]
generator is its own iterator (one-shot)     [[1,2],[]]
  naturals finally                           ran
  naturals finally                           ran
naturals().filter(odd).map(sq).take(3)       [1,9,25]
Iterator.from({next}) has helpers            function
map.keys().map(...) without Array.from       ["A","B"]
values pulled for take(2)                    2
Array.map then slice(0,2) calls map fn       5
Uint8Array: 256, -1, 3.7 stored as           [0,255,3]
Uint8ClampedArray: 300, -5                   [255,0]
DataView setUint16 BE -> bytes               [1,2]
Uint16Array over same bytes (platform LE)    201
subarray shares memory, slice copies         [99,99]
Buffer is a Uint8Array subclass              true
```

## `re-01-semantics.mjs`: `lastIndex`, прапорці, Unicode, `replace`, `RegExp.escape`, `URL`

```
/a/g.test("a") x3                              [true,false,true]
same validator on ["1","2","3"]                [true,false,true]
without g                                      [true,true,true]
/foo/y at lastIndex 3 on "barfoo"              true
/foo/y at lastIndex 2 (no scanning ahead)      false
match(/id=(\d+)/g)                             ["id=7","id=42"]
matchAll groups                                ["7","42"]
matchAll without g                             TypeError: String.prototype.matchAll called with a non-global RegExp argument
replaceAll without g                           TypeError: String.prototype.replaceAll called with a non-global RegExp argument
matchAll leaves regex.lastIndex alone          0
/(?<y>\d{4})/d indices.groups.y                [3,7]
"😀".length, /^.$/.test, /^.$/u.test           [2,false,true]
\w and \b are ASCII-only even with u           [false,null]
\p{L} with u                                   ["Київ"]
/s: dot matches \n only with s                 [false,true]
/m: ^ per line                                 ["a","b"]
[\p{L}--[a-z]] (v)                             ["Д","Е"]
[\p{L}&&\p{Script=Cyrillic}] (v)               ["К","Д"]
\p{RGI_Emoji} matches a family emoji whole     8
u and v together                               SyntaxError
modifiers (?i:a)b on "Ab" / "AB"               [true,false]
duplicate named groups in alternatives         ["2026","2026"]
lookbehind price                               20
replace $<d>.$<m>.$<y>                         30.10.2026
replace with a function                        a[1@1]b[2@3]
string pattern replaces only first             a-a.a
"$&" in replacement string is special          cost: $5
new RegExp("a.b").test("aXb")                  true
RegExp.escape("a.b")                           \x61\.b
escaped: test("aXb"), test("a.b")              [false,true]
new RegExp("price (USD")                       SyntaxError
RegExp.escape("price (USD")                    \x70rice\x20\(USD
URL "https://example.com/a?b=1"                protocol=https: host=example.com
URL "javascript:alert(1)"                      protocol=javascript: host=
URL "http://exa mple.com"                      invalid
URL "https://user:pw@evil.com@good.com/"       protocol=https: host=good.com
```

## `re-02-backtracking.js`: Irregexp проти лінійного рушія V8

```
node v24.14.1 | execArgv (none)
n=16  /^(a+)+$/ -> false in     28.5 ms
n=18  /^(a+)+$/ -> false in     18.5 ms
n=20  /^(a+)+$/ -> false in     36.7 ms
n=22  /^(a+)+$/ -> false in    183.4 ms
n=24  /^(a+)+$/ -> false in   1144.1 ms
/^a+$/ on 1e6 chars -> false in 19.0 ms
node v24.14.1 | execArgv --enable-experimental-regexp-engine
n=16  /^(a+)+$/ -> false in     47.3 ms   | /^(a+)+$/l -> false in 0.05 ms
n=18  /^(a+)+$/ -> false in     41.6 ms   | /^(a+)+$/l -> false in 0.02 ms
n=20  /^(a+)+$/ -> false in    132.4 ms   | /^(a+)+$/l -> false in 0.02 ms
n=22  /^(a+)+$/ -> false in    199.7 ms   | /^(a+)+$/l -> false in 0.02 ms
n=24  /^(a+)+$/ -> false in    630.8 ms   | /^(a+)+$/l -> false in 0.06 ms
/^a+$/ on 1e6 chars -> false in 8.9 ms
/(a)\1/l -> SyntaxError: Invalid regular expression: /(a)\1/l: Cannot be executed in linear time
/(?<=a)b/l accepted
/a(?=b)/l -> SyntaxError: Invalid regular expression: /a(?=b)/l: Cannot be executed in linear time
node v24.14.1 | execArgv --enable-experimental-regexp-engine-on-excessive-backtracks
n=16  /^(a+)+$/ -> false in     11.2 ms
n=18  /^(a+)+$/ -> false in      4.0 ms
n=20  /^(a+)+$/ -> false in      1.5 ms
n=22  /^(a+)+$/ -> false in      1.4 ms
n=24  /^(a+)+$/ -> false in      1.4 ms
/^a+$/ on 1e6 chars -> false in 16.5 ms
```

Малі `n` шумлять (компіляція й tier-up регулярки); від n=20 час Irregexp росте приблизно вчетверо
на кожні +2 символи. Прапорці V8 експериментальні й не призначені для продакшну.
