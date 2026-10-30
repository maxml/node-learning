'use strict';
// Reproduces defects in the old course examples (../ex_algorithms, ../ex_data_structures).
// The old files are only READ here: their source is loaded into a vm context with the
// top-level demo calls stripped, so nothing in them is modified.
// Run: node old-examples-bugs.js
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(rel, exportNames, { strip = [] } = {}) {
  let src = fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  for (const re of strip) src = src.replace(re, '');
  const ctx = { module: { exports: {} }, console: { log() {} }, require: (p) => loadRequire(rel, p) };
  vm.createContext(ctx);
  vm.runInContext(`${src}\n;globalThis.__exports = { ${exportNames.join(', ')} };`, ctx, { filename: rel });
  return { ...ctx.__exports, ctx };
}
function loadRequire(fromRel, p) {
  if (p === './exLinkedList') return load('ex_data_structures/exLinkedList.js', ['LinkedList']).LinkedList;
  throw new Error(`unexpected require ${p}`);
}
const report = (file, msg) => console.log(`- ${file}: ${msg}`);
const allConsoleLogs = /^console\.log\(.*\);?\s*$/gm;

console.log(`node ${process.version}`);

// exStack.js: push appends at the tail, pop removes the head -> FIFO, not LIFO
{
  const { Stack } = load('ex_data_structures/exStack.js', ['Stack'], {
    strip: [/^const stack = new Stack\(\);[\s\S]*$/m],
  });
  const s = new Stack();
  s.push(1);
  s.push(2);
  s.push(3);
  report('ex_data_structures/exStack.js', `push 1,2,3 then pop() -> ${s.pop()} (a stack must return 3)`);
}

// exQueue.js: get() discards the dequeued value and returns `this`
{
  const { FifoQueue } = load('ex_data_structures/exQueue.js', ['FifoQueue'], {
    strip: [/^const queue = new FifoQueue\(\);[\s\S]*$/m],
  });
  const q = new FifoQueue();
  q.push(1).push(2);
  const got = q.get();
  report('ex_data_structures/exQueue.js', `get() returns ${got === q ? 'the queue itself' : got}, the dequeued value 1 is lost; it is also Array#shift (O(n) on large arrays)`);
}

// exLinkedList.js: LinkedListNode assigns `toString = ...` without `this.` -> sloppy-mode global
{
  const { LinkedList, ctx } = load('ex_data_structures/exLinkedList.js', ['LinkedList']);
  const before = Object.prototype.hasOwnProperty.call(ctx, 'toString');
  new LinkedList().push(1);
  const after = Object.prototype.hasOwnProperty.call(ctx, 'toString');
  report('ex_data_structures/exLinkedList.js', `creating a node defines a global toString: before=${before}, after=${after}`);
}

// exGraph.js: GraphVertex passes a comparator to LinkedList (ignored) and calls
// edges.find({callback}) / edges.delete(), which exLinkedList does not support.
{
  const { Graph, GraphVertex, GraphEdge } = load('ex_data_structures/exGraph.js', ['Graph', 'GraphVertex', 'GraphEdge'], {
    strip: [/^test\(\);?\s*$/m],
  });
  const g = new Graph(true);
  const a = new GraphVertex('A');
  const b = new GraphVertex('B');
  const e = new GraphEdge(a, b, 5);
  g.addEdge(e);
  report('ex_data_structures/exGraph.js', `a.hasEdge(e) = ${a.hasEdge(e)}, g.findEdge(a, b) = ${g.findEdge(a, b)} (edge exists)`);
  for (const [name, fn] of [
    ['getAdjacencyMatrix()', () => g.getAdjacencyMatrix()],
    ['deleteEdge(e)', () => g.deleteEdge(e)],
  ]) {
    try {
      fn();
      report('ex_data_structures/exGraph.js', `${name} ok`);
    } catch (err) {
      report('ex_data_structures/exGraph.js', `${name} throws ${err.constructor.name}: ${err.message}`);
    }
  }
}

