// Symbol-ключі, well-known symbols, Proxy/Reflect та інваріанти пасток.
const log = (label, v) => console.log(label.padEnd(50), v);
const err = (fn) => { try { fn(); return 'no error'; } catch (e) { return `${e.constructor.name}: ${e.message}`; } };

// 1. Символи як ключі: не видно в keys/for-in/JSON, видно в Reflect.ownKeys
const ID = Symbol('id');
const o = { name: 'x', [ID]: 42 };
log('Object.keys / JSON', [Object.keys(o), JSON.stringify(o)]);
log('Reflect.ownKeys', Reflect.ownKeys(o));
log("Symbol('a') === Symbol('a') / Symbol.for", [Symbol('a') === Symbol('a'), Symbol.for('a') === Symbol.for('a')]);
log('spread copies symbol keys', Object.getOwnPropertySymbols({ ...o }));

// 2. Well-known symbols: протокол мови як властивості об'єкта
const money = {
  amount: 5,
  [Symbol.toPrimitive](hint) { return hint === 'number' ? this.amount : `${this.amount} UAH`; },
};
log('toPrimitive: +money / `${money}`', [+money, `${money}`]);
const range = { from: 1, to: 3, *[Symbol.iterator]() { for (let i = this.from; i <= this.to; i++) yield i; } };
log('Symbol.iterator: [...range]', [...range]);
class Even { static [Symbol.hasInstance](n) { return n % 2 === 0; } }
log('Symbol.hasInstance: 4 instanceof Even', 4 instanceof Even);
log('Symbol.toStringTag', Object.prototype.toString.call({ [Symbol.toStringTag]: 'Custom' }));

// 3. Proxy з Reflect: пастка делегує поведінку за замовчуванням
const audit = [];
const user = new Proxy({ name: 'ann' }, {
  get(t, k, r) { audit.push(`get ${String(k)}`); return Reflect.get(t, k, r); },
  set(t, k, v, r) { audit.push(`set ${String(k)}`); return Reflect.set(t, k, v, r); },
});
user.age = 30; void user.name;
log('audit trail', audit);

// 4. set-пастка, що повертає false: sloppy мовчить, strict кидає (practice14.js simpleProxy)
const strictOnly = new Proxy({}, { set() { return false; } });
strictOnly.a = 1;
log('set trap returns false (sloppy)', strictOnly.a);
log('set trap returns false (strict)', err(() => { 'use strict'; strictOnly.a = 1; }));
const noReturn = new Proxy({}, { set(t, k, v) { if (v.length > 2) Reflect.set(t, k, v); } });
log('practice14-style trap without return, strict', err(() => { 'use strict'; noReturn.p = 'long-enough'; }));

// 5. Інваріанти: проксі не може брехати про non-configurable/non-writable
const fixed = {};
Object.defineProperty(fixed, 'k', { value: 1, writable: false, configurable: false });
const liar = new Proxy(fixed, { get() { return 2; } });
log('get invariant violation', err(() => liar.k));
const hider = new Proxy(fixed, { has() { return false; } });
log('has invariant violation', err(() => 'k' in hider));
const sealedT = Object.preventExtensions({ a: 1 });
const keysLiar = new Proxy(sealedT, { ownKeys() { return []; } });
log('ownKeys invariant on non-extensible target', err(() => Object.keys(keysLiar)));

// 6. Proxy і this: методи вбудованих класів із внутрішніми слотами ламаються
const mapProxy = new Proxy(new Map([[1, 'a']]), {});
log('Map method through Proxy', err(() => mapProxy.get(1)));
const fixedMapProxy = new Proxy(new Map([[1, 'a']]), {
  get(t, k) { const v = Reflect.get(t, k, t); return typeof v === 'function' ? v.bind(t) : v; },
});
log('Map method with bound target', fixedMapProxy.get(1));

// 7. Revocable proxy
const { proxy, revoke } = Proxy.revocable({ a: 1 }, {});
revoke();
log('revoked proxy access', err(() => proxy.a));
