// client/vite.config.ts
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import UnoCSS from '@unocss/vite';
import extractorSvelte from '@unocss/extractor-svelte';
import dotenv from 'dotenv';

dotenv.config();

// ESM __dirname shim
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    // Disable HMR and compile nested components in non-dev mode
    svelte({
      hot: false,
      compilerOptions: {
        dev: false
      }
    }),

    UnoCSS({
      extractors: [extractorSvelte()],
    }),
  ],

  resolve: {
    alias: {
      '$lib':    path.resolve(__dirname, './src/lib'),
      '$styles': path.resolve(__dirname, './src/styles'),
    },
  },

  optimizeDeps: {
    exclude: ['@electric-sql/pglite'],
  },

  define: {
    'process.env': JSON.stringify(process.env),
  },

  server: {
    port: 5173,
  },
});
