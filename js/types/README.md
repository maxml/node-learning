# Типи, перетворення, числа, рядки й дати в JavaScript

Експерименти, на які спираються позначки «перевірено» в нотатках
`Obsidian Vault/Engineering/General/JavaScript/`:
«Типи даних у JavaScript», «Перетворення типів у JavaScript», «Числа, рядки й дати в JavaScript».

Прогін 2026-10-30: Node v24.14.1 (V8 13.6.233.17-node.44), npm 11, Linux x64.
Node 25.9.0 і 26.13.0 запускались з офіційних Docker-образів `node:25`, `node:26`.
Залежності закріплені точно: `lodash@4.18.1`, `moment@2.31.0`.

| Файл | Що показує |
| --- | --- |
| `01-primitives-vs-objects.js` | `typeof` усіх типів, ідентичність, доступ до властивостей примітива через ToObject (strict і sloppy), обгортки `new String`, call by sharing, `const` і `Object.freeze`, пошук об'єктів у `Map`/`Set`/`includes` |
| `02-equality-and-copying.js` | `===`/`Object.is`/SameValueZero на `NaN` і `-0`, `null`/`undefined` у `==`, поверхневі копії, `structuredClone` (що зберігає, на чому падає), втрати JSON round trip, `v8.serialize`, `instanceof` між realm |
| `03-coercion.js` | порядок `valueOf`/`toString` за підказкою, `Symbol.toPrimitive`, оператор `+`, пазли `==`, `<` на рядках, `Number`/`parseInt`/`+`, правила `JSON.stringify` |
| `04-numbers-strings-dates.js` | binary64, `MAX_SAFE_INTEGER`, `EPSILON` і відносний допуск, `toFixed`, `Math.round`, гроші в копійках, BigInt, UTF-16 і графеми, нормалізація, `Intl.Collator`, `Date` (парсинг, місяці з 0, DST у Києві), `Intl.DateTimeFormat` |
| `05-v8-representation.js` | деталь рушія: Smi / HeapNumber / Oddball / інтерновані рядки через `%DebugPrint` |
| `06-old-examples-check.js` | що насправді друкують фрагменти старих `practice/*.js` (оригінали не змінювались) |
| `07-lodash-clonedeep.js` | `_.cloneDeep` проти `structuredClone` |
| `08-runtime-features.js` | Temporal і нові API ES2026 у Node 24 / 25 / 26 |
| `09-moment-pitfalls.js` | чому moment не для нового коду: мутабельність, fallback-парсинг, глобальна локаль |

## Запуск

```bash
npm ci
npm run all     # 01–04, 06, 07, 09; 04 і 09 з TZ=Europe/Kyiv
npm run v8 | grep -E '^#|DebugPrint|- type'
docker run --rm -v "$PWD":/w -w /w node:26 node 08-runtime-features.js
```

## Результати прогону 2026-10-30 (уривки, дослівно)

`01-primitives-vs-objects.js`:

```
typeof null                                  object
typeof class A {}                            function
s.extra = 1 (strict)                         TypeError: Cannot create property 'extra' on string 'hello'
sloppy: p.extra = 1; p.extra                 undefined
'x'.whoAmI() in strict mode (this not boxed) string
'x'.whoAmISloppy() sloppy (this boxed)       object
new String('a') === 'a'                      false
Boolean(new Boolean(false))                  true
new Symbol('x')                              TypeError: Symbol is not a constructor
mutate(target) -> target                     {"touched":true}
reassign(target) -> target                   {"touched":true}
swap(x, y) -> x.id, y.id                     x, y
Object.freeze is shallow: frozen.inner.v     2
map.get({id:1}) with a new literal           undefined
new Set([{a:1},{a:1}]).size                  2
[{a:1}].includes({a:1})                      false
```

`02-equality-and-copying.js`:

```
[NaN].indexOf(NaN)  (===)                      -1
[NaN].includes(NaN) (SameValueZero)            true
new Set([0, -0, NaN, NaN]).size                2
new Map([[-0,...]]).keys() -> Object.is(k, -0) false
null >= 0  (relational uses ToNumber)          true
spread.nested === src.nested                   true
spread invokes getter, copy is a data prop     true, calls=1
array from another realm: instanceof Array     false
cycle preserved: c.self === c                  true
prototype lost: c instanceof User              false
structuredClone(function)                      DataCloneError
structuredClone(Promise)                       DataCloneError
symbol-keyed props survive clone?              false
JSON.stringify(lossy)                          {"d":"1970-01-01T00:00:00.000Z","m":{},"set":{},"nan":null,"inf":null,"negZero":0,"arr":[null,null,null],"re":{}}
JSON.stringify({ big: 1n })                    TypeError: Do not know how to serialize a BigInt
v8 round trip keeps Date, Map, BigInt          true
```

`03-coercion.js`:

```
`${traced}`        (hint string)               "str"  [toString]
traced + 1         (hint default)              43  [valueOf]
traced * 2         (hint number)               84  [valueOf]
Date: d + 1 (default hint -> string!)          string
[1,2] + [3]                                    "1,23"
'b' + 'a' + +'a' + 'a'                         "baNaNa"
1n + 1                                         TypeError: Cannot mix BigInt and other types, use explicit conversions
[] == ![]                                      true
'' == '0'                                      false
1n == '1'                                      true
"10" < "9"  (both strings: code units)         true
null > 0, null == 0, null >= 0                 false, false, true
"": Number / +s / parseInt / parseFloat        0 / 0 / NaN / NaN
"0x1f": Number / +s / parseInt / parseFloat    31 / 31 / 0 / 0
parseInt(0.0000005)                            5
['1','7','11'].map(parseInt)                   1,NaN,3
Number("-0x10")                                NaN
eval("{} + []") (leading {} is a block)        0
undefined/function in object, in array         {} [null,null]
```

