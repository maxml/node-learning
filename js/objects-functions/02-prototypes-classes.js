// [[Get]]/[[Set]] уздовж ланцюжка прототипів, new крок за кроком, де class не є цукром.
const log = (label, v) => console.log(label.padEnd(48), v);
const err = (fn) => { try { fn(); return 'no error'; } catch (e) { return `${e.constructor.name}: ${e.message}`; } };

// 1. [[Get]] іде вгору, [[Set]] створює власну властивість (shadowing)
const base = { greet() { return `hi from ${this.name}`; }, count: 0 };
const kid = Object.create(base);
kid.name = 'kid';
log('kid.greet() (method from proto, this=kid)', kid.greet());
kid.count++;
log('kid.count++ shadows: kid / base', [kid.count, base.count]);

// 2. Сетер у прототипі перехоплює присвоєння на нащадку: власна властивість НЕ створюється
const withSetter = { set role(v) { this._role = v.toUpperCase(); } };
const s = Object.create(withSetter);
s.role = 'admin';
log('setter on proto: hasOwn(role), _role', [Object.hasOwn(s, 'role'), s._role]);

// 3. Non-writable у прототипі забороняє shadowing через присвоєння (але не через defineProperty)
const frozenProto = Object.freeze({ id: 1 });
const f = Object.create(frozenProto);
f.id = 2; // sloppy: тихо ігнорується
log('assign over non-writable proto prop (sloppy)', [f.id, Object.hasOwn(f, 'id')]);
log('same in strict', err(() => { 'use strict'; f.id = 2; }));
Object.defineProperty(f, 'id', { value: 2, writable: true, enumerable: true, configurable: true });
log('defineProperty does shadow', f.id);

// 4. __proto__ проти prototype проти [[Prototype]]
function Ctor() {}
const inst = new Ctor();
log('Object.getPrototypeOf(inst) === Ctor.prototype', Object.getPrototypeOf(inst) === Ctor.prototype);
log('Ctor.__proto__ === Function.prototype', Object.getPrototypeOf(Ctor) === Function.prototype);
log('arrow has .prototype?', Object.hasOwn(() => {}, 'prototype'));
log('__proto__ is accessor on Object.prototype', typeof Object.getOwnPropertyDescriptor(Object.prototype, '__proto__').get);

// 5. new крок за кроком (спрощено, без new.target у підкласах)
function myNew(F, ...args) {
  const obj = Object.create(F.prototype !== null && typeof F.prototype === 'object' ? F.prototype : Object.prototype);
  const ret = F.apply(obj, args);
  return ret !== null && (typeof ret === 'object' || typeof ret === 'function') ? ret : obj;
}
function Point(x) { this.x = x; }
function Weird() { this.a = 1; return { hijacked: true }; }
function Prim() { this.a = 1; return 42; }
log('myNew(Point, 3)', [myNew(Point, 3), myNew(Point, 3) instanceof Point]);
log('new Weird() returns object from ctor', new Weird());
log('new Prim() ignores primitive return', new Prim());
log('constructor without new (sloppy) leaks to global', (() => { Point(7); return globalThis.x; })());
delete globalThis.x;

// 6. class НЕ просто цукор
log('call class without new', err(() => { class A {} A(); }));
log('class TDZ: use before declaration', err(() => { new B(); class B {} }));
log('class body is strict (this in method call)', (() => { class C { m() { return this; } } const m = new C().m; return m(); })());
class P { method() {} static s() {} }
log('class methods non-enumerable', [Object.getOwnPropertyDescriptor(P.prototype, 'method').enumerable, Object.keys(P.prototype)]);
log('P.prototype writable?', Object.getOwnPropertyDescriptor(P, 'prototype').writable);
log('method is not a constructor', err(() => new (new P().method)()));

// 7. Приватні поля: не властивості, не видно Reflect.ownKeys/Proxy, brand check через #x in
class Account {
  #balance = 100;
  static isAccount(o) { return #balance in o; }
  get balance() { return this.#balance; }
}
const acc = new Account();
log('Reflect.ownKeys(acc)', Reflect.ownKeys(acc));
log('JSON.stringify(acc)', JSON.stringify(acc));
log('#balance in acc / in {}', [Account.isAccount(acc), Account.isAccount({})]);
log('private through Proxy', err(() => new Proxy(acc, {}).balance));
log('private on foreign this', err(() => Object.getOwnPropertyDescriptor(Account.prototype, 'balance').get.call({})));

// 8. static block має доступ до приватних імен класу
let peek;
class Secret {
  #v = 's3cr3t';
  static { peek = (o) => o.#v; }
}
log('static block exports private accessor', peek(new Secret()));

// 9. super прив'язаний до [[HomeObject]], а не до this
const animal = { speak() { return 'animal'; } };
const dog = { __proto__: animal, speak() { return 'dog>' + super.speak(); } };
const robot = { __proto__: { speak() { return 'robot'; } }, speak: dog.speak };
log('borrowed method keeps its super', robot.speak());

// 10. Поля класу визначаються (define), а не присвоюються: сетер базового класу НЕ викликається
class Base { set x(v) { console.log('   Base setter called'); } }
class Derived extends Base { x = 1; }
const d = new Derived();
log('field shadows base setter: own descriptor', Object.getOwnPropertyDescriptor(d, 'x'));

// 11. Міксини: функція, що повертає підклас
const Timestamped = (B) => class extends B { stamp() { return 'stamped'; } };
const Serializable = (B) => class extends B { toJSON() { return { ...this, kind: 'ser' }; } };
class Entity { constructor() { this.id = 1; } }
class Doc extends Serializable(Timestamped(Entity)) {}
const doc = new Doc();
log('mixin chain', [doc.stamp(), JSON.stringify(doc), doc instanceof Entity]);

// 11b. Похідний конструктор: this не існує до super(), примітив повертати не можна
class Parent {}
log('derived: this before super()', err(() => new (class extends Parent { constructor() { this.x = 1; super(); } })()));
log('derived: return primitive', err(() => new (class extends Parent { constructor() { super(); return 1; } })()));

// 11c. Геттер без сетера в прототипі: присвоєння на нащадку тихо не спрацьовує (sloppy)
const getterOnly = Object.create({ get x() { return 1; } });
getterOnly.x = 5;
log('assign over getter-only proto prop', [getterOnly.x, Object.hasOwn(getterOnly, 'x')]);

// 11d. for-in: власна НЕперелічувана властивість ховає успадковану перелічувану з тим самим іменем
const shadowEnum = Object.create({ a: 1 });
Object.defineProperty(shadowEnum, 'a', { value: 2, enumerable: false });
const seen = []; for (const k in shadowEnum) seen.push(k);
log('for-in skips inherited key shadowed by non-enumerable own', seen);

// 12. Спільний масив у прототипі: класична пастка (practice13.js referenceTypes)
function Team() {}
Team.prototype.members = [];
const t1 = new Team(); const t2 = new Team();
t1.members.push('a');
log('shared array on prototype: t2.members', t2.members);
