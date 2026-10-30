// Dual-package hazard: one package name, two module instances when the app mixes require and import.
// The package refers to itself by name (self-reference works because package.json has "exports").
// Run: node 01-hazard.cjs
const viaRequire = require('dual-demo');

import('dual-demo').then((viaImport) => {
  console.log('flavours                :', viaRequire.flavour, viaImport.flavour);
  viaRequire.registry.set('plugin', true);
  console.log('state shared?           :', viaImport.registry.has('plugin'));
  const err = new viaRequire.AppError('boom');
  console.log('err instanceof AppError :', err instanceof viaImport.AppError);
});
