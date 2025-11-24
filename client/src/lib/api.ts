// src/lib/api.ts
import type { PGliteWithSync } from '@electric-sql/pglite-sync';
import type { PinRow }        from './models';
import { initLocalDb }        from './db/pglite';
import { operationQueue }     from './operationQueue';

// Check if a map exists in PostgreSQL
async function ensureMapExistsInPostgres(db: PGliteWithSync, mapId: string): Promise<boolean> {
  try {
    // First check if map exists locally
    const localResult = await db.query(
      `SELECT * FROM maps WHERE id = $1`,
      [mapId]
    );
    
    if (localResult.rows.length === 0) {
      console.warn(`⚠️ Map ${mapId} does not exist locally`);
      return false;
    }

    const map = localResult.rows[0];
    
    // Check if map exists in PostgreSQL
    const response = await fetch(`http://localhost:3015/maps?id=eq.${mapId}&select=id`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (response.ok) {
      const maps = await response.json();
      if (maps.length > 0) {
        return true; // Map exists in PostgreSQL
      }
    }
    
    // Map doesn't exist in PostgreSQL, try to create it
    console.log(`🔄 Map ${mapId} not found in PostgreSQL, creating it...`);
    const success = await saveToPostgres('maps', {
      id: map.id,
      name: map.name,
      is_private: map.is_private === 'true',
      access_token: map.access_token,
      created_at: map.created_at
    });
    
    return success;
  } catch (error) {
    console.error('Error checking/creating map in PostgreSQL:', error);
    return false;
  }
}

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
    } else {
      console.warn('⚠️ Failed to save map to PostgreSQL, queueing for retry...');
      // Queue for retry when online
      await operationQueue.enqueue('createMap', {
        id,
        name,
        is_private,
        access_token,
        created_at: now
      });
    }
  } catch (error) {
    console.warn('⚠️ Failed to save map to PostgreSQL, queueing for retry:', error);
    // Queue for retry when online
    await operationQueue.enqueue('createMap', {
      id,
      name,
      is_private,
      access_token,
      created_at: now
    });
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
    // First, ensure the map exists in PostgreSQL
    // This prevents foreign key constraint violations
    const mapExists = await ensureMapExistsInPostgres(db, data.map_id);
    if (!mapExists) {
      console.warn('⚠️ Map does not exist in PostgreSQL yet, queueing pin for retry...');
      // Queue pin for retry - it will be processed once the map is synced
      const postgresData: any = {
        id,
        map_id: data.map_id,
        lat: data.lat,
        lng: data.lng,
        description: data.description || null,
        created_at: now,
        updated_at: now,
        tags: tagsArray.length > 0 ? tagsArray : [],
        photo_urls: (data.photo_urls && data.photo_urls.length > 0) ? data.photo_urls : [],
      };
      await operationQueue.enqueue('addPin', postgresData);
      return { id };
    }

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
    } else {
      console.warn('⚠️ Failed to save pin to PostgreSQL, queueing for retry...');
      // Queue for retry when online
      await operationQueue.enqueue('addPin', postgresData);
    }
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    // Check if it's a foreign key constraint error
    if (errorMsg.includes('foreign key constraint') || errorMsg.includes('23503')) {
      console.warn('⚠️ Map does not exist in PostgreSQL, queueing pin for retry after map sync...');
      const postgresData: any = {
        id,
        map_id: data.map_id,
        lat: data.lat,
        lng: data.lng,
        description: data.description || null,
        created_at: now,
        updated_at: now,
        tags: tagsArray.length > 0 ? tagsArray : [],
        photo_urls: (data.photo_urls && data.photo_urls.length > 0) ? data.photo_urls : [],
      };
      await operationQueue.enqueue('addPin', postgresData);
    } else {
      console.warn('⚠️ Failed to save pin to PostgreSQL, queueing for retry:', error);
      const postgresData: any = {
        id,
        map_id: data.map_id,
        lat: data.lat,
        lng: data.lng,
        description: data.description || null,
        created_at: now,
        updated_at: now,
        tags: tagsArray.length > 0 ? tagsArray : [],
        photo_urls: (data.photo_urls && data.photo_urls.length > 0) ? data.photo_urls : [],
      };
      await operationQueue.enqueue('addPin', postgresData);
    }
  }

  return { id };
}