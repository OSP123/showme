// src/lib/api.ts
import type { PGliteWithSync } from '@electric-sql/pglite-sync';
import type { PinRow }        from './models';
import { initLocalDb }        from './db/pglite';

// Simple PostgreSQL HTTP client using PostgREST
async function saveToPostgres(table: string, data: any) {
  try {
    const response = await fetch(`http://localhost:3015/${table}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`PostgreSQL save failed (${response.status}):`, errorText);
      throw new Error(`PostgreSQL save failed: ${response.statusText} - ${errorText}`);
    }
    
    return true;
  } catch (error) {
    console.error('PostgreSQL save error:', error);
    return false;
  }
}

export async function createMap(
  db: PGliteWithSync,
  name: string,
  is_private = false
): Promise<{ id: string; access_token: string | null }> {
  const id           = crypto.randomUUID();
  const access_token = is_private ? crypto.randomUUID() : null;
  const now          = new Date().toISOString();

  // NEW: Try to save to PostgreSQL first for ElectricSQL sync
  try {
    console.log('🔄 Saving map to PostgreSQL for real-time sync...');
    const success = await saveToPostgres('maps', {
      id,
      name,
      is_private,
      access_token,
      created_at: now
    });
    
    if (success) {
      console.log('✅ Map saved to PostgreSQL - will sync via ElectricSQL');
    }
  } catch (error) {
    console.error('❌ Failed to save map to PostgreSQL:', error);
  }

  // EXISTING: Save to local database (preserved exactly)
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

  // EXISTING: Manually trigger sync for maps (preserved exactly)
  try {
    console.log('🔄 Triggering manual sync for maps after creation');
    // Force ElectricSQL to check for changes
    setTimeout(() => {
      console.log('⚡ Maps sync trigger delayed');
    }, 100);
  } catch (error) {
    console.error('❌ Failed to trigger maps sync:', error);
  }

  return { id, access_token };
}

export async function getPins(
  db: PGliteWithSync,
  mapId: string
): Promise<PinRow[]> {
  // EXISTING: Unchanged
  const res = await db.query(
    `SELECT * FROM pins WHERE map_id = $1 ORDER BY created_at`,
    [mapId]
  );
  return res.rows;
}

import type { PinData } from './models';

export async function addPin(
  db: PGliteWithSync,
  data: PinData
): Promise<{ id: string }> {
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();

  // Process tags - include type if provided
  const tagsArray = data.tags || [];
  if (data.type && !tagsArray.includes(data.type)) {
    tagsArray.unshift(data.type);
  }
  const tagsJson = JSON.stringify(tagsArray);

  // Process photo URLs
  const photoUrlsJson = JSON.stringify(data.photo_urls || []);

  // Save to local database first (offline-first)
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
      tagsJson,
      data.description || null,
      photoUrlsJson,
      now,
      now
    ]
  );

  // Write to PostgREST so pin appears on server for other clients
  // PostgREST expects TEXT[] arrays as JSON arrays (not strings)
  try {
    const postgresData: any = {
      id,
      map_id: data.map_id,
      lat: data.lat,
      lng: data.lng,
      description: data.description || null,
      created_at: now,
      updated_at: now
    };
    
    // PostgREST expects TEXT[] columns as JSON arrays
    postgresData.tags = tagsArray.length > 0 ? tagsArray : [];
    postgresData.photo_urls = (data.photo_urls && data.photo_urls.length > 0) 
      ? data.photo_urls 
      : [];
    
    const success = await saveToPostgres('pins', postgresData);
    if (success) {
      console.log('✅ Pin saved to PostgreSQL - will sync to other clients');
    }
  } catch (error) {
    console.warn('⚠️ Failed to save pin to PostgreSQL (will sync when online):', error);
  }

  return { id };
}