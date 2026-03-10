// client/vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import UnoCSS from '@unocss/vite';
import extractorSvelte from '@unocss/extractor-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import dotenv from 'dotenv';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    svelte({ preprocess: vitePreprocess() }),
    UnoCSS({ extractors: [extractorSvelte()] }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,wasm,data}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024, // 20MB for PGlite WASM
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'map-tiles',
              expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-images',
              expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxAgeSeconds: 60 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      manifest: {
        name: 'ShowMe',
        short_name: 'ShowMe',
        description: 'Offline-first collaborative mapping',
        theme_color: '#4a90e2',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '$lib': path.resolve(__dirname, './src/lib'),
      '$styles': path.resolve(__dirname, './src/styles')
    }
  },
  define: {
    'process.env': JSON.stringify(process.env),
    global: 'globalThis'
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    cors: false, // Disable Vite CORS - Electric provides CORS headers
    fs: {
      allow: ['..'] // Allow access to parent directory
    }
  },
  optimizeDeps: {
    exclude: ['@electric-sql/pglite', '@electric-sql/pglite-sync'],
    include: ['maplibre-gl', 'supercluster']
  },
  build: {
    target: 'esnext'
  },
  worker: {
    format: 'es'
  }
});