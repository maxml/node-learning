// Модель властивостей: дескриптори, атрибути, freeze/seal, порядок ключів, перелічення.
// Файл навмисно CommonJS без 'use strict' на верхньому рівні: так видно різницю
// між тихою відмовою (sloppy) і TypeError (strict) в одному прогоні.
const log = (label, v) => console.log(label.padEnd(44), v);

// 1. Дескриптори: літерал дає true/true/true, defineProperty за замовчуванням false/false/false
const lit = { a: 1 };
log('literal descriptor', Object.getOwnPropertyDescriptor(lit, 'a'));
const def = {};
Object.defineProperty(def, 'a', { value: 1 });
log('defineProperty defaults', Object.getOwnPropertyDescriptor(def, 'a'));
log('Object.keys(def) (enumerable:false)', Object.keys(def));
log('JSON.stringify(def)', JSON.stringify(def));

// 2. Запис у writable:false: sloppy мовчить, strict кидає
def.a = 2;
log('sloppy write to writable:false', def.a);
try { (function () { 'use strict'; def.a = 2; })(); } catch (e) { log('strict write to writable:false', `${e.constructor.name}: ${e.message}`); }

// 3. configurable:false: не можна видалити й перевизначити, але writable true→false можна
const c = {};
Object.defineProperty(c, 'x', { value: 1, writable: true, configurable: false });
log('delete non-configurable (sloppy)', delete c.x);
Object.defineProperty(c, 'x', { writable: false });
log('writable true->false on non-configurable', Object.getOwnPropertyDescriptor(c, 'x').writable);
try { Object.defineProperty(c, 'x', { writable: true }); } catch (e) { log('writable false->true', `${e.constructor.name}: ${e.message}`); }

// 4. Accessor-властивість: get/set замість value/writable
const temp = {
  _c: 0,
  get f() { return this._c * 9 / 5 + 32; },
  set f(v) { this._c = (v - 32) * 5 / 9; },
};
temp.f = 212;
log('accessor set f=212 -> _c', temp._c);
log('accessor descriptor keys', Object.keys(Object.getOwnPropertyDescriptor(temp, 'f')));

// 5. preventExtensions / seal / freeze і їхня глибина
const nested = { inner: { n: 1 }, arr: [1] };
Object.freeze(nested);
nested.inner.n = 2; nested.arr.push(2);
log('freeze is shallow: inner.n, arr', [nested.inner.n, nested.arr]);
log('isFrozen / isFrozen(inner)', [Object.isFrozen(nested), Object.isFrozen(nested.inner)]);
const sealed = Object.seal({ s: 1 });
sealed.s = 2; sealed.t = 3; delete sealed.s;
log('sealed: change ok, add/delete no-op', sealed);
const pe = Object.preventExtensions({ p: 1 });
pe.q = 1; delete pe.p;
log('preventExtensions: add no-op, delete ok', pe);

// 6. Object.assign викликає сетери цілі, spread визначає нові власні властивості
const target = { set v(x) { log('  setter called with', x); } };
Object.assign(target, { v: 1 });
const spread = { ...target, ...{ v: 1 } };
log('spread result descriptor of v', Object.getOwnPropertyDescriptor(spread, 'v'));
// spread копіює лише власні перелічувані; геттер джерела ВИКЛИКАЄТЬСЯ і копіюється значення
const src = { get now() { return 'computed'; } };
log('spread of getter -> data property', Object.getOwnPropertyDescriptor({ ...src }, 'now'));

// 7. Порядок ключів: цілі індекси за зростанням, потім рядки в порядку створення, потім символи
const order = { b: 1, 2: 1, a: 1, 1: 1, [Symbol('s')]: 1, '-1': 1, '01': 1, 4294967294: 1, 4294967295: 1 };
log('Reflect.ownKeys order', Reflect.ownKeys(order).map(String));

// 8. Власні проти успадкованих: for-in іде ланцюжком прототипів, Object.keys ні
const proto = { inherited: 1 };
const child = Object.create(proto, { own: { value: 1, enumerable: true }, hidden: { value: 1 } });
const forIn = []; for (const k in child) forIn.push(k);
log('for-in', forIn);
log('Object.keys', Object.keys(child));
log('Object.getOwnPropertyNames', Object.getOwnPropertyNames(child));
log("'inherited' in child / hasOwn", ['inherited' in child, Object.hasOwn(child, 'inherited')]);

// 9. Object.create(null): жодного прототипу, жодних успадкованих методів
const dict = Object.create(null);
dict.__proto__ = 'just a key';
log('null-proto: __proto__ is own key', Object.keys(dict));
log('null-proto: typeof dict.toString', typeof dict.toString);
try { String(dict); } catch (e) { log('String(nullProtoObj)', `${e.constructor.name}: ${e.message}`); }
log('hasOwnProperty on null-proto via Object.hasOwn', Object.hasOwn(dict, '__proto__'));

// 10. __proto__ у літералі ставить прототип, а JSON.parse створює власний ключ
const viaLiteral = { __proto__: { fromProto: true } };
const viaJson = JSON.parse('{"__proto__": {"fromProto": true}}');
log('literal __proto__ -> inherited', [viaLiteral.fromProto, Object.keys(viaLiteral)]);
log('JSON.parse __proto__ -> own key', [viaJson.fromProto, Object.keys(viaJson)]);
