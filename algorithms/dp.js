'use strict';
// Claims from «Рекурсія і динамічне програмування»:
//  1. Naive recursive Fibonacci makes 2*F(n+1)-1 calls (exponential); memoization and
//     tabulation make it O(n); Number loses exactness after F(78), BigInt does not.
//  2. n! overflows Number at 171 (Infinity) and is inexact long before; BigInt is exact.
//  3. Euclid with `%` takes O(log min(a,b)) steps (worst case: consecutive Fibonacci numbers,
//     Lame's theorem); the subtraction variant takes O(max/min) steps.
//  4. LCS by tabulation is O(n*m) time; reconstruction walks the table back.
//  5. KMP: the prefix function makes search O(n + m) and never moves backwards in the text;
//     naive search on "aaaa...ab" is O(n*m). Fuzz-checked against String.prototype.indexOf.
const assert = require('node:assert/strict');

console.log(`node ${process.version}, V8 ${process.versions.v8}`);

// ---------- 1. Fibonacci ----------
let calls = 0;
function fibNaive(n) {
  calls++;
  return n < 2 ? n : fibNaive(n - 1) + fibNaive(n - 2);
}
function fibMemo(n, memo = new Map()) {
  calls++;
  if (n < 2) return n;
  if (memo.has(n)) return memo.get(n);
  const v = fibMemo(n - 1, memo) + fibMemo(n - 2, memo);
  memo.set(n, v);
  return v;
}
function fibTab(n) {
  // bottom-up, O(1) memory: only the last two values are needed
  let a = 0n;
  let b = 1n;
  for (let i = 0; i < n; i++) [a, b] = [b, a + b];
  return a;
}
console.log('\n1) Fibonacci');
for (const n of [20, 25, 30]) {
  calls = 0;
  const v = fibNaive(n);
  const naiveCalls = calls;
  calls = 0;
  fibMemo(n);
  console.log(`   F(${n}) = ${v}: naive calls ${naiveCalls} (2*F(${n + 1})-1 = ${2 * Number(fibTab(n + 1)) - 1}), memo calls ${calls}`);
}
{
  let firstInexact = -1;
  let a = 0;
  let b = 1;
  for (let i = 0; i < 100; i++) {
    if (BigInt(a) !== fibTab(i)) {
      firstInexact = i;
      break;
    }
    [a, b] = [b, a + b];
  }
  console.log(`   Number Fibonacci first differs from BigInt at n=${firstInexact}: ${a} vs ${fibTab(firstInexact)}; MAX_SAFE_INTEGER=${Number.MAX_SAFE_INTEGER}`);
  console.log(`   F(1477) as Number via loop: ${(() => { let x = 0, y = 1; for (let i = 0; i < 1477; i++) [x, y] = [y, x + y]; return x; })()}`);
}

// ---------- 2. Factorial ----------
function factNumber(n) {
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}
function factBig(n) {
  if (!Number.isInteger(n) || n < 0) throw new RangeError('n must be a non-negative integer');
  let r = 1n;
  for (let i = 2n; i <= BigInt(n); i++) r *= i;
  return r;
}
console.log('\n2) Factorial');
console.log(`   170! as Number = ${factNumber(170)}; 171! = ${factNumber(171)}`);
{
  let firstInexact = -1;
  for (let n = 1; n < 30; n++) {
    if (BigInt(factNumber(n)) !== factBig(n)) {
      firstInexact = n;
      break;
    }
  }
  console.log(`   Number factorial first inexact at n=${firstInexact}: ${BigInt(factNumber(firstInexact))} vs ${factBig(firstInexact)}`);
  console.log(`   171! as BigInt has ${factBig(171).toString().length} digits`);
}

// ---------- 3. Euclid ----------
function gcdMod(a, b) {
  let steps = 0;
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
    steps++;
  }
  return [a, steps];
}
function gcdSub(a, b) {
  let steps = 0;
  a = Math.abs(a);
  b = Math.abs(b);
  if (a === 0 || b === 0) return [a || b, 0];
  while (a !== b) {
    if (a > b) a -= b;
    else b -= a;
    steps++;
  }
  return [a, steps];
}
console.log('\n3) Euclid: steps');
for (const [a, b] of [
  [1_000_000_000, 1],
  [832040, 514229], // F(30), F(29): worst case for the % version
  [123_456_789, 6],
]) {
  const [g1, s1] = gcdMod(a, b);
  const [g2, s2] = gcdSub(a, b);
  assert.equal(g1, g2);
  console.log(`   gcd(${a}, ${b}) = ${g1}: modulo ${s1} steps, subtraction ${s2} steps`);
}

