// vite.config.ts
import { defineConfig } from "file:///Users/omar.patel/projects/personal/showme/client/node_modules/.pnpm/vite@4.5.14_@types+node@20.19.25/node_modules/vite/dist/node/index.js";
import path from "path";
import { fileURLToPath } from "url";
import { svelte, vitePreprocess } from "file:///Users/omar.patel/projects/personal/showme/client/node_modules/.pnpm/@sveltejs+vite-plugin-svelte@2.5.3_svelte@4.2.20_vite@4.5.14_@types+node@20.19.25_/node_modules/@sveltejs/vite-plugin-svelte/src/index.js";
import UnoCSS from "file:///Users/omar.patel/projects/personal/showme/client/node_modules/.pnpm/@unocss+vite@66.3.3_vite@4.5.14_@types+node@20.19.25__vue@3.5.17_typescript@4.9.5_/node_modules/@unocss/vite/dist/index.mjs";
import extractorSvelte from "file:///Users/omar.patel/projects/personal/showme/client/node_modules/.pnpm/@unocss+extractor-svelte@66.3.3/node_modules/@unocss/extractor-svelte/dist/index.mjs";
import dotenv from "file:///Users/omar.patel/projects/personal/showme/client/node_modules/.pnpm/dotenv@16.6.1/node_modules/dotenv/lib/main.js";
var __vite_injected_original_import_meta_url = "file:///Users/omar.patel/projects/personal/showme/client/vite.config.ts";
dotenv.config();
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig({
  plugins: [
    svelte({ preprocess: vitePreprocess() }),
    UnoCSS({ extractors: [extractorSvelte()] })
  ],
  resolve: {
    alias: {
      "$lib": path.resolve(__dirname, "./src/lib"),
      "$styles": path.resolve(__dirname, "./src/styles")
    }
  },
  define: {
    "process.env": JSON.stringify(process.env),
    global: "globalThis"
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    fs: {
      allow: [".."]
      // Allow access to parent directory
    }
  },
  optimizeDeps: {
    exclude: ["@electric-sql/pglite", "@electric-sql/pglite-sync"],
    include: ["maplibre-gl", "supercluster"]
  },
  build: {
    target: "esnext"
  },
  worker: {
    format: "es"
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvb21hci5wYXRlbC9wcm9qZWN0cy9wZXJzb25hbC9zaG93bWUvY2xpZW50XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvb21hci5wYXRlbC9wcm9qZWN0cy9wZXJzb25hbC9zaG93bWUvY2xpZW50L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9vbWFyLnBhdGVsL3Byb2plY3RzL3BlcnNvbmFsL3Nob3dtZS9jbGllbnQvdml0ZS5jb25maWcudHNcIjsvLyBjbGllbnQvdml0ZS5jb25maWcudHNcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcbmltcG9ydCB7IHN2ZWx0ZSwgdml0ZVByZXByb2Nlc3MgfSBmcm9tICdAc3ZlbHRlanMvdml0ZS1wbHVnaW4tc3ZlbHRlJztcbmltcG9ydCBVbm9DU1MgZnJvbSAnQHVub2Nzcy92aXRlJztcbmltcG9ydCBleHRyYWN0b3JTdmVsdGUgZnJvbSAnQHVub2Nzcy9leHRyYWN0b3Itc3ZlbHRlJztcbmltcG9ydCBkb3RlbnYgZnJvbSAnZG90ZW52JztcblxuZG90ZW52LmNvbmZpZygpO1xuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtcbiAgICBzdmVsdGUoeyBwcmVwcm9jZXNzOiB2aXRlUHJlcHJvY2VzcygpIH0pLFxuICAgIFVub0NTUyh7IGV4dHJhY3RvcnM6IFtleHRyYWN0b3JTdmVsdGUoKV0gfSlcbiAgXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnJGxpYic6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9saWInKSxcbiAgICAgICckc3R5bGVzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjL3N0eWxlcycpXG4gICAgfVxuICB9LFxuICBkZWZpbmU6IHsgXG4gICAgJ3Byb2Nlc3MuZW52JzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYpLFxuICAgIGdsb2JhbDogJ2dsb2JhbFRoaXMnXG4gIH0sXG4gIHNlcnZlcjoge1xuICAgIGhvc3Q6ICcwLjAuMC4wJyxcbiAgICBwb3J0OiA1MTczLFxuICAgIGZzOiB7XG4gICAgICBhbGxvdzogWycuLiddIC8vIEFsbG93IGFjY2VzcyB0byBwYXJlbnQgZGlyZWN0b3J5XG4gICAgfVxuICB9LFxuICBvcHRpbWl6ZURlcHM6IHtcbiAgICBleGNsdWRlOiBbJ0BlbGVjdHJpYy1zcWwvcGdsaXRlJywgJ0BlbGVjdHJpYy1zcWwvcGdsaXRlLXN5bmMnXSxcbiAgICBpbmNsdWRlOiBbJ21hcGxpYnJlLWdsJywgJ3N1cGVyY2x1c3RlciddXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgdGFyZ2V0OiAnZXNuZXh0J1xuICB9LFxuICB3b3JrZXI6IHtcbiAgICBmb3JtYXQ6ICdlcydcbiAgfVxufSk7Il0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHFCQUFxQjtBQUM5QixTQUFTLFFBQVEsc0JBQXNCO0FBQ3ZDLE9BQU8sWUFBWTtBQUNuQixPQUFPLHFCQUFxQjtBQUM1QixPQUFPLFlBQVk7QUFQdUwsSUFBTSwyQ0FBMkM7QUFTM1AsT0FBTyxPQUFPO0FBQ2QsSUFBTSxZQUFZLEtBQUssUUFBUSxjQUFjLHdDQUFlLENBQUM7QUFFN0QsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsT0FBTyxFQUFFLFlBQVksZUFBZSxFQUFFLENBQUM7QUFBQSxJQUN2QyxPQUFPLEVBQUUsWUFBWSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsQ0FBQztBQUFBLEVBQzVDO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxRQUFRLEtBQUssUUFBUSxXQUFXLFdBQVc7QUFBQSxNQUMzQyxXQUFXLEtBQUssUUFBUSxXQUFXLGNBQWM7QUFBQSxJQUNuRDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLGVBQWUsS0FBSyxVQUFVLFFBQVEsR0FBRztBQUFBLElBQ3pDLFFBQVE7QUFBQSxFQUNWO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixNQUFNO0FBQUEsSUFDTixJQUFJO0FBQUEsTUFDRixPQUFPLENBQUMsSUFBSTtBQUFBO0FBQUEsSUFDZDtBQUFBLEVBQ0Y7QUFBQSxFQUNBLGNBQWM7QUFBQSxJQUNaLFNBQVMsQ0FBQyx3QkFBd0IsMkJBQTJCO0FBQUEsSUFDN0QsU0FBUyxDQUFDLGVBQWUsY0FBYztBQUFBLEVBQ3pDO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxRQUFRO0FBQUEsRUFDVjtBQUFBLEVBQ0EsUUFBUTtBQUFBLElBQ04sUUFBUTtBQUFBLEVBQ1Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
