import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@hapcargo/api-client', '@hapcargo/shared'],
  reactStrictMode: true,
  output: 'standalone',
};

export default nextConfig;