`04-numbers-strings-dates.js` (`TZ=Europe/Kyiv`):

```
(0.1).toPrecision(21)                              0.100000000000000005551
9007199254740993 (literal)                         9007199254740992
1.005.toFixed(2)                                   1.00
Math.round(-2.5), Math.round(2.5)                  -2, 3
|1000.1+1000.2-2000.3| < EPSILON (absolute misuse) false
gap to next double at 1 / at 1000 / ratio          2.220446049250313e-16 / 1.1368683772161603e-13 / 512
typeof Math.sumPrecise                             undefined
integer kopiyky sum                                2510
Intl.NumberFormat uk-UA UAH                        25,10 ₴
Number(2n ** 64n) (precision loss)                 18446744073709552000
family 👨‍👩‍👧: length / [...s].length / graphemes 8 / 5 / 1
flag 🇺🇦: length / [...s].length / graphemes      4 / 2 / 1
'😀'.slice(0, 1).isWellFormed()                    false
['я','ї','а','є','і'].sort()                       аяєії
sorted with Intl.Collator('uk')                    аєіїя
new Date('2026-10-30') (date-only = UTC)           2026-10-30T00:00:00.000Z
new Date('2026-10-30T00:00') (date-time = local)   2026-10-29T22:00:00.000Z
new Date(2026, 1, 31) overflow -> Mar 3            Tue Mar 03 2026
Kyiv DST end 2026-10-25: +24h local time           11:00:00 GMT+0200
Kyiv DST end 2026-10-25: setDate(+1) local time    12:00:00 GMT+0200
nonexistent local 2026-03-29 03:30 (spring gap)    04:30:00 GMT+0300
ambiguous local 2026-10-25 03:30 (repeated hour)   03:30:00 GMT+0300
V8 max string length (buffer.constants)            536870888
Intl.DateTimeFormat Kyiv                           30 жовт. 2026 р., 11:00
typeof Temporal                                    undefined
```

`05-v8-representation.js` (`--allow-natives-syntax`):

```
# pointer compression in this build: 0
# max 32-bit Smi (2**31-1)
DebugPrint: Smi: 0x7fffffff (2147483647)
# 2**31
 - type: HEAP_NUMBER_TYPE
# undef
DebugPrint: [Oddball] in ReadOnlySpace: #undefined
# literal
 - type: INTERNALIZED_ONE_BYTE_STRING_TYPE
# built
 - type: SEQ_ONE_BYTE_STRING_TYPE
```

(адреси з виводу `%DebugPrint` прибрано; вони різні між запусками)

`06-old-examples-check.js`:

```
switch('BOYS') with object cases ->                        default
new String(Ranges.CHILD).toLowerCase()                     [object object]
[6, 12, 16] + [4, 7, 18, 19]                               "6,12,164,7,18,19"
{a:0, b:0, c:1} (deleting while re-reading keys)           {"b":0,"c":1}
sum(1)(2).toString()   (comment says 3)                    NaN
f.bind({name}).bind({surname})()                           Johnundefined
```

`07-lodash-clonedeep.js`:

```
lodash: prototype kept (instanceof User)         true
lodash: function property                        same function: true
lodash: _.cloneDeep(fn) top-level                {}
structuredClone: prototype kept                  false
```

`08-runtime-features.js`:

```
v24.14.1 (V8 13.6.233.17-node.44)
  Temporal                                 no
  Math.sumPrecise (ES2026)                 no
  Uint8Array.fromBase64 (ES2026)           no
  Map.prototype.getOrInsert (ES2026)       no
v25.9.0 (V8 14.1.146.11-node.25)
  Temporal                                 no
  Uint8Array.fromBase64 (ES2026)           yes
  Map.prototype.getOrInsert (ES2026)       no
v26.13.0 (V8 14.6.202.34-node.40)
  Temporal                                 yes
  Math.sumPrecise (ES2026)                 no
  Map.prototype.getOrInsert (ES2026)       yes
  PlainDate 2026-01-31 + 1 month        2026-02-28
  Kyiv 2026-10-24T12:00 + 1 day         2026-10-25T12:00:00+02:00[Europe/Kyiv]
  Kyiv 2026-10-24T12:00 + 24 hours      2026-10-25T11:00:00+02:00[Europe/Kyiv]
```

`Error.isError`, `Array.fromAsync`, `isWellFormed`, `Intl.Segmenter` є в усіх трьох.
У Node 24 Temporal доступний лише з прапорцем V8 `--harmony-temporal`
(«in progress / experimental» у `node --v8-options`).

`09-moment-pitfalls.js`:

```
moment.version                                       2.31.0
end === start after start.add(1, "day")              true
start after add (start moved too)                    2026-10-31T10:00:00.000Z
'2026/10/30': valid? / deprecation warning?          true / true
'30.10.2026' (falls back to Date, which rejects it)  false
moment('12/25/1995', 'MM-DD-YYYY').isValid()         true
same with strict=true                                false
```
