import path from 'path';

import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import UnoCSS from 'unocss/vite';
import extractorSvelte from '@unocss/extractor-svelte';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
		UnoCSS({
			extractors: [extractorSvelte()],
		}),
  ],
  resolve: {
    alias: {
      '$lib': path.resolve(__dirname, './src/lib'),
      '$styles': path.resolve(__dirname, './src/styles'),
    },
  },
	optimizeDeps: {
		exclude: ['@electric-sql/pglite'],
	},
})
