// src/lib/db/pglite.ts
import { PGlite } from '@electric-sql/pglite';
import { electricSync } from '@electric-sql/pglite-sync';

declare global {
  interface ImportMetaEnv {
    readonly VITE_ELECTRIC_SHAPE_URL:  string;
    readonly VITE_ELECTRIC_SOURCE_ID:  string;
    readonly VITE_ELECTRIC_SECRET:     string;
  }
}

const SHAPE_URL     = import.meta.env.VITE_ELECTRIC_SHAPE_URL!;
const SOURCE_ID     = import.meta.env.VITE_ELECTRIC_SOURCE_ID!;
const SOURCE_SECRET = import.meta.env.VITE_ELECTRIC_SECRET!;

let db: PGlite | null = null;
let initPromise: Promise<PGlite> | null = null;

export function initLocalDb(): Promise<PGlite> {
  if (db) return Promise.resolve(db);
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (!SHAPE_URL || !SOURCE_ID || !SOURCE_SECRET) {
      throw new Error('Missing Electric-SQL config in client/.env');
    }

    const pdb = await PGlite.create({
      dataDir: 'idb://showmedb',
      extensions: { electric: electricSync() },
    });

    // your table creation…
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

    // Only sync maps globally - pins will be synced per-map in PinLayer
    await pdb.electric.syncShapeToTable({
      shape: { url: SHAPE_URL, params: { table: 'maps', source_id: SOURCE_ID, secret: SOURCE_SECRET } },
      table:      'maps',
      primaryKey: ['id'],
      shapeKey:   'maps',
      initialInsertMethod: 'json'
    });

    db = pdb;
    return pdb;
  })();

  return initPromise;
}