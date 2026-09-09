import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@hapcargo/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
