// Flat config (ESLint 9+ reads only this format; the old .eslintrc.json is ignored).
// neostandard is the maintained successor of eslint-config-standard for flat config.
const neostandard = require('neostandard');

module.exports = [
  ...neostandard({
    semi: true, // was "semi": [2, "always"] in .eslintrc.json
    env: ['browser'], // was "env": { "browser": true }
    globals: ['log', 'ERR', 'AppError', 'projectDir'],
  }),
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2018,
      sourceType: 'module',
    },
    rules: {
      camelcase: 'error',
    },
  },
];
