// Same app as ../dual/01-hazard.cjs, but the package routes both loaders to ONE ESM file
// via the "module-sync" condition. Run: node 01-no-hazard.cjs
const viaRequire = require('dual-sync-demo');

import('dual-sync-demo').then((viaImport) => {
  console.log('flavours                :', viaRequire.flavour, viaImport.flavour);
  viaRequire.registry.set('plugin', true);
  console.log('state shared?           :', viaImport.registry.has('plugin'));
  console.log('err instanceof AppError :', new viaRequire.AppError('boom') instanceof viaImport.AppError);
});
