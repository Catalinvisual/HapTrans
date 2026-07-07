import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ],
  build: {
    rolldownOptions: {
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

