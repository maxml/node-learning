# Приклади: алгоритми і структури даних

Код експериментів, на які спираються нотатки
`Obsidian Vault/Engineering/General/Алгоритми/`: `Складність алгоритмів.md`,
`Структури даних.md`, `Сортування і пошук.md`, `Рекурсія і динамічне програмування.md`.

Залежностей немає: лише Node.js. Прогін нижче зроблено на Node v24.14.1 (V8
13.6.233.17-node.44), Linux x64, 2026-10-30. Машина була спільна з іншими процесами
(load average 5–6 під час фінального прогону, до 28 раніше того ж дня), тож мілісекунди
між прогонами плавали в 1,5–3 рази. Порівнювати варто співвідношення й тренди, а лічильники
(порівняння, виклики, кроки, глибина стеку) від прогону до прогону однакові.

| Файл                     | Що показує                                                                                                     |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `structures.js`          | `RingQueue`, `SlidingWindowLimiter`, `MinHeap`, `LRUCache` на `Map`, `Trie` + самотести; модуль для інших скриптів |
| `complexity.js`          | амортизований `push` (правило росту V8 `old + old/2 + 16`), локальність пам'яті, `Map.get` проти розміру        |
| `queue-shift-vs-ring.js` | черга на `push`+`shift` проти кільцевого буфера й індексу голови; ~1,5 хв через квадратичний `shift`            |
| `sort.js`                | рядкове сортування за замовчуванням, стабільність, boolean-компаратор, кількість порівнянь TimSort проти log₂(n!), TypedArray |
| `search-graph.js`        | `lowerBound` і пастки бінарного пошуку, BFS проти DFS, рекурсивний DFS проти стеку, Дейкстра проти Беллмана–Форда, top-k купою |
| `recursion-depth.js`     | глибина рекурсії від розміру кадру, відсутність хвостових викликів, `--stack-size` і `SIGSEGV`, стек воркера, асинхронна рекурсія |
| `dp.js`                  | Фібоначчі (наївно, мемоізація, табуляція, `BigInt`), факторіал, Евклід з `%` і з відніманням, LCS, KMP           |
| `v8-elements.js`         | dictionary elements після `a[1e9] = 1`, dictionary properties після `delete` (потрібен `--allow-natives-syntax`) |
| `old-examples-bugs.js`   | відтворює дефекти старих прикладів `../ex_algorithms` і `../ex_data_structures`, лише читаючи їхній код           |

## Запуск

```bash
cd examples/algorithms
node structures.js
node complexity.js
node queue-shift-vs-ring.js
node sort.js
node search-graph.js
node recursion-depth.js
node dp.js
node --allow-natives-syntax v8-elements.js
node old-examples-bugs.js
```

`recursion-depth.js` навмисно запускає дочірні процеси з `--stack-size=20000` і `65500`:
вони падають з `SIGSEGV`, бо прапорець перевищує реальний стек потоку (`ulimit -s` 8 МБ).
Це очікуваний результат, а не збій скрипта.

## Результати прогону 2026-10-30

### structures.js

```
structures.js: all self-tests passed
```

### complexity.js

```
1a) push: replay of V8 growth rule (old + old/2 + 16)
  n=    10000  regrowths 15, elements copied 27431 = 2.74 per push
  n=  1000000  regrowths 26, elements copied 2418566 = 2.42 per push
  n= 10000000  regrowths 32, elements copied 27558003 = 2.76 per push
1b) push: measured total ns/op (no per-op timer) and worst single push
  n=    10000  avg  85.4 ns/op  worst single push 890 us at length 4866
  n=   100000  avg 112.8 ns/op  worst single push 1433 us at length 76300
  n=  1000000  avg  93.1 ns/op  worst single push 16152 us at length 869461
  n= 10000000  avg  71.4 ns/op  worst single push 570117 us at length 9904066

2) locality: sum of 16M doubles (128 MB), same work, different order
  sequential 64 ms, random 372 ms, ratio 5.8x

3) Map.get: ns per lookup (1M random hits) vs map size
  size=    1000    48.4 ns/get
  size=   10000    59.6 ns/get
  size=  100000   105.4 ns/get
  size= 1000000   166.2 ns/get
  size= 4000000   205.9 ns/get
```

