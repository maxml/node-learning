'use strict';
// IEEE-754 doubles, BigInt, rounding, UTF-16 strings, Date and Intl.
// Run with a fixed zone so the output is reproducible:
//   TZ=Europe/Kyiv node 04-numbers-strings-dates.js

const log = (label, value) => console.log(label.padEnd(50), value);

console.log('--- 1. every number is a binary64 double ---');
log('0.1 + 0.2', 0.1 + 0.2);
log('0.1 + 0.2 === 0.3', 0.1 + 0.2 === 0.3);
log('(0.1).toPrecision(21)', (0.1).toPrecision(21));
log('Number.MAX_SAFE_INTEGER', Number.MAX_SAFE_INTEGER);
log('2 ** 53 === 2 ** 53 + 1', 2 ** 53 === 2 ** 53 + 1);
log('9007199254740993 (literal)', 9007199254740993);
log('Number.isSafeInteger(2 ** 53)', Number.isSafeInteger(2 ** 53));
log('Number.MAX_VALUE * 2', Number.MAX_VALUE * 2);
log('Number.MIN_VALUE (smallest denormal)', Number.MIN_VALUE);
log('Number.EPSILON', Number.EPSILON);
log('0.1 * 3', 0.1 * 3);
log('9.95.toFixed(1)  (9.95 is 9.9499999...)', (9.95).toFixed(1));
log('1.005.toFixed(2)', (1.005).toFixed(2));
log('(1.005).toPrecision(20)', (1.005).toPrecision(20));
log('Math.round(-2.5), Math.round(2.5)', `${Math.round(-2.5)}, ${Math.round(2.5)}`);
log('1e21.toFixed(2)', (1e21).toFixed(2));
log('0.1 + 0.2 - 0.3 < Number.EPSILON', 0.1 + 0.2 - 0.3 < Number.EPSILON);
log('1000.1 + 1000.2 - 2000.3', 1000.1 + 1000.2 - 2000.3);
log('|1000.1+1000.2-2000.3| < EPSILON (absolute misuse)', Math.abs(1000.1 + 1000.2 - 2000.3) < Number.EPSILON);
const close = (a, b, rel = 1e-9) => Math.abs(a - b) <= rel * Math.max(Math.abs(a), Math.abs(b));
log('relative tolerance close(1000.1+1000.2, 2000.3)', close(1000.1 + 1000.2, 2000.3));
const ulp = (x) => { const f = new Float64Array([x]); const i = new BigInt64Array(f.buffer); i[0] += 1n; return f[0] - x; };
log('gap to next double at 1 / at 1000 / ratio', `${ulp(1)} / ${ulp(1000)} / ${ulp(1000) / ulp(1)}`);
log('typeof Math.sumPrecise', typeof Math.sumPrecise);

console.log('\n--- 2. money in integer minor units ---');
const pricesUAH = [19.99, 0.01, 5.1];
log('float sum of 19.99 + 0.01 + 5.1', pricesUAH.reduce((a, b) => a + b, 0));
const kop = pricesUAH.map((p) => Math.round(p * 100));
log('integer kopiyky sum', kop.reduce((a, b) => a + b, 0));
log('Intl.NumberFormat uk-UA UAH', new Intl.NumberFormat('uk-UA', { style: 'currency', currency: 'UAH' }).format(2510 / 100));

console.log('\n--- 3. BigInt ---');
log('2n ** 64n', 2n ** 64n);
log('typeof 1n', typeof 1n);
log('7n / 2n (truncates)', 7n / 2n);
log('1n < 2, 2n > 1  (mixed comparison ok)', `${1n < 2}, ${2n > 1}`);
log('1n === 1', 1n === 1);
try { 1n + 1; } catch (e) { log('1n + 1', `${e.constructor.name}`); }
try { Math.max(1n); } catch (e) { log('Math.max(1n)', `${e.constructor.name}`); }
try { +1n; } catch (e) { log('+1n', `${e.constructor.name}`); }
log('Number(2n ** 64n) (precision loss)', Number(2n ** 64n));
log('BigInt(Number.MAX_SAFE_INTEGER) + 2n', BigInt(Number.MAX_SAFE_INTEGER) + 2n);
try { BigInt(1.5); } catch (e) { log('BigInt(1.5)', `${e.constructor.name}`); }
log('BigInt.asIntN(64, 2n ** 63n)', BigInt.asIntN(64, 2n ** 63n));

