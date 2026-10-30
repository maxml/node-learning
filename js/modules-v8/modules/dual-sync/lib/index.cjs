// Fallback only for runtimes without require(esm) (they do not know the "module-sync" condition).
class AppError extends Error {}
module.exports = { AppError, registry: new Map(), flavour: 'cjs-fallback' };
