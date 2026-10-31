# Modules, V8 memory and JS practices: experiments

Runtime evidence behind three vault notes: «Модулі в JavaScript», «Пам'ять і продуктивність у V8»,
«Практики JavaScript». Every script is self-contained and has no npm dependencies, except
`practices/lint/` (ESLint, exact versions pinned in its `package.json`).

Runs below: Node **v24.14.1** (V8 13.6.233.17), Linux x64, 2026-10-30. Docker runs: image
`node:24-slim` (Node v24.22.2).

## modules/

| Script | Shows |
| --- | --- |
| `cjs/01-wrapper-cache.js` | module wrapper (5 arguments, `this === module.exports`), cache = singleton per resolved filename, `delete require.cache[...]` re-evaluates, `exports = …` exports nothing |
| `cjs/02-cycle.js` | CJS cycle returns a partial `exports`; destructuring freezes the partial values (complements `ex_require/cycle/`) |
| `esm/01-live-bindings.mjs` | live bindings, read-only imports, sealed namespace, module code is strict, no `require`/`__dirname`, `import.meta.dirname` |
| `esm/02-cycle.mjs` | ESM cycle: function declarations usable, `const` in TDZ (`ReferenceError`), live value after evaluation |
| `interop/01-import-cjs.mjs` | ESM importing CJS: `default` = `module.exports`; which named exports the static lexer detects; missing name fails at link time |
| `interop/03-require-esm.cjs` | `require(esm)`: namespace result, `"module.exports"` export name, `ERR_REQUIRE_ASYNC_MODULE` with top-level `await` |
| `json-wasm/01-json-wasm.mjs` | JSON modules need `with { type: 'json' }`; one shared mutable object (also for `require`); importing a real `.wasm` without a flag |
| `dual/01-hazard.cjs` | dual-package hazard: `import` and `require` of one package give two copies, `instanceof` fails, state splits |
| `dual-sync/01-no-hazard.cjs` | the same package routed through the `"module-sync"` condition: one copy |

Output (2026-10-30):

```
$ node modules/cjs/01-wrapper-cache.js
wrapper arguments.length       : 5
this === module.exports        : true
same object via ./counter(.js) : true | count seen through b: 2
cache key                      : counter.js
after delete require.cache     : same object? false | count: 0
absolute path to same file     : same object as c? true
exports = {...} vs module.exports.x: { kept: true }

$ node modules/cjs/02-cycle.js
in b: a.done = false | destructured done = false | name = a
in a: b.done = true
after both finished: { viaObject: true, viaDestructured: false }

$ node modules/esm/01-live-bindings.mjs
before inc: 0
after inc : 2 (the importer sees the exporter's variable)
assign to import: TypeError - Assignment to constant variable.
namespace sealed/frozen: true false | descriptor of count: {"value":2,"writable":true,"enumerable":true,"configurable":false}
ns.count = 5 -> TypeError
this at module top level: undefined
typeof require/module/__dirname: undefined undefined undefined
import.meta.dirname ends with: modules/esm
strict by default (function this): undefined

$ node modules/esm/02-cycle.mjs
b evaluates; hoistedA() = A-fn
fromA -> ReferenceError: Cannot access 'fromA' before initialization
a evaluates; fromB = B-const
after evaluation, readALater() = A-const

$ node modules/interop/01-import-cjs.mjs
exports.x = ...        -> alpha, beta, default, module.exports
module.exports = {a,b} -> default, delta, gamma, module.exports
module.exports = f()   -> default, module.exports | default has: epsilon, zeta
import { epsilon } from lib-dynamic.cjs -> SyntaxError: Named export 'epsilon' not found. The requested module './lib-dynamic.cjs' is a CommonJS module, which may not support all module.exports as named exports.

$ node modules/interop/03-require-esm.cjs
process.features.require_module: true
require(esm) returns the namespace: [ '__esModule', 'default', 'named' ] | default(): default-from-esm
"module.exports" export name     : function x
require(esm with TLA)            : ERR_REQUIRE_ASYNC_MODULE
import() of the same module      : { ready: true }

$ node modules/json-wasm/01-json-wasm.mjs
JSON default import: { port: 8080, features: [ 'a', 'b' ] }
second import sees mutation: 9999 | same object: true
require(json) after import: 9999 | same object: true
import json without attribute -> ERR_IMPORT_ATTRIBUTE_MISSING
import of .wasm: add(2, 3) = 5
(node:…) ExperimentalWarning: Importing WebAssembly module instances is an experimental feature and might change at any time

$ node modules/dual/01-hazard.cjs
flavours                : cjs esm
state shared?           : false
err instanceof AppError : false

$ node modules/dual-sync/01-no-hazard.cjs
flavours                : esm esm
state shared?           : true
err instanceof AppError : true
```

