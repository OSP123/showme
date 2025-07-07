import { PGlite }       from '@electric-sql/pglite';
import { electricSync } from '@electric-sql/pglite-sync';

const SHAPE_URL = import.meta.env.VITE_ELECTRIC_SHAPE_URL;

export let db: PGlite;

export async function initLocalDb() {
  if (db) return db;

  db = await PGlite.create({
    // IndexedDB under the hood
    dataDir: 'idb://showmedb',
    extensions: { electric: electricSync() }
  });

  // mirror your central tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS maps (
      id           TEXT PRIMARY KEY,
      name         TEXT,
      created_at   TEXT,
      is_private   BOOLEAN,
      access_token TEXT
    );
    CREATE TABLE IF NOT EXISTS pins (
      id           TEXT PRIMARY KEY,
      map_id       TEXT,
      lat          REAL,
      lng          REAL,
      tags         TEXT[],
      description  TEXT,
      photo_urls   TEXT[],
      created_at   TEXT,
      updated_at   TEXT
    );
  `);

  // hook up replication
  await Promise.all([
    db.electric.syncShapeToTable({
      shape: { url: `${SHAPE_URL}?table=maps` },
      table: 'maps',
      primaryKey: ['id']
    }),
    db.electric.syncShapeToTable({
      shape: { url: `${SHAPE_URL}?table=pins` },
      table: 'pins',
      primaryKey: ['id']
    }),
  ]);

  return db;
}
