'use strict';
// Module-level singleton: survives between test files when they share a process.
const settings = new Map([['currency', 'UAH']]);
module.exports = {
  get: (k) => settings.get(k),
  set: (k, v) => settings.set(k, v),
};
