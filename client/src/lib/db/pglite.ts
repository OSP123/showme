import { PGlite } from '@electric-sql/pglite';
import { electricSync } from '@electric-sql/pglite-sync';

declare global {
  interface ImportMetaEnv {
    readonly VITE_ELECTRIC_SHAPE_URL:  string;
    readonly VITE_ELECTRIC_SOURCE_ID:  string;
    readonly VITE_ELECTRIC_SECRET?:    string; // Optional in insecure mode
  }
}

const SHAPE_URL = import.meta.env.VITE_ELECTRIC_SHAPE_URL!;
const SOURCE_ID = import.meta.env.VITE_ELECTRIC_SOURCE_ID!;
const SOURCE_SECRET = import.meta.env.VITE_ELECTRIC_SECRET; // Optional

let db: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

export function initLocalDb(): Promise<PGlite> {
  if (db) return Promise.resolve(db);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!SHAPE_URL || !SOURCE_ID) {
      console.error('Environment variables:', {
        VITE_ELECTRIC_SHAPE_URL: import.meta.env.VITE_ELECTRIC_SHAPE_URL,
        VITE_ELECTRIC_SOURCE_ID: import.meta.env.VITE_ELECTRIC_SOURCE_ID,
        VITE_ELECTRIC_SECRET: import.meta.env.VITE_ELECTRIC_SECRET
      });
      throw new Error('Missing Electric-SQL config: SHAPE_URL and SOURCE_ID are required');
    }

    console.log('Initializing PGlite with Electric-SQL...');

    const pdb = await PGlite.create({
      dataDir: 'idb://showmedb',
      extensions: { electric: electricSync() },
    });

    // Create tables
    await pdb.exec(`
      CREATE TABLE IF NOT EXISTS maps (
        id           TEXT PRIMARY KEY,
        name         TEXT NOT NULL,
        is_private   TEXT NOT NULL DEFAULT 'false',
        access_token TEXT,
        created_at   TEXT NOT NULL
      );
    `);
    await pdb.exec(`
      CREATE TABLE IF NOT EXISTS pins (
        id           TEXT PRIMARY KEY,
        map_id       TEXT NOT NULL,
        lat          DOUBLE PRECISION NOT NULL,
        lng          DOUBLE PRECISION NOT NULL,
        tags         TEXT NOT NULL DEFAULT '{}',
        description  TEXT,
        photo_urls   TEXT NOT NULL DEFAULT '{}',
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );
    `);

    // Setup sync for maps only (pins will be synced per-map in PinLayer)
    const syncParams: any = { 
      table: 'maps', 
      source_id: SOURCE_ID 
    };
    
    // Only add secret if it exists (for secure mode)
    if (SOURCE_SECRET) {
      syncParams.secret = SOURCE_SECRET;
    }

    console.log('🔄 Setting up maps sync with params:', syncParams);

    await pdb.electric.syncShapeToTable({
      shape: { 
        url: SHAPE_URL, 
        params: syncParams 
      },
      table: 'maps',
      primaryKey: ['id'],
      shapeKey: 'maps',
      initialInsertMethod: 'json'
    });

    // Setup sync for ALL pins (no filtering)
    console.log('🔄 Setting up pins sync for ALL pins...');
    
    await pdb.electric.syncShapeToTable({
      shape: { 
        url: SHAPE_URL, 
        params: {
          table: 'pins',
          source_id: SOURCE_ID
        }
      },
      table: 'pins',
      primaryKey: ['id'],
      shapeKey: 'all_pins',
      initialInsertMethod: 'json'
    });

    // Add database change listeners for debugging
    console.log('📡 Setting up database change listeners...');
    
    // Listen for changes to maps table
    pdb.listen('maps', (data) => {
      console.log('📡 Maps table change detected:', data);
    });
    
    // Listen for changes to pins table  
    pdb.listen('pins', (data) => {
      console.log('📡 Pins table change detected:', data);
    });

    // Log initial table contents
    const mapsResult = await pdb.query('SELECT COUNT(*) as count FROM maps');
    const pinsResult = await pdb.query('SELECT COUNT(*) as count FROM pins');
    console.log('🗃️ Initial database state:');
    console.log('  Maps:', mapsResult.rows[0].count);
    console.log('  Pins:', pinsResult.rows[0].count);

    console.log('PGlite initialized successfully');
    db = pdb;
    return pdb;
  })();

  return initPromise;
}