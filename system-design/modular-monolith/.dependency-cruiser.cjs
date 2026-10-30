// Модуль може імпортувати з іншого модуля лише його публічний index.ts.
// $1 у pathNot посилається на групу з from.path (group matching dependency-cruiser).
module.exports = {
  forbidden: [
    {
      name: 'module-public-api-only',
      severity: 'error',
      from: { path: '^src/modules/([^/]+)/' },
      to: {
        path: '^src/modules/[^/]+/',
        pathNot: ['^src/modules/$1/', '^src/modules/[^/]+/index\\.ts$'],
      },
    },
  ],
  options: { tsPreCompilationDeps: true },
};
