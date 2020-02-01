// console.log(require('./module'));

// console.log(require.main);

// console.log(require('./module2'));

// // Additionally, on case-insensitive file systems or operating systems, different resolved filenames can point to the same file, but the cache will still treat them as different modules and will reload the file multiple times. For example, require('./foo') and require('./FOO') return two different objects, irrespective of whether or not ./foo and ./FOO are the same file.

// console.log(require('./module'));

console.log(require('./cycle'))

// console.log(require('./wrapper'))

// console.log(require('./module4.cjs'))
// console.log(require('./wasm.wasm'))