// ---------- 4. LCS ----------
function lcs(x, y) {
  const n = x.length;
  const m = y.length;
  // dp[i][j] = LCS length of x[0..i) and y[0..j)
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = x[i - 1] === y[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const out = [];
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (x[i - 1] === y[j - 1]) {
      out.push(x[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) i--;
    else j--;
  }
  return out.reverse().join('');
}
function lcsBrute(x, y) {
  // exponential: all subsequences of x, longest that is a subsequence of y
  const isSub = (s, t) => {
    let k = 0;
    for (const c of t) if (c === s[k]) k++;
    return k === s.length;
  };
  let best = 0;
  for (let mask = 0; mask < 1 << x.length; mask++) {
    let s = '';
    for (let k = 0; k < x.length; k++) if (mask & (1 << k)) s += x[k];
    if (s.length > best && isSub(s, y)) best = s.length;
  }
  return best;
}
console.log('\n4) LCS');
console.log(`   lcs('ABCDFGHR', 'AEDFHBR') = '${lcs('ABCDFGHR', 'AEDFHBR')}'`);
for (let t = 0; t < 3000; t++) {
  const r = (n) => Array.from({ length: n }, () => 'abc'[Math.floor(Math.random() * 3)]).join('');
  const x = r(Math.floor(Math.random() * 9));
  const y = r(Math.floor(Math.random() * 9));
  const s = lcs(x, y);
  assert.equal(s.length, lcsBrute(x, y));
}
console.log('   length matches brute force on 3000 random pairs');

// ---------- 5. KMP ----------
// pi[i] = length of the longest proper prefix of p[0..i] that is also a suffix of it.
function prefixFunction(p) {
  const pi = new Array(p.length).fill(0);
  let k = 0;
  for (let i = 1; i < p.length; i++) {
    while (k > 0 && p[i] !== p[k]) k = pi[k - 1]; // fall back to the next shorter border
    if (p[i] === p[k]) k++;
    pi[i] = k;
  }
  return pi;
}
function kmpAll(text, p) {
  if (p.length === 0) return { matches: [0], comparisons: 0 };
  const pi = prefixFunction(p);
  const matches = [];
  let comparisons = 0;
  let k = 0; // number of pattern chars currently matched
  for (let i = 0; i < text.length; i++) {
    // Each character comparison is counted once. A mismatch either falls back (k shrinks,
    // which can happen at most as many times as k grew, i.e. <= n in total) or, at k = 0,
    // moves on to the next text char. Hence comparisons <= 2n.
    for (;;) {
      comparisons++;
      if (text[i] === p[k]) {
        k++;
        break;
      }
      if (k === 0) break;
      k = pi[k - 1]; // fall back to the next shorter border; i does not move back
    }
    if (k === p.length) {
      matches.push(i - p.length + 1);
      k = pi[k - 1]; // continue: overlapping matches are found too
    }
  }
  return { matches, comparisons };
}
function naiveAll(text, p) {
  const matches = [];
  let comparisons = 0;
  for (let s = 0; s + p.length <= text.length; s++) {
    let k = 0;
    while (k < p.length && (comparisons++, text[s + k] === p[k])) k++;
    if (k === p.length) matches.push(s);
  }
  return { matches, comparisons };
}
function indexOfAll(text, p) {
  const out = [];
  for (let i = text.indexOf(p); i !== -1; i = text.indexOf(p, i + 1)) out.push(i);
  return out;
}
console.log('\n5) KMP');
console.log(`   prefix function of 'ABCDABD' = [${prefixFunction('ABCDABD')}]`);
console.log(`   prefix function of 'aabaaab' = [${prefixFunction('aabaaab')}]`);
for (let t = 0; t < 50_000; t++) {
  const r = (n) => Array.from({ length: n }, () => 'ab'[Math.floor(Math.random() * 2)]).join('');
  const text = r(Math.floor(Math.random() * 30));
  const p = r(1 + Math.floor(Math.random() * 5));
  assert.deepEqual(kmpAll(text, p).matches, indexOfAll(text, p));
}
console.log('   all matches equal indexOf on 50000 random cases (overlaps included)');
{
  const n = 100_000;
  const m = 1_000;
  const text = 'a'.repeat(n);
  const p = 'a'.repeat(m - 1) + 'b';
  const k = kmpAll(text, p);
  const nv = naiveAll(text, p);
  console.log(`   text 'a'x${n}, pattern 'a'x${m - 1}+'b': KMP ${k.comparisons} comparisons (<= 2n = ${2 * n}), naive ${nv.comparisons}`);
}
