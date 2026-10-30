// Flat config (the only format ESLint 10 reads). An array of config objects, merged in order.
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,             // correctness rules only; no formatting rules
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },   // replaces eslintrc's "env": { "node": true }
    },
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-throw-literal': 'error',
      'no-param-reassign': ['error', { props: true }],
    },
  },
];
