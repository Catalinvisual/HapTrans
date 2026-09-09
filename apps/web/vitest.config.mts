import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@hapcargo/ui/icons',
        replacement: `${import.meta.dirname}/../../packages/ui/src/components/icons.tsx`,
      },
      {
        find: '@hapcargo/ui',
        replacement: `${import.meta.dirname}/../../packages/ui/src/index.ts`,
      },
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
