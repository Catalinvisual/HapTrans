import base from '@hapcargo/config/eslint';

export default [
  ...base,
  {
    files: ['src/**/*.ts', 'test/**/*.ts'],
    languageOptions: {
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // acceptable in framework bootstrap
    },
  },
];
