// CommonJS mechanics: the module wrapper, the cache (singleton per resolved path),
// and the two ways to break the singleton. Run: node 01-wrapper-cache.js
const path = require('node:path');

const a = require('./counter');
const b = require('./counter.js'); // different specifier, same resolved filename
a.inc();
a.inc();
console.log('wrapper arguments.length       :', a.wrapperArgs);
console.log('this === module.exports        :', a.thisIsExports);
console.log('same object via ./counter(.js) :', a === b, '| count seen through b:', b.get());

const resolved = require.resolve('./counter');
console.log('cache key                      :', path.relative(__dirname, resolved));

// 1) Deleting the cache entry makes the next require evaluate the file again: new state.
delete require.cache[resolved];
const c = require('./counter');
console.log('after delete require.cache     : same object?', a === c, '| count:', c.get());

// 2) The key is the RESOLVED absolute filename, not the specifier: an absolute path to the same
//    file hits the same entry. Conversely, a second copy of the file under another path (two
//    versions of a package in node_modules) is a second module and a second singleton.
const d = require(path.join(__dirname, '.', 'counter.js'));
console.log('absolute path to same file     : same object as c?', c === d);

// exports vs module.exports: reassigning the local `exports` binding exports nothing.
const m = { exports: {} };
(function (exports, module) {
  exports = { lost: true };          // only rebinds the parameter
  module.exports.kept = true;        // mutates the object that require() returns
})(m.exports, m);
console.log('exports = {...} vs module.exports.x:', m.exports);
