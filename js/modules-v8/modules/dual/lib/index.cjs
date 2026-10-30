// CommonJS build of the "same" library.
class AppError extends Error {}
const registry = new Map();
module.exports = { AppError, registry, flavour: 'cjs' };