Раніше того ж дня під load average ~28 співвідношення в пункті 2 було 8,4× (119 мс проти
1004 мс).

### queue-shift-vs-ring.js

```
        N   shift ms    ns/op  | ring ms    ns/op | head-idx ms    ns/op
     1000        0.5      521 |      0.6      576 |         0.4      436
    10000        4.5      452 |      4.4      444 |         7.4      739
    50000      591.3    11827 |      7.2      144 |         6.7      134
   100000     2544.2    25442 |     20.3      203 |        16.8      168
   200000    10883.2    54416 |     49.3      247 |        34.0      170
   400000    59541.5   148854 |    128.4      321 |        77.2      193
```

### sort.js

```
1) [10, 9, 1, 100].sort() -> [1,10,100,9]
   with (a, b) => a - b    -> [1,9,10,100]

2) stability on 100000 records with 10 distinct keys: 0 order violations

3) comparator returning boolean, 1000 random ints: result sorted? false; equals correct sort? false
   [3, 1, 2].sort((a, b) => a > b) -> [3,1,2]

4) comparisons made by V8 sort (TimSort) vs the lower bound log2(n!)
       n   sorted  reversed    random   log2(n!)   n*log2(n)
    1000       999       999      8651       8530        9966
   10000      9999      9999    119918     118459      132877
  100000     99999     99999   1529103    1516705     1660964
 1000000    999999    999999  18605014   18488885    19931569

6) 1000000 random doubles: Array#sort with comparator 1607 ms, Float64Array#sort 234 ms

7) toSorted leaves the original intact: [3,1,2] -> [1,2,3]
```

### search-graph.js

```
1) lowerBound matches linear scan on 20000 random cases (with duplicates, empty arrays, out-of-range x)
   closed interval with hi = mid on [1,2,3], x=2 -> INFINITE LOOP
   lo=2^30, hi=2^31-2: (lo + hi) >> 1 = -536870913; (lo + hi) >>> 1 = 1610612735; lo + ((hi - lo) >> 1) = 1610612735

2) path length to D: BFS = 1 , DFS tree depth = 1
   same graph, neighbours listed in another order: BFS = 1 , DFS tree depth = 3
   iterative DFS on a 1M-vertex chain, depth of last vertex = 999999
   recursive DFS: RangeError: Maximum call stack size exceeded after 5452 vertices

3) Dijkstra (both variants) == Bellman-Ford on 300 random graphs with non-negative weights
   negative edge, textbook Dijkstra: [0,-5,5,2] Bellman-Ford: [0,-5,5,-4]
   negative edge, lazy-deletion variant (re-inserts vertices): [0,-5,5,-4] (correct here only because it stops being Dijkstra: vertices are re-processed)

4) top-10 of 2000000: heap 104 ms, full sort 3903 ms (same result)
```

### recursion-depth.js

```
1) depth reached before RangeError (default --stack-size=984):
   run 1: plain 10451, two-frame tiny 5016, two-frame fat 3688
   run 2: plain 10451, two-frame tiny 5016, two-frame fat 3688
   run 3: plain 10451, two-frame tiny 5016, two-frame fat 3688

2) tail-recursive sumTo(1e6, 0) in strict mode:
   RangeError: Maximum call stack size exceeded (no tail call elimination)
   loop version -> 500000500000

3) --stack-size in a child process:
   --stack-size=  984: {"plain":10451,"tiny":5016,"fat":3688}  [exit 0]
   --stack-size= 2000: {"plain":21289,"tiny":10218,"fat":7513}  [exit 0]
   --stack-size= 4000: {"plain":42622,"tiny":20458,"fat":15043}  [exit 0]
   --stack-size= 7000: {"plain":74622,"tiny":35818,"fat":26337}  [exit 0]
   --stack-size=20000: (no output)  [killed by SIGSEGV]
   --stack-size=65500: (no output)  [killed by SIGSEGV]

4) worker threads:
   default resourceLimits: plain depth 41390
   stackSizeMb: 1:         plain depth 8622
   stackSizeMb: 16:        plain depth 172462

5) async recursion with await before the recursive call:
   countDown(1e6) = 1000000 (no RangeError), heapUsed 418 MB
```

