// scripts/copy-pglite.js
import { cpSync, rmSync, existsSync } from 'fs';
import { resolve } from 'path';

// Paths (from project root)
const src  = resolve('node_modules/@electric-sql/pglite/dist');
const dest = resolve('client/public/pglite');

try {
  // Remove destination if it exists
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true });
  }
  
  // Copy the entire dist folder (includes both .wasm and .data)
  cpSync(src, dest, { recursive: true });
  console.log('✅ Copied', src, '→', dest);
} catch (error) {
  console.error('❌ Copy failed:', error);
  process.exit(1);
}
