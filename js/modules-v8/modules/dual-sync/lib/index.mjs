// Single ESM implementation served to both require() and import on runtimes with require(esm).
export class AppError extends Error {}
export const registry = new Map();
export const flavour = 'esm';
