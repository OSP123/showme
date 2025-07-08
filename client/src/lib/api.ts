// src/lib/api.ts
import type { PGliteWithSync } from '@electric-sql/pglite-sync';
import type { PinRow }        from './models';
import { initLocalDb }        from './db/pglite';

export async function createMap(
  db: PGliteWithSync,
  name: string,
  is_private = false
): Promise<{ id: string; access_token: string | null }> {
  const id           = crypto.randomUUID();
  const access_token = is_private ? crypto.randomUUID() : null;
  const now          = new Date().toISOString();

  await db.query(
    `INSERT INTO maps (id,name,is_private,access_token,created_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      id,
      name,
      is_private ? 'true' : 'false',
      access_token,
      now
    ]
  );

  return { id, access_token };
}

export async function getPins(
  db: PGliteWithSync,
  mapId: string
): Promise<PinRow[]> {
  const res = await db.query<{ rows: PinRow[] }>(
    `SELECT * FROM pins WHERE map_id = $1 ORDER BY created_at`,
    [mapId]
  );
  return res.rows;
}

export async function addPin(
  db: PGliteWithSync,
  data: { map_id: string; lat: number; lng: number }
): Promise<{ id: string }> {
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();

  await db.query(
    `INSERT INTO pins
      (id,map_id,lat,lng,tags,description,photo_urls,created_at,updated_at)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id,
      data.map_id,
      data.lat,
      data.lng,
      JSON.stringify([]),
      null,
      JSON.stringify([]),
      now,
      now
    ]
  );

  return { id };
}