Note on `examples/ex_require/wasm.wasm`: it is not WebAssembly. Its bytes are the JavaScript text
`console.log('jhgfh')`; `require()` parses any unknown extension as JavaScript, so
`require('./wasm.wasm')` prints `jhgfh` and returns `{}`.

## v8/

| Script | Run with | Shows |
| --- | --- | --- |
| `01-shapes.js` | `node --allow-natives-syntax` | hidden classes: property order decides the shape (the lecture's `Point` example), `delete` → dictionary mode, `= undefined` keeps the shape |
| `02-inline-caches.js` | `node` (add `--trace-opt --trace-deopt` to see tiers) | the same `o.x` over 1 / 4 / 16 shapes |
| `03-leaks.js` | `node --expose-gc` | retained heap for listener, `Map` cache, `setInterval` leaks vs fixes (`off`, `WeakMap`) |
| `04-heap-snapshot-diff.js` | `node` | two `v8.writeHeapSnapshot()` files, diffed by constructor like DevTools "Comparison" |

```
$ node --allow-natives-syntax v8/01-shapes.js
Point x,y then a,b  vs  x,y then b,a  same map: false
Point x,y then a,b  vs  x,y then a,b  same map: true
{x,y} vs {y,x} same map: false
delete first prop -> fast properties: false
delete last prop  -> fast properties: false
x = undefined     -> fast properties: true | same map as {x,y,z}: true
object with 2000 dynamic keys -> fast properties: false
```

`02-inline-caches.js`, four runs (median of 7 rounds over 1M objects; ratio to the monomorphic case):

| run | mono | poly (4 shapes) | mega (16 shapes) |
| --- | --- | --- | --- |
| 1 | 14.19 ms | ×1.2 | ×3.6 |
| 2 | 16.13 ms | ×0.9 | ×3.3 |
| 3 | 13.22 ms | ×1.4 | ×3.9 |
| 4 | 12.89 ms | ×1.3 | ×3.7 |

The megamorphic slowdown (×3.3–3.9) reproduced in every run; the polymorphic one did not
(×0.9–1.4, inside the noise). `--trace-opt --trace-deopt` shows each loop going
Sparkplug → Maglev (OSR) → TurboFan (OSR), plus deopts unrelated to shapes: `reason: overflow`
when the running sum leaves the Smi range and `reason: not a Smi`. That is a benchmark pitfall
in itself: the measured code is not the code you think.

```
$ node --expose-gc v8/03-leaks.js
node v24.14.1, heap_size_limit 4288.0 MB
baseline heapUsed    3.6 MB; each scenario: 2000 requests x ~100 KB
listener leak (on, never off)      retained  195.7 MB
listener fixed (once/off)          retained    0.0 MB
Map cache keyed by request id      retained  195.6 MB
WeakMap keyed by request object    retained    0.0 MB
setInterval never cleared          retained  196.0 MB
listeners still on bus: 2000 | cache size: 2000
after removing listeners, clearing cache and intervals: heapUsed    4.1 MB (baseline    3.6 MB)

$ node v8/04-heap-snapshot-diff.js
top growth between snapshots (5000 requests in between):
  system / Context     +  5000 objects  +195 KiB self size
  RequestContext       +  5000 objects  +195 KiB self size
snapshot file sizes: 4.5 MB, 8.6 MB
```

The `.unref()` on the leaked intervals lets the process exit but does not release them: an
unref'd timer is still referenced by the timer list.

### Default heap limit vs container memory (Docker, `node:24-slim`, Node v24.22.2)

```
for m in 128m 256m 512m 768m 1g 2g 4g 8g; do
  docker run --rm -m $m node:24-slim node -p "'$m: '+(require('v8').getHeapStatistics().heap_size_limit/2**20).toFixed(0)+' MiB'"
done
```

| `-m` | 128m | 256m | 512m | 768m | 1g | 2g | 4g | 8g | host 32 GB, no cgroup limit (v24.14.1) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `heap_size_limit` MiB | 259 | 259 | 259 | 432 | 560 | 1120 | 2240 | 2240 | 4288 |

Matches V8's `Heap::HeapSizeFromPhysicalMemory` (deps/v8/src/heap/heap.cc at v24.14.1): old
generation = memory / 4 × 2 (64-bit multiplier) = half, floored at 256 MiB, capped at 2 GiB
(4 GiB when memory ≥ 15 GiB), plus the young generation. Node passes
`min(total memory, cgroup limit)` (src/api/environment.cc, since v12.7.0).

Consequence, reproduced: with `-m 256m` the heap limit (259 MiB) is above the container limit,
so a growing array is killed by the kernel OOM killer (exit code 137) at heapUsed ≈ 182 MiB,
RSS ≈ 236 MiB, without any V8 "heap out of memory" message:

```
docker run --rm -m 256m node:24-slim node -e "…push objects every 1 ms, print heapUsed/rss…"
limit 259
heapUsed 102 rss 154
heapUsed 182 rss 236
exit=137
```

`--max-old-space-size=400` in a 512m container gave 403 MiB; `--max-old-space-size-percentage=75`
gave 387 MiB (flag added in v24.6.0).

## practices/

```
$ node practices/01-strict-and-errors.js
sloppy: typo created globalThis.totl = 1
strict: typo -> ReferenceError: totall is not defined
sloppy write to frozen: no error, value still 1
strict write to frozen -> TypeError
sloppy this in plain call: object | strict: undefined
thrown string: typeof string | stack: undefined | instanceof Error: false
wrapped: config: cannot parse settings.json | cause: SyntaxError: Expected property name or '}' in JSON at position 1 (line 1 column 2)
foreign instanceof Error: false | Error.isError(foreign): true
order still has qty: 1
spread is shallow: copy.nested === src.nested -> true
```

`practices/lint/`: `npm ci && npx eslint .` (ESLint 10.14.0, flat config; re-run 2026-10-31 after
the bump from 10.13.0, output unchanged). `package.json` overrides `minimatch` to 11.0.3: ESLint
10.14 and `@eslint/config-array` still ask for `minimatch@^10.2`, and GHSA-g3hv-75wg-m249 (DoS via
globparts amplification) is fixed only in 11.0.1; with the override `npm audit` reports 0
vulnerabilities and the lint output below is identical. The folder also has a
`.eslintrc.json` that bans `console`; ESLint 10 ignores it (eslintrc was removed in 10.0.0), so
the `console.log` line in `bad.js` is not reported:

```
bad.js
   2:1   error  Unexpected var, use let or const instead                         no-var
   3:5   error  'limit' is never reassigned. Use 'const' instead                 prefer-const
   6:7   error  Expected a conditional expression and instead saw an assignment  no-cond-assign
   6:7   error  Unexpected constant condition                                    no-constant-condition
   6:7   error  Assignment to property of function parameter 'order'             no-param-reassign
   7:16  error  Expected '===' and instead saw '=='                              eqeqeq
   9:3   error  'totl' is not defined                                            no-undef
  10:7   error  Use the isNaN function to compare with NaN                       use-isnan
  10:19  error  Expected '===' and instead saw '=='                              eqeqeq
  10:27  error  Expected an error object to be thrown                            no-throw-literal
✖ 10 problems (10 errors, 0 warnings)
```

Not caught: `order.items.push(item)` (line 8) mutates the caller's argument through a method call,
which `no-param-reassign` with `props: true` does not see.
