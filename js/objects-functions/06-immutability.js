// const ≠ незмінність, глибина freeze, копіювання, незмінні оновлення, методи ES2023.
const log = (label, v) => console.log(label.padEnd(52), v);
const err = (fn) => { try { fn(); return 'no error'; } catch (e) { return `${e.constructor.name}: ${e.message}`; } };

// 1. const забороняє переприсвоєння зв'язування, а не зміну об'єкта
const cfg = { port: 80 };
cfg.port = 8080;
log('const object mutated', cfg);
log('const rebinding', err(() => { const k = 1; k = 2; }));

// 2. deepFreeze: рекурсивно, бо freeze поверхневий
function deepFreeze(o) {
  for (const k of Reflect.ownKeys(o)) {
    const v = o[k];
    if (v && (typeof v === 'object' || typeof v === 'function') && !Object.isFrozen(v)) deepFreeze(v);
  }
  return Object.freeze(o);
}
const settings = deepFreeze({ db: { hosts: ['a'] } });
log('deepFreeze: nested push (strict)', err(() => { 'use strict'; settings.db.hosts.push('b'); }));
log('frozen Map still mutable (internal slots)', (() => { const m = Object.freeze(new Map()); m.set(1, 1); return m.size; })());

// 3. Spread/Object.assign копіюють поверхнево: вкладені об'єкти спільні
const state = { user: { name: 'ann', tags: ['a'] }, meta: { v: 1 }, n: 1 };
const shallow = { ...state, n: 2 };
shallow.user.name = 'MUTATED';
log('shallow copy shares nested', state.user.name);
state.user.name = 'ann';

// 4. Незмінне оновлення вкладеного поля зі структурним спільним використанням
const next = { ...state, user: { ...state.user, tags: [...state.user.tags, 'b'] } };
log('immutable update: original tags / next tags', [state.user.tags, next.user.tags]);
log('changed branch new, untouched branch shared', [next.user !== state.user, next.meta === state.meta]);

// 5. structuredClone проти JSON round-trip
class Money { constructor(v) { this.v = v; } get double() { return this.v * 2; } }
const rich = { d: new Date(0), m: new Map([[1, 'x']]), s: new Set([1]), u: undefined, big: 10n, money: new Money(5), re: /x/g };
rich.self = rich;
const sc = structuredClone(rich);
log('structuredClone: Date, Map, Set, cycle', [sc.d instanceof Date, sc.m.get(1), sc.s.has(1), sc.self === sc]);
log('structuredClone: class instance loses prototype', [sc.money instanceof Money, sc.money.double]);
log('structuredClone: function throws', err(() => structuredClone({ f() {} })));
const cyc = { a: 1 }; cyc.self = cyc;
log('JSON round-trip: cycle', err(() => JSON.stringify(cyc)));
const { self, big, ...noCycle } = rich;
const js = JSON.parse(JSON.stringify(noCycle));
log('JSON round-trip: Date -> string, Map -> {}, undefined dropped', [typeof js.d, js.m, 'u' in js, js.re]);
log('JSON: BigInt throws', err(() => JSON.stringify({ big: 1n })));

// 6. Мутуючі проти немутуючих методів масиву (ES2023: toSorted/toReversed/toSpliced/with)
const nums = [3, 1, 2];
const sorted = nums.toSorted((a, b) => a - b);
log('toSorted: original untouched', [nums, sorted]);
log('toReversed / with(0, 9) / toSpliced(1,1)', [nums.toReversed(), nums.with(0, 9), nums.toSpliced(1, 1)]);
const inPlace = [3, 1, 2];
const ret = inPlace.sort((a, b) => a - b);
log('sort mutates and returns same array', [inPlace, ret === inPlace]);
log('frozen array: sort throws, toSorted works', [err(() => Object.freeze([2, 1]).sort()), Object.freeze([2, 1]).toSorted()]);

log('Object.groupBy result has null prototype', Object.getPrototypeOf(Object.groupBy([1, 2], (n) => (n % 2 ? 'odd' : 'even'))));
log('toSorted default compares as strings', [10, 9, 1].toSorted());
log('with() out of range', err(() => [1, 2].with(5, 0)));
log('toSorted turns holes into undefined', [3, , 1].toSorted());
log('copy methods are shallow (element identity kept)', (() => { const a = [{ id: 1 }]; return a.toReversed()[0] === a[0]; })());

// 6b. freeze не торкається приватних полів і не заморожує непорожній TypedArray
class Wallet { #sum = 0; add(n) { this.#sum += n; return this.#sum; } }
const w = Object.freeze(new Wallet());
log('frozen instance: private field still mutable', [w.add(5), w.add(5)]);
log('freeze non-empty Uint8Array', err(() => Object.freeze(new Uint8Array(1))));

// 7. Рядки й примітиви незмінні за природою
const str = 'abc';
const tryMutate = (() => { const s = 'abc'; try { (function () { 'use strict'; s[0] = 'z'; })(); } catch (e) { return e.constructor.name; } return s; })();
log('string index assignment (strict)', tryMutate);
log('string methods return new strings', [str.toUpperCase(), str]);
