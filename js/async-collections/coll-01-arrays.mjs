// Arrays are objects with an exotic `length`; holes; sort; copy-vs-mutate methods.
const show = (label, v) => console.log(label.padEnd(36), typeof v === 'string' ? v : JSON.stringify(v));

// 1) Indices are string keys; length is tied to the largest index.
const a = ['x', 'y', 'z'];
show('Object.keys([x,y,z])', Object.keys(a));
show("a['1'] === a[1]", a['1'] === a[1]);
a.length = 1;
show('after a.length = 1', a);
const b = [];
b[99] = 1;
show('b[99] = 1 -> length', b.length);
b['-1'] = 'neg'; b['1.5'] = 'frac';
show('b["-1"], b["1.5"] -> length', b.length);
show('b.at(-1) vs b[-1]', [b.at(-1), b[-1]]);
try { [].length = 2 ** 32; } catch (e) { show('length = 2**32', `${e.name}: ${e.message}`); }

// 2) Holes are missing properties, not undefined values.
const holes = [1, , 3];
show('1 in [1,,3]', 1 in holes);
const visited = [];
holes.forEach((v, i) => visited.push(i));
show('forEach visits indices', visited);
show('for-of yields', [...holes]);
show('map keeps the hole (keys)', Object.keys(holes.map((x) => x * 2)));
show('toSorted fills hole with undefined', Object.keys(holes.toSorted()));
show('Array(3) keys / Array.from keys', [Object.keys(Array(3)), Object.keys(Array.from({ length: 3 }))]);
const d = [1, 2, 3]; delete d[1];
show('delete d[1] -> length, 1 in d', [d.length, 1 in d]);

// 3) Default sort compares strings (UTF-16 code units); undefined goes last.
show('[10, 9, 1, 2].sort()', [10, 9, 1, 2].sort());
show('[10, 9, 1, 2].sort((x, y) => x - y)', [10, 9, 1, 2].sort((x, y) => x - y));
show("['b', undefined, 'a', , 'C'].sort()", ['b', undefined, 'a', , 'C'].sort().map(String));
show("['é','z','e'].sort() vs localeCompare", [['é', 'z', 'e'].sort(), ['é', 'z', 'e'].sort((x, y) => x.localeCompare(y))]);
// stability: equal keys keep input order
const people = Array.from({ length: 20 }, (_, i) => ({ age: i % 2 ? 30 : 20, i }));
const byAge = people.toSorted((x, y) => x.age - y.age);
const stable = byAge.every((p, k) => k === 0 || p.age !== byAge[k - 1].age || p.i > byAge[k - 1].i);
show('sort stable for 20 equal-key items', stable);

// 4) Mutating vs copying.
const src = [3, 1, 2];
const sorted = src.toSorted();
show('toSorted leaves source', { src, sorted });
show('with(1, 9)', src.with(1, 9));
try { src.with(5, 0); } catch (e) { show('with(5, 0)', `${e.name}: ${e.message}`); }
show('toSpliced(0, 1)', src.toSpliced(0, 1));
show('findLast / findLastIndex', [[1, 2, 3, 4].findLast((x) => x % 2), [1, 2, 3, 4].findLastIndex((x) => x % 2)]);
show('includes(NaN) vs indexOf(NaN)', [[NaN].includes(NaN), [NaN].indexOf(NaN)]);

// 5) Grouping.
const g = Object.groupBy([1, 2, 3, 4], (x) => (x % 2 ? 'odd' : 'even'));
show('Object.groupBy', g);
show('groupBy result prototype is null', Object.getPrototypeOf(g) === null);
const k1 = { id: 1 };
const mg = Map.groupBy([{ owner: k1, n: 1 }, { owner: k1, n: 2 }], (x) => x.owner);
show('Map.groupBy keeps object key', mg.get(k1).map((x) => x.n));

// 6) Array.fromAsync awaits each element in turn.
async function* gen() { yield 1; await null; yield 2; }
show('Array.fromAsync(asyncGen)', await Array.fromAsync(gen()));
show('Array.fromAsync([p1, p2], x => x * 10)', await Array.fromAsync([Promise.resolve(1), 2], (x) => x * 10));

// 7) shift() as a queue: drain n items with shift vs pop.
for (const n of [1e4, 3e4, 1e5]) {
  const q1 = Array.from({ length: n }, (_, i) => i);
  let t = process.hrtime.bigint();
  while (q1.length) q1.shift();
  const shiftMs = Number(process.hrtime.bigint() - t) / 1e6;
  const q2 = Array.from({ length: n }, (_, i) => i);
  t = process.hrtime.bigint();
  while (q2.length) q2.pop();
  const popMs = Number(process.hrtime.bigint() - t) / 1e6;
  show(`drain ${n}: shift vs pop (ms)`, [Math.round(shiftMs), Math.round(popMs * 10) / 10]);
}

// 8) Spread into arguments has an engine limit; reduce/loop does not.
for (const n of [1e5, 2e5, 1e6]) {
  const big = Array.from({ length: n }, (_, i) => i);
  try { Math.max(...big); show(`Math.max(...${n} items)`, 'ok'); }
  catch (e) { show(`Math.max(...${n} items)`, `${e.name}: ${e.message}`); }
}
