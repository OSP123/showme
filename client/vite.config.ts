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
  define: { 'process.env': JSON.stringify(process.env) },
  server: { port: 5173 }
});
