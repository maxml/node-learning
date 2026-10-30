'use strict';
// ToPrimitive / OrdinaryToPrimitive, the + operator, IsLooselyEqual, relational comparison,
// JSON.stringify rules and explicit conversion idioms.
// Run: node 03-coercion.js

const log = (label, value) => console.log(label.padEnd(46), value);
const fmt = (v) => (typeof v === 'string' ? JSON.stringify(v) : String(v));

console.log('--- 1. OrdinaryToPrimitive: order depends on the hint ---');
const calls = [];
const traced = {
  valueOf() { calls.push('valueOf'); return 42; },
  toString() { calls.push('toString'); return 'str'; },
};
const run = (label, fn) => { calls.length = 0; const r = fn(); log(label, `${fmt(r)}  [${calls.join(' -> ')}]`); };
run('`${traced}`        (hint string)', () => `${traced}`);
run('String(traced)     (hint string)', () => String(traced));
run('traced + 1         (hint default)', () => traced + 1);
run('traced * 2         (hint number)', () => traced * 2);
run("traced == 42       (hint default)", () => traced == 42);
run('obj key: ({[traced]:1}) (hint string)', () => Object.keys({ [traced]: 1 })[0]);

const noPrim = { valueOf() { return {}; }, toString() { return {}; } };
try { noPrim + ''; } catch (e) { log('both return objects -> ', `${e.constructor.name}: ${e.message}`); }

console.log('\n--- 2. Symbol.toPrimitive overrides both ---');
const money = {
  amount: 1050,
  [Symbol.toPrimitive](hint) { return hint === 'number' ? this.amount / 100 : `${this.amount / 100} UAH`; },
};
log('+money', +money);
log('`${money}`', `${money}`);
log("money + ''  (hint default)", money + '');
const d = new Date(0);
log('Date: d + 1 (default hint -> string!)', typeof (d + 1));
log('Date: d - 1 (number)', d - 1);

console.log('\n--- 3. the + operator ---');
for (const [src, fn] of [
  ['1 + "2"', () => 1 + '2'],
  ['"3" - 1', () => '3' - 1],
  ['[] + []', () => [] + []],
  ['[] + {}', () => [] + {}],
  ['({}) + []', () => ({}) + []],
  ['[1,2] + [3]', () => [1, 2] + [3]],
  ['true + 1', () => true + 1],
  ['null + 1', () => null + 1],
  ['undefined + 1', () => undefined + 1],
  ["'b' + 'a' + +'a' + 'a'", () => 'b' + 'a' + +'a' + 'a'],
  ['1 + 2 + "3"', () => 1 + 2 + '3'],
  ['"1" + 2 + 3', () => '1' + 2 + 3],
]) log(src, fmt(fn()));
try { 1n + 1; } catch (e) { log('1n + 1', `${e.constructor.name}: ${e.message}`); }
try { Symbol('s') + ''; } catch (e) { log("Symbol('s') + ''", `${e.constructor.name}`); }
log("String(Symbol('s'))", String(Symbol('s')));

console.log('\n--- 4. IsLooselyEqual puzzles ---');
for (const [src, fn] of [
  ['[] == ![]', () => [] == ![]],
  ["'' == 0", () => '' == 0],
  ["'0' == false", () => '0' == false],
  ["'' == '0'", () => '' == '0'],
  ['[0] == false', () => [0] == false],
  ['[1,2] == "1,2"', () => [1, 2] == '1,2'],
  ['NaN == NaN', () => NaN == NaN],
  ['null == false', () => null == false],
  ['undefined == false', () => undefined == false],
  ["'\\n\\t' == 0", () => '\n\t' == 0],
  ['1n == 1', () => 1n == 1],
  ["1n == '1'", () => 1n == '1'],
  ['Boolean([]) / Boolean("0")', () => `${Boolean([])} / ${Boolean('0')}`],
]) log(src, fn());

console.log('\n--- 5. relational comparison ---');
log('"10" < "9"  (both strings: code units)', '10' < '9');
log('"10" < 9    (one number: ToNumber)', '10' < 9);
log('"a" < "B"', 'a' < 'B');
log('4 > 3 > 2', 4 > 3 > 2);
log('null > 0, null == 0, null >= 0', `${null > 0}, ${null == 0}, ${null >= 0}`);
log('undefined < 1 || undefined >= 1', undefined < 1 || undefined >= 1);
log('[10, 9, 1].sort()', JSON.stringify([10, 9, 1].sort()));

