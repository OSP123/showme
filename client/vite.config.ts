// client/vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import UnoCSS from '@unocss/vite';
import extractorSvelte from '@unocss/extractor-svelte';
import dotenv from 'dotenv';

dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    svelte({ preprocess: vitePreprocess() }),
    UnoCSS({ extractors: [extractorSvelte()] })
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