// What Node does with a rejection nobody handles. Each case runs in a child process.
import { spawnSync } from 'node:child_process';

const cases = [
  ['no handler', [], `Promise.reject(new Error('lost')); setTimeout(() => console.log('still alive'), 50);`],
  ['--unhandled-rejections=warn', ['--unhandled-rejections=warn'], `Promise.reject(new Error('lost')); setTimeout(() => console.log('still alive'), 50);`],
  ['catch attached in same sync turn', [], `const p = Promise.reject(new Error('x')); p.catch(() => console.log('handled'));`],
  ['catch attached after setTimeout 0', [], `const p = Promise.reject(new Error('x')); setTimeout(() => p.catch(() => console.log('handled late')), 0);`],
  ['catch attached after await of another promise', [], `const p = Promise.reject(new Error('x')); await new Promise(r => setTimeout(r, 10)); await p.catch(() => console.log('handled'));`],
  ['start two, await one by one (2nd fails first)', [], `const slow = new Promise(r => setTimeout(r, 50, 'slow')); const bad = new Promise((_, j) => setTimeout(j, 10, new Error('bad'))); try { await slow; await bad; } catch (e) { console.log('caught', e.message); }`],
  ['same with Promise.all', [], `const slow = new Promise(r => setTimeout(r, 50, 'slow')); const bad = new Promise((_, j) => setTimeout(j, 10, new Error('bad'))); try { await Promise.all([slow, bad]); } catch (e) { console.log('caught', e.message); }`],
  ['process.on(unhandledRejection)', [], `process.on('unhandledRejection', (e) => console.log('hook saw:', e.message)); Promise.reject(new Error('lost')); setTimeout(() => console.log('still alive'), 50);`],
];

for (const [label, flags, code] of cases) {
  const r = spawnSync(process.execPath, [...flags, '--input-type=module', '-e', code], { encoding: 'utf8' });
  const firstErr = r.stderr.split('\n').find((l) => /^\w*Error:|Warning:/.test(l)) ?? '';
  console.log(`${label.padEnd(46)} exit=${r.status} stdout=${JSON.stringify(r.stdout.trim())} stderr~${JSON.stringify(firstErr.trim().slice(0, 70))}`);
}
console.log('node', process.version);