console.log('\n--- 6. explicit conversion idioms ---');
for (const s of ['42', ' 42 ', '42px', '', '0x1f', '1e3', '0.0000005', '1_000', '12.9']) {
  log(`${JSON.stringify(s)}: Number / +s / parseInt / parseFloat`,
    `${Number(s)} / ${+s} / ${parseInt(s, 10)} / ${parseFloat(s)}`);
}
log('parseInt(0.0000005)', parseInt(0.0000005));
log("['1','7','11'].map(parseInt)", String(['1', '7', '11'].map(parseInt)));
log("['1','7','11'].map(Number)", String(['1', '7', '11'].map(Number)));
log('Number(null), Number(undefined), Number([])', `${Number(null)}, ${Number(undefined)}, ${Number([])}`);
log('Number([5]), Number([1,2]), Number({})', `${Number([5])}, ${Number([1, 2])}, ${Number({})}`);
log('isNaN("abc") vs Number.isNaN("abc")', `${isNaN('abc')} vs ${Number.isNaN('abc')}`);
log('String(-0), (-0).toString(), `${-0}`', `${String(-0)}, ${(-0).toString()}, ${`${-0}`}`);
log('JSON.stringify(-0), Object.is(-0, 0)', `${JSON.stringify(-0)}, ${Object.is(-0, 0)}`);

console.log('\n--- 6b. more StringToNumber / parseInt edges ---');
for (const s of ['0b101', '0o17', 'Infinity', '-0x10', ' \n', '1,5']) log(`Number(${JSON.stringify(s)})`, Number(s));
log('Number(new Date(0)), Number([[1]]), Number(["  7 "])', `${Number(new Date(0))}, ${Number([[1]])}, ${Number(['  7 '])}`);
log("parseInt('0x1f') (no radix) vs parseInt('0x1f', 10)", `${parseInt('0x1f')} vs ${parseInt('0x1f', 10)}`);
log("parseInt('08'), parseInt(null, 36)", `${parseInt('08')}, ${parseInt(null, 36)}`);
log('Number(10n), String(10n), 10n + ""', `${Number(10n)}, ${String(10n)}, ${10n + ''}`);
try { `${Symbol('a')}`; } catch (e) { log('`${Symbol()}`', `${e.constructor.name}: ${e.message}`); }
log('eval("{} + []") (leading {} is a block)', eval('{} + []'));

console.log('\n--- 7. JSON.stringify rules ---');
log('undefined/function in object, in array', `${JSON.stringify({ a: undefined, b() {} })} ${JSON.stringify([undefined, () => 1])}`);
log('top-level undefined / function / Symbol', `${JSON.stringify(undefined)} ${JSON.stringify(() => 1)} ${JSON.stringify(Symbol('s'))}`);
log('toJSON wins', JSON.stringify({ toJSON() { return 'custom'; } }));
log('Date has toJSON', JSON.stringify({ at: new Date(0) }));
log('replacer array whitelists keys', JSON.stringify({ a: 1, b: 2, c: 3 }, ['a', 'c']));
log('replacer function', JSON.stringify({ a: 1, b: 'x' }, (k, v) => (typeof v === 'number' ? v * 10 : v)));
log('symbol keys skipped', JSON.stringify({ [Symbol('k')]: 1, ok: 1 }));
log('non-enumerable skipped', JSON.stringify(Object.defineProperty({ ok: 1 }, 'hidden', { value: 2 })));
log('new Number(3), new String("s") unboxed', JSON.stringify([new Number(3), new String('s'), new Boolean(false)]));
log('BigInt via replacer function', JSON.stringify({ id: 2n ** 64n }, (k, v) => (typeof v === 'bigint' ? v.toString() : v)));
log('JSON.parse reviver restores Date',
  JSON.parse('{"at":"1970-01-01T00:00:00.000Z"}', (k, v) => (k === 'at' ? new Date(v) : v)).at instanceof Date);
