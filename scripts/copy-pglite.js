// scripts/copy-pglite.js
import { copySync, removeSync } from 'fs-extra';
import { resolve } from 'path';

// Paths (from project root)
const src  = resolve('node_modules/@electric-sql/pglite/dist');
const dest = resolve('client/public/pglite');

// Wipe any old copy
removeSync(dest);
// Copy the entire dist folder (includes both .wasm and .data)
copySync(src, dest);
console.log('✅ Copied', src, '→', dest);
