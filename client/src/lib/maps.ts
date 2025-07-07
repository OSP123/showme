// e.g. src/lib/maps.ts
import type { MapRow, PinRow } from './models';
import { initLocalDb } from './db';

// Fetch all pins for a map (real-time if you re-query on changes)
export async function getPins(mapId: string): Promise<PinRow[]> {
  const db = await initLocalDb();
  return db.all<PinRow>(
    'SELECT * FROM pins WHERE map_id = ? ORDER BY created_at',
    [mapId]
  );
}

// Create a new pin
export async function addPin(data: {
  map_id: string;
  lat: number;
  lng: number;
  tags?: string[];
  description?: string;
  photo_urls?: string[];
}) {
  const db = await initLocalDb();
  await db.run(
    `INSERT INTO pins(
       id, map_id, lat, lng, tags, description, photo_urls,
       created_at, updated_at
     ) VALUES (
       ?,    ?,      ?,   ?,   ?,       ?,          ?, 
       datetime('now'), datetime('now')
     )`,
    [
      crypto.randomUUID(),
      data.map_id,
      data.lat,
      data.lng,
      data.tags || [],
      data.description || null,
      data.photo_urls || []
    ]
  );
  // Electric-SQL picks this up and pushes upstream automatically
}
