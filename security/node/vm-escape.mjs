// node:vm is not a security boundary: the context's objects lead back to the host realm.
import vm from 'node:vm';
console.log('node', process.version);

const code = `const P = this.constructor.constructor('return process')(); P.version + ' pid=' + P.pid + ' cwd=' + P.cwd()`;
console.log('escape via this.constructor.constructor:', vm.runInNewContext(code, {}));

// Even a null-prototype sandbox leaks once you pass any host object in (here: a function)
const code2 = `log.constructor('return process')().env.HOME`;
console.log('escape via passed-in host function:', vm.runInNewContext(code2, Object.assign(Object.create(null), { log: console.log })));

// timeout stops a synchronous loop only (docs: it does not cover async work scheduled by the code)
try { vm.runInNewContext('while(true){}', {}, { timeout: 50 }); }
catch (e) { console.log('sync loop with timeout ->', e.code); }