console.log('\n--- 4. strings: code units, code points, graphemes ---');
const samples = { ascii: 'abc', cyr: 'їжак', emoji: '😀', family: '👨‍👩‍👧', flag: '🇺🇦', accent: 'é' };
for (const [name, s] of Object.entries(samples)) {
  const graphemes = [...new Intl.Segmenter('uk', { granularity: 'grapheme' }).segment(s)].length;
  log(`${name} ${s}: length / [...s].length / graphemes`, `${s.length} / ${[...s].length} / ${graphemes}`);
}
log("'😀'.charCodeAt(0).toString(16)", '😀'.charCodeAt(0).toString(16));
log("'😀'.codePointAt(0).toString(16)", '😀'.codePointAt(0).toString(16));
log("'😀'.slice(0, 1).isWellFormed()", '😀'.slice(0, 1).isWellFormed());
log("'😀'.split('').length", '😀'.split('').length);
log("[...'😀'].reverse().join('') === '😀'", [...'😀'].reverse().join('') === '😀');
log("'😀'.split('').reverse().join('') === '😀'", '😀'.split('').reverse().join('') === '😀');
const nfc = 'é';
const nfd = 'é';
log('NFC é === NFD é', nfc === nfd);
log('lengths NFC / NFD', `${nfc.length} / ${nfd.length}`);
log("nfd.normalize('NFC') === nfc", nfd.normalize('NFC') === nfc);
log("'їжак' < 'яблуко' (code units)", 'їжак' < 'яблуко');
log("['я','ї','а','є','і'].sort()", ['я', 'ї', 'а', 'є', 'і'].sort().join(''));
log("sorted with Intl.Collator('uk')", ['я', 'ї', 'а', 'є', 'і'].sort(new Intl.Collator('uk').compare).join(''));
log("'a'.localeCompare('B')", 'a'.localeCompare('B'));
log("Collator base sensitivity 'a' vs 'á'", new Intl.Collator('en', { sensitivity: 'base' }).compare('a', 'á'));
const str = 'abc';
try {
  str[0] = 'X'; // index properties of a String exotic object are non-writable
} catch (e) {
  log("str[0] = 'X' (strict)", `${e.constructor.name}: ${e.message}`);
}
log("str after str[0] = 'X'", str);
log("str.replace('a', 'X') returns a new string", `${str.replace('a', 'X')} (str is still ${str})`);

console.log('\n--- 5. Date: one number of ms since the epoch (UTC) ---');
log('process.env.TZ', process.env.TZ);
const epoch = new Date(0);
log('new Date(0).getTime()', epoch.getTime());
log("new Date('2026-10-30') (date-only = UTC)", new Date('2026-10-30').toISOString());
log("new Date('2026-10-30T00:00') (date-time = local)", new Date('2026-10-30T00:00').toISOString());
log("new Date('2026/10/30') (non-ISO: impl-defined)", new Date('2026/10/30').toISOString());
log("new Date('30.10.2026')", String(new Date('30.10.2026')));
log('new Date(2026, 0, 31) month is 0-based -> Jan', new Date(2026, 0, 31).toDateString());
log('new Date(2026, 1, 31) overflow -> Mar 3', new Date(2026, 1, 31).toDateString());
const dst = new Date('2026-10-24T12:00:00+03:00');
const plus24h = new Date(dst.getTime() + 24 * 3600 * 1000);
const plusDay = new Date(dst);
plusDay.setDate(plusDay.getDate() + 1);
log('Kyiv DST end 2026-10-25: +24h local time', plus24h.toTimeString().slice(0, 17));
log('Kyiv DST end 2026-10-25: setDate(+1) local time', plusDay.toTimeString().slice(0, 17));
log('getTimezoneOffset before / after', `${dst.getTimezoneOffset()} / ${plusDay.getTimezoneOffset()}`);
log('nonexistent local 2026-03-29 03:30 (spring gap)', new Date(2026, 2, 29, 3, 30).toTimeString().slice(0, 17));
log('ambiguous local 2026-10-25 03:30 (repeated hour)', new Date(2026, 9, 25, 3, 30).toTimeString().slice(0, 17));
log('Date range: new Date(8.64e15 + 1).getTime()', new Date(8.64e15 + 1).getTime());
log('V8 max string length (buffer.constants)', require('node:buffer').constants.MAX_STRING_LENGTH);
const fmtOpts = { dateStyle: 'medium', timeStyle: 'short' };
const instant = new Date('2026-10-30T09:00:00Z');
log('Intl.DateTimeFormat Kyiv', new Intl.DateTimeFormat('uk-UA', { ...fmtOpts, timeZone: 'Europe/Kyiv' }).format(instant));
log('Intl.DateTimeFormat New York', new Intl.DateTimeFormat('en-US', { ...fmtOpts, timeZone: 'America/New_York' }).format(instant));
log('JSON.stringify(date)', JSON.stringify(instant));
log('new Date(NaN).getTime()', new Date('nope').getTime());
try { new Date('nope').toISOString(); } catch (e) { log('Invalid Date .toISOString()', e.constructor.name); }

console.log('\n--- 6. Temporal availability in this runtime ---');
log('process.version / v8', `${process.version} / ${process.versions.v8}`);
log('typeof Temporal', typeof globalThis.Temporal);
