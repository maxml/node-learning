// Prototype pollution: naive deep merge, JSON.parse vs assignment, fixes.
// Run: node proto-pollution.mjs   (also with --disable-proto=throw / =delete)
const log = (k, v) => console.log(k.padEnd(58), v);

function naiveMerge(target, source) {
  for (const key in source) {
    const v = source[key];
    if (v && typeof v === 'object') {
      const t = target[key];          // like many real merges: functions count as objects too
      if (!t || (typeof t !== 'object' && typeof t !== 'function')) target[key] = {};
      naiveMerge(target[key], v);   // target['__proto__'] === Object.prototype; target.constructor === Object
    } else {
      target[key] = v;
    }
  }
  return target;
}

console.log('node', process.version, 'execArgv', process.execArgv.join(' ') || '-');

// 1. JSON.parse creates an OWN key "__proto__"; a literal / assignment sets the prototype
let parsed;
try {
  parsed = JSON.parse('{"__proto__":{"isAdmin":true}}');
  log('JSON.parse own key __proto__?', Object.hasOwn(parsed, '__proto__'));
  log('JSON.parse result .isAdmin (own proto unchanged)', parsed.isAdmin);
} catch (e) { log('JSON.parse threw', `${e.code} ${e.message}`); }

try {
  const lit = { __proto__: { isAdmin: true } };          // literal syntax, not the accessor
  log('literal {__proto__:{..}} .isAdmin (prototype set)', lit.isAdmin);
} catch (e) { log('literal threw', e.code); }

try {
  const a = {}; a['__proto__'] = { isAdmin: true };       // goes through the accessor
  log("assignment a['__proto__']=.. own key?", Object.hasOwn(a, '__proto__'), '.isAdmin', a.isAdmin);
} catch (e) { log('assignment threw', `${e.code} ${e.message}`); }

// 2. naive merge of parsed JSON pollutes Object.prototype
try {
  naiveMerge({}, JSON.parse('{"__proto__":{"isAdmin":true}}'));
  log('after naiveMerge(__proto__): ({}).isAdmin', ({}).isAdmin);
} catch (e) { log('naiveMerge(__proto__) threw', `${e.code} ${e.message}`); }
delete Object.prototype.isAdmin;

// 3. constructor.prototype path: not affected by --disable-proto
try {
  naiveMerge({}, JSON.parse('{"constructor":{"prototype":{"isAdmin":true}}}'));
  log('after naiveMerge(constructor.prototype): ({}).isAdmin', ({}).isAdmin);
} catch (e) { log('naiveMerge(constructor.prototype) threw', `${e.code} ${e.message}`); }
delete Object.prototype.isAdmin;

// 4. fix: null-prototype target
{
  const target = Object.create(null);
  naiveMerge(target, JSON.parse('{"__proto__":{"isAdmin":true}}'));
  log('Object.create(null) target: ({}).isAdmin', ({}).isAdmin);
  log('  ...but the null-proto target got own key', Object.keys(target));
}
delete Object.prototype.isAdmin;
{
  // null prototype only at the top: nested objects the merge creates are ordinary {}
  naiveMerge(Object.create(null), JSON.parse('{"a":{"__proto__":{"isAdmin":true}}}'));
  log('Object.create(null) top only, nested a.__proto__: ({}).isAdmin', ({}).isAdmin);
}
delete Object.prototype.isAdmin;

// 5. fix: Map for user-keyed data
{
  const m = new Map(Object.entries(JSON.parse('{"__proto__":{"isAdmin":true}}')));
  log('Map: ({}).isAdmin', ({}).isAdmin, 'm.get("__proto__")', JSON.stringify(m.get('__proto__')));
}

// 6. gadget: auth check reading an optional property
{
  const user = { name: 'eve' };                // no isAdmin field at all
  const isAdmin = (u) => u.isAdmin === true;
  log('gadget before pollution: isAdmin(eve)', isAdmin(user));
  try { naiveMerge({}, JSON.parse('{"constructor":{"prototype":{"isAdmin":true}}}')); } catch {}
  log('gadget after pollution:  isAdmin(eve)', isAdmin(user));
  log('  safe check Object.hasOwn(u,"isAdmin") && ...', Object.hasOwn(user, 'isAdmin') && user.isAdmin === true);
  delete Object.prototype.isAdmin;
}
