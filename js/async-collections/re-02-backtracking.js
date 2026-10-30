// Catastrophic backtracking in Irregexp vs V8's experimental linear-time engine.
// Run:
//   node re-02-backtracking.js
//   node --enable-experimental-regexp-engine re-02-backtracking.js            (adds the /l flag rows)
//   node --enable-experimental-regexp-engine-on-excessive-backtracks re-02-backtracking.js
const linearAvailable = (() => { try { new RegExp('a', 'l'); return true; } catch { return false; } })();

function time(re, input) {
  const t = process.hrtime.bigint();
  const r = re.test(input);
  return [r, Number(process.hrtime.bigint() - t) / 1e6];
}

console.log('node', process.version, '| execArgv', process.execArgv.join(' ') || '(none)');
for (const n of [16, 18, 20, 22, 24]) {
  const input = 'a'.repeat(n) + '!';
  const [r1, ms1] = time(/^(a+)+$/, input);
  let row = `n=${n}  /^(a+)+$/ -> ${r1} in ${ms1.toFixed(1).padStart(8)} ms`;
  if (linearAvailable) {
    const [r2, ms2] = time(new RegExp('^(a+)+$', 'l'), input);
    row += `   | /^(a+)+$/l -> ${r2} in ${ms2.toFixed(2)} ms`;
  }
  console.log(row);
}
// The same language without nested quantifiers is linear on Irregexp too.
const big = 'a'.repeat(1e6) + '!';
const [r3, ms3] = time(/^a+$/, big);
console.log(`/^a+$/ on 1e6 chars -> ${r3} in ${ms3.toFixed(1)} ms`);
// Backreferences and lookarounds are not supported by the linear engine.
if (linearAvailable) {
  for (const src of ['(a)\\1', '(?<=a)b', 'a(?=b)']) {
    try { new RegExp(src, 'l'); console.log(`/${src}/l accepted`); }
    catch (e) { console.log(`/${src}/l -> ${e.name}: ${e.message}`); }
  }
}
