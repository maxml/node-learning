// Map vs plain object as a dictionary; Set and ES2025 set methods; WeakMap/WeakRef/FinalizationRegistry.
// Run: node --expose-gc coll-03-map-set-weak.js
const show = (label, v) => console.log(label.padEnd(40), typeof v === 'string' ? v : JSON.stringify(v));

// 1) Object keys are strings (or symbols): 1 and '1' collide; integer-like keys are reordered.
const o = {};
o[1] = 'num'; o['1'] = 'str';
show('obj[1] and obj["1"]', Object.keys(o));
const ord = { b: 1, 2: 1, a: 1, 1: 1 };
show('object key order', Object.keys(ord));
const m = new Map([['b', 1], [2, 1], ['a', 1], [1, 1], ['1', 1]]);
show('Map key order (and 1 !== "1")', [...m.keys()]);

// 2) Inherited keys and __proto__: a plain object is not an empty dictionary.
const dict = {};
show("'toString' in {}", 'toString' in dict);
const parsed = JSON.parse('{"__proto__": {"isAdmin": true}}');
const copy = Object.assign({}, parsed);
show('Object.assign({}, JSON __proto__) isAdmin', copy.isAdmin);
const safe = Object.create(null);
show("'toString' in Object.create(null)", 'toString' in safe);
const mm = new Map(); mm.set('__proto__', 1);
show("Map.set('__proto__') is just a key", [...mm.keys()]);

// 3) Map: any key by SameValueZero, object keys by identity, size O(1), not JSON-serialisable.
const key = { id: 1 };
const byObj = new Map([[key, 'v']]);
show('get(sameRef) / get(equalShape)', [byObj.get(key), byObj.get({ id: 1 })]);
show('Map NaN key / -0 vs +0', [new Map([[NaN, 'nan']]).get(NaN), new Map([[-0, 'zero']]).get(0)]);
show('JSON.stringify(new Map([[1,2]]))', JSON.stringify(new Map([[1, 2]])));
show('Object.fromEntries(map)', Object.fromEntries(new Map([['a', 1]])));

// 4) Set and the ES2025 methods.
const A = new Set([1, 2, 3]), B = new Set([2, 3, 4]);
show('union', [...A.union(B)]);
show('intersection', [...A.intersection(B)]);
show('difference A-B', [...A.difference(B)]);
show('symmetricDifference', [...A.symmetricDifference(B)]);
show('isSubsetOf / isSupersetOf / isDisjointFrom', [new Set([2]).isSubsetOf(A), A.isSupersetOf(new Set([1])), A.isDisjointFrom(new Set([9]))]);
show('union with a Map (set-like: size/has/keys)', [...A.union(new Map([[9, 'x']]))]);
try { A.union([4, 5]); } catch (e) { show('union with an array', `${e.name}: ${e.message}`); }
show('Set of objects dedups by reference', new Set([{ a: 1 }, { a: 1 }]).size);

// 5) WeakMap keeps no strong ref to keys; not iterable.
const wm = new WeakMap();
show('WeakMap iterable?', typeof wm[Symbol.iterator]);
try { wm.set('str', 1); } catch (e) { show('WeakMap.set(primitive key)', `${e.name}: ${e.message}`); }
show('WeakMap with non-registered symbol key', (() => { const s = Symbol('k'); wm.set(s, 1); return wm.get(s); })());
try { wm.set(Symbol.for('reg'), 1); } catch (e) { show('WeakMap.set(Symbol.for(...))', `${e.name}: ${e.message}`); }

// 6) WeakRef + FinalizationRegistry: observable only after GC, timing not guaranteed,
//    and a registry that is itself unreachable never calls back.
let target = { big: new Array(1e6).fill(0) };
const ref = new WeakRef(target);
const cleaned = [];
const kept = new FinalizationRegistry((held) => cleaned.push(held));
kept.register(target, 'kept-registry');
(function () {
  // this registry is referenced by nothing after the function returns
  const lost = new FinalizationRegistry((held) => cleaned.push(held));
  lost.register(target, 'lost-registry');
})();
show('deref() before GC', typeof ref.deref());
target = null;
setTimeout(async () => {
  globalThis.gc();
  show('deref() after GC (next task)', typeof ref.deref());
  await new Promise((r) => setTimeout(r, 500));
  show('cleanup callbacks after 500ms', cleaned);
  void kept; // keeps the first registry reachable until here
}, 0);
