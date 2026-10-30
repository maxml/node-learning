// Node permission model: what --permission blocks and what it does not.
// Run: node --permission --allow-fs-read=/ex permission.mjs
import fs from 'node:fs';
import cp from 'node:child_process';
import net from 'node:net';
import { Worker } from 'node:worker_threads';

console.log('node', process.version, 'execArgv', process.execArgv.join(' '));
const t = (label, fn) => {
  try { const r = fn(); console.log(label.padEnd(46), 'OK', r === undefined ? '' : String(r).slice(0, 40)); }
  catch (e) { console.log(label.padEnd(46), 'DENIED', e.code, e.permission ?? '', e.resource ?? ''); }
};

console.log('process.permission.has fs.read /etc/passwd =', process.permission?.has('fs.read', '/etc/passwd'));
t('fs.readFileSync(/etc/passwd)', () => fs.readFileSync('/etc/passwd', 'utf8').split('\n')[0]);
t('fs.writeFileSync(/ex/out.txt)', () => fs.writeFileSync('/ex/out.txt', 'x'));
t('child_process.execSync(id)', () => cp.execSync('id').toString());
t('new Worker', () => { const w = new Worker('1', { eval: true }); w.terminate(); });
t('process.binding (legacy internals)', () => typeof process.binding('fs'));

// Network: not covered in Node 24 (flag --allow-net appears only in v25)
await new Promise((resolve) => {
  const srv = net.createServer((s) => s.end('pong')).listen(0, '127.0.0.1', () => {
    const c = net.connect(srv.address().port, '127.0.0.1');
    c.on('data', (d) => { console.log('net.connect to 127.0.0.1'.padEnd(46), 'OK', d.toString()); c.end(); srv.close(resolve); });
    c.on('error', (e) => { console.log('net.connect'.padEnd(46), 'DENIED', e.code); srv.close(resolve); });
  });
  srv.on('error', (e) => { console.log('net.createServer.listen'.padEnd(46), 'DENIED', e.code); resolve(); });
});

// File descriptor opened before... here: stdin/stdout fds are usable regardless
t('fs.writeSync(1, ...) on an existing fd', () => fs.writeSync(1, 'written via fd 1\n'));