### dp.js

```
1) Fibonacci
   F(20) = 6765: naive calls 21891 (2*F(21)-1 = 21891), memo calls 39
   F(25) = 75025: naive calls 242785 (2*F(26)-1 = 242785), memo calls 49
   F(30) = 832040: naive calls 2692537 (2*F(31)-1 = 2692537), memo calls 59
   Number Fibonacci first differs from BigInt at n=79: 14472334024676220 vs 14472334024676221; MAX_SAFE_INTEGER=9007199254740991
   F(1477) as Number via loop: Infinity

2) Factorial
   170! as Number = 7.257415615307994e+306; 171! = Infinity
   Number factorial first inexact at n=23: 25852016738884978212864 vs 25852016738884976640000
   171! as BigInt has 310 digits

3) Euclid: steps
   gcd(1000000000, 1) = 1: modulo 1 steps, subtraction 999999999 steps
   gcd(832040, 514229) = 1: modulo 28 steps, subtraction 28 steps
   gcd(123456789, 6) = 3: modulo 2 steps, subtraction 20576132 steps

4) LCS
   lcs('ABCDFGHR', 'AEDFHBR') = 'ADFHR'
   length matches brute force on 3000 random pairs

5) KMP
   prefix function of 'ABCDABD' = [0,0,0,0,1,2,0]
   prefix function of 'aabaaab' = [0,1,0,1,2,2,3]
   all matches equal indexOf on 50000 random cases (overlaps included)
   text 'a'x100000, pattern 'a'x999+'b': KMP 199001 comparisons (<= 2n = 200000), naive 99001000
```

### v8-elements.js

```
dense array, dictionary elements?         false
after a[1e9] = 1, dictionary elements?    true
object literal, fast properties?          true
after delete o.a, fast properties?        false
```

### old-examples-bugs.js

```
- ex_data_structures/exStack.js: push 1,2,3 then pop() -> 1 (a stack must return 3)
- ex_data_structures/exQueue.js: get() returns the queue itself, the dequeued value 1 is lost; it is also Array#shift (O(n) on large arrays)
- ex_data_structures/exLinkedList.js: creating a node defines a global toString: before=false, after=true
- ex_data_structures/exGraph.js: a.hasEdge(e) = false, g.findEdge(a, b) = null (edge exists)
- ex_data_structures/exGraph.js: getAdjacencyMatrix() throws TypeError: Cannot read properties of null (reading 'weight')
- ex_data_structures/exGraph.js: deleteEdge(e) throws TypeError: this.edges.delete is not a function
- ex_data_structures/exTree.js: new BinaryTree() throws ReferenceError: BinarySearchTreeNode is not defined
- ex_algorithms/fibonacci.js: fibonacciNth(79) = 14472334024676220 (exact: 14472334024676221), fibonacciNth(1477) = Infinity
- ex_algorithms/fibonacci.js: fibonacciNth(0): Script execution timed out after 500ms (infinite loop)
- ex_algorithms/euclidian.js: gcd(1e8, 1): iterative (subtraction) 619 ms, recursive (modulo) 0.134 ms; non-integers accepted: gcd(0.1, 0.3) = 2.7755575615628914e-17
- ex_algorithms/factorial.js: factorial(171) = Infinity, factorial(23) = 25852016738884978212864 (exact 25852016738884976640000), factorialRecursive(-5) = 1
- ex_algorithms/kmp.js: first-match result vs indexOf on 200000 random cases: 0 mismatches (correct; returns only the first match)
- ex_algorithms/lcs.js: lcs('abc', 'xyz') = [""] (length 1 for an empty answer)
```
