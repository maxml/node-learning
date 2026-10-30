// Do Node's own child_process options read polluted prototype properties?
// Classic gadget: Object.prototype.shell turns execFile/spawn (argv, no shell) into shell execution.
import { execFileSync, spawnSync } from 'node:child_process';

console.log('node', process.version);
const run = (label, fn) => {
  try { console.log(label.padEnd(44), JSON.stringify(fn().toString().trim())); }
  catch (e) { console.log(label.padEnd(44), 'threw', e.code || e.message); }
};

run('clean: execFileSync echo $HOME', () => execFileSync('echo', ['$HOME']));
Object.prototype.shell = true;
run('polluted shell=true: execFileSync echo $HOME', () => execFileSync('echo', ['$HOME']));
run('polluted shell=true: spawnSync echo $HOME', () => spawnSync('echo', ['$HOME']).stdout);
delete Object.prototype.shell;

// env gadget: options.env read from prototype?
Object.prototype.env = { INJECTED: 'yes' };
run('polluted env: printenv INJECTED', () => execFileSync('sh', ['-c', 'echo "INJECTED=$INJECTED"']));
delete Object.prototype.env;
