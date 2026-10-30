// A CommonJS module with module-level state. Evaluated once per resolved filename.
let count = 0;
exports.loadedAt = Date.now();
exports.inc = () => ++count;
exports.get = () => count;
// The module wrapper is real: these five names are parameters of a function Node built around this file.
exports.wrapperArgs = arguments.length; // 5: exports, require, module, __filename, __dirname
exports.thisIsExports = this === module.exports;