// exTree.js: references undefined BinarySearchTreeNode and Comparator
{
  try {
    const { BinaryTree } = load('ex_data_structures/exTree.js', ['BinaryTree']);
    new BinaryTree();
    report('ex_data_structures/exTree.js', 'constructed');
  } catch (err) {
    report('ex_data_structures/exTree.js', `new BinaryTree() throws ${err.constructor.name}: ${err.message}`);
  }
}

// fibonacci.js: n = 0 never terminates (while(-1) is truthy); precision lost after F(78)
{
  const { fibonacciNth } = load('ex_algorithms/fibonacci.js', ['fibonacciNth'], { strip: [allConsoleLogs] });
  report('ex_algorithms/fibonacci.js', `fibonacciNth(79) = ${fibonacciNth(79)} (exact: 14472334024676221), fibonacciNth(1477) = ${fibonacciNth(1477)}`);
  const ctx = vm.createContext({});
  const src = fs.readFileSync(path.join(__dirname, '..', 'ex_algorithms/fibonacci.js'), 'utf8').replace(allConsoleLogs, '');
  try {
    vm.runInContext(`${src}\nfibonacciNth(0)`, ctx, { timeout: 500 });
    report('ex_algorithms/fibonacci.js', 'fibonacciNth(0) returned');
  } catch (err) {
    report('ex_algorithms/fibonacci.js', `fibonacciNth(0): ${err.message} (infinite loop)`);
  }
}

// euclidian.js: the iterative version subtracts instead of taking the remainder -> O(max/min)
{
  const { euclideanAlgorithmIterative, euclideanAlgorithm } = load('ex_algorithms/euclidian.js', ['euclideanAlgorithmIterative', 'euclideanAlgorithm'], {
    strip: [allConsoleLogs],
  });
  let t = process.hrtime.bigint();
  euclideanAlgorithmIterative(100_000_000, 1);
  const iterMs = Number(process.hrtime.bigint() - t) / 1e6;
  t = process.hrtime.bigint();
  euclideanAlgorithm(100_000_000, 1);
  const recMs = Number(process.hrtime.bigint() - t) / 1e6;
  report('ex_algorithms/euclidian.js', `gcd(1e8, 1): iterative (subtraction) ${iterMs.toFixed(0)} ms, recursive (modulo) ${recMs.toFixed(3)} ms; non-integers accepted: gcd(0.1, 0.3) = ${euclideanAlgorithm(0.1, 0.3)}`);
}

// factorial.js: Number arithmetic -> inexact from 23!, Infinity from 171!; negative input returns 1
{
  const { factorial, factorialRecursive } = load('ex_algorithms/factorial.js', ['factorial', 'factorialRecursive'], { strip: [allConsoleLogs] });
  report('ex_algorithms/factorial.js', `factorial(171) = ${factorial(171)}, factorial(23) = ${BigInt(factorial(23))} (exact 25852016738884976640000), factorialRecursive(-5) = ${factorialRecursive(-5)}`);
}

// kmp.js: correct for the first occurrence (fuzz against indexOf); it does not find later matches
{
  const { knuthMorrisPratt } = load('ex_algorithms/kmp.js', ['knuthMorrisPratt'], { strip: [allConsoleLogs] });
  let mismatches = 0;
  const cases = 200_000;
  for (let i = 0; i < cases; i++) {
    const r = (n) => Array.from({ length: n }, () => 'ab'[Math.floor(Math.random() * 2)]).join('');
    const text = r(Math.floor(Math.random() * 20));
    const word = r(1 + Math.floor(Math.random() * 5));
    if (knuthMorrisPratt(text, word) !== text.indexOf(word)) mismatches++;
  }
  report('ex_algorithms/kmp.js', `first-match result vs indexOf on ${cases} random cases: ${mismatches} mismatches (correct; returns only the first match)`);
}

// lcs.js: debug console.log left inside; empty result is [''] (an array with one empty string)
{
  const { longestCommonSubsequence } = load('ex_algorithms/lcs.js', ['longestCommonSubsequence'], {
    strip: [/^console\.log\(longestCommonSubsequence.*$/m],
  });
  report('ex_algorithms/lcs.js', `lcs('abc', 'xyz') = ${JSON.stringify(longestCommonSubsequence('abc', 'xyz'))} (length 1 for an empty answer)`);
}
