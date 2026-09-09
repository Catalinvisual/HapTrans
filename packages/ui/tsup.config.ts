import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    outDir: 'dist',
    banner: { js: '"use client";' },
  },
  {
    entry: ['src/components/icons.tsx'],
    format: ['esm'],
    dts: true,
    clean: false,
    external: ['react', 'react-dom', 'react/jsx-runtime'],
    outDir: 'dist/components',
    banner: { js: '"use client";' },
  },
]);