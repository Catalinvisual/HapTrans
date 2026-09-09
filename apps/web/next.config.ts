import type { NextConfig } from 'next';

/** Transpile workspace packages that ship TypeScript/ESM source. */
const nextConfig: NextConfig = {
  transpilePackages: ['@hapcargo/ui', '@hapcargo/shared', '@hapcargo/api-client'],
  reactStrictMode: true,
  output: 'standalone',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
