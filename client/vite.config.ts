import { defineConfig } from 'vite'
import { execSync } from 'node:child_process'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Build identity injected into the served HTML. The API reports its own commit,
// so the browser and the API can be compared instead of assuming a push shipped.
function resolveBuildId(): string {
  const fromEnv = process.env.RAILWAY_GIT_COMMIT_SHA || process.env.SOURCE_VERSION || process.env.VERCEL_GIT_COMMIT_SHA
  if (fromEnv) return fromEnv
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return 'unknown'
  }
}

const buildId = resolveBuildId()
const buildTime = new Date().toISOString()

function buildIdentityPlugin() {
  return {
    name: 'hapcargo-build-identity',
    transformIndexHtml(html: string) {
      return html.replace(
        '</head>',
        `    <meta name="hapcargo-build" content="${buildId}" />\n    <meta name="hapcargo-built-at" content="${buildTime}" />\n  </head>`,
      )
    },
  }
}

export default defineConfig({
  define: {
    __HAPCARGO_BUILD__: JSON.stringify(buildId),
    __HAPCARGO_BUILT_AT__: JSON.stringify(buildTime),
  },
  plugins: [
    react(),
    buildIdentityPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'HAPCARGO',
        short_name: 'HAPCARGO',
        description: 'HAP Cargo Transport Management System',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png?v=8',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png?v=8',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png?v=8',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        // Only cache static assets (HTML, CSS, JS, Fonts, Images)
        // EXPLICITLY DO NOT CACHE API REQUESTS to avoid stale data
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
            }
          }
        ],
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // A new deployment must take over without leaving old precaches behind
        // or waiting for every tab to close.
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        // Split heavy vendor libs into separate cached chunks
        manualChunks: (id: string) => {
          if (id.includes('jspdf') || id.includes('jspdf-autotable')) return 'vendor-pdf';
          if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-map';
          if (id.includes('react-router') || id.includes('@remix-run')) return 'vendor-router';
          if (id.includes('react-dom') || id.includes('react/')) return 'vendor-react';
          if (id.includes('axios')) return 'vendor-axios';
          if (id.includes('i18next') || id.includes('react-i18next')) return 'vendor-i18n';
          if (id.includes('html2canvas') || id.includes('dompurify')) return 'vendor-html';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})

