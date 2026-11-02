import type { NextConfig } from "next";

// Long-term caching for public files (images, video, fonts, json data).
// /_next/static assets already get immutable cache-control from Next itself.
const publicCacheHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=604800, stale-while-revalidate=86400",
  },
];

const nextConfig: NextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:all*(png|jpg|jpeg|webp|avif|gif|svg|ico|woff|woff2|ttf|json|mp4|webm)",
        headers: publicCacheHeaders,
      },
    ];
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'flagcdn.com' },
    ],
  },
};

export default nextConfig;
