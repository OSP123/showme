// src/lib/api.ts
import type { PGliteWithSync } from '@electric-sql/pglite-sync';
import type { PinRow, PinData, MapRow } from './models';
import { PIN_TTL_HOURS } from './models';
import { initLocalDb }        from './db/pglite';
import { operationQueue }     from './operationQueue';
import { fuzzCoordinates }    from './fuzzing';
import { getEncryptionKey }   from './db/keyManager';
import { encryptPinRow, decryptPinRow, encryptMapRow, decryptMapRow, decryptPinRows, decryptMapRows } from './db/fieldEncryption';

// Check if a map exists in PostgreSQL
async function ensureMapExistsInPostgres(db: PGliteWithSync, mapId: string): Promise<boolean> {
  try {
    // First check if map exists locally
    const localResult = await db.query(
      `SELECT * FROM maps WHERE id = $1`,
      [mapId]
    );
    
    if (localResult.rows.length === 0) {
      console.warn(`⚠️ Map ${mapId} does not exist locally - cannot create pin without a map`);
      // Don't reload here - let the caller handle it
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
      // Check if it's a column doesn't exist error (for backward compatibility)
      // PostgREST error: "Could not find the 'expires_at' column of 'pins' in the schema cache"
      const isColumnError = errorText.includes('column') && (
        errorText.includes('does not exist') || 
        errorText.includes('Could not find') ||
        errorText.includes('PGRST204')
      );
      
      if (isColumnError) {
        // For pins table, try again without the new Phase 3 fields
        if (table === 'pins' && (data.type || data.expires_at)) {
          const fallbackData = { ...data };
          delete fallbackData.type;
          delete fallbackData.expires_at;
          console.debug('🔄 Retrying without Phase 3 fields (columns not migrated yet)...');
          return await saveToPostgres(table, fallbackData);
        }
      }
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
      
      // Clear panic wipe flag when user creates a new map (they're using the app again)
      // This allows polling to resume for the new map
      if (typeof window !== 'undefined' && localStorage.getItem('__panicWipeActive') === 'true') {
        localStorage.removeItem('__panicWipeActive');
        (window as any).__panicWipeActive = false;
        console.log('✅ Panic wipe flag cleared - user created new map, polling will resume');
      }
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

  // EXISTING: Save to local database (with encryption if enabled)
  const encryptionKey = await getEncryptionKey();
  let finalName = name;
  let finalAccessToken = access_token;
  
  if (encryptionKey) {
    // Encrypt sensitive fields before storing
    const encrypted = await encryptMapRow({ name, access_token }, encryptionKey);
    finalName = encrypted.name || name;
    finalAccessToken = encrypted.access_token || access_token;
  }
  
  await db.query(
    `INSERT INTO maps (id,name,is_private,access_token,created_at)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      id,
      finalName,
      is_private ? 'true' : 'false',
      finalAccessToken,
      now
    ]
  );
  
  // NOTE: We do NOT clear the panic wipe flag here
  // The flag prevents fetching OLD pins from PostgREST, but allows NEW maps to be created locally

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
  mapId: string,
  includeExpired: boolean = false
): Promise<PinRow[]> {
  // For backward compatibility, check if expires_at column exists first
  try {
    // Try to query with expires_at filter
    const now = new Date().toISOString();
    const query = includeExpired
      ? `SELECT * FROM pins WHERE map_id = $1 ORDER BY created_at DESC`
      : `SELECT * FROM pins 
         WHERE map_id = $1 
         AND (expires_at IS NULL OR expires_at > $2)
         ORDER BY created_at DESC`;
    
    const params = includeExpired ? [mapId] : [mapId, now];
    const res = await db.query(query, params);
    
    // Decrypt pins if encryption is enabled
    const encryptionKey = await getEncryptionKey();
    return await decryptPinRows(res.rows, encryptionKey);
  } catch (error: any) {
    // If expires_at column doesn't exist, fall back to simple query
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('expires_at') || errorMsg.includes('does not exist')) {
  const res = await db.query(
        `SELECT * FROM pins WHERE map_id = $1 ORDER BY created_at DESC`,
    [mapId]
  );
      // Decrypt pins if encryption is enabled
      const encryptionKey = await getEncryptionKey();
      return await decryptPinRows(res.rows, encryptionKey);
    }
    throw error;
}
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

  // Calculate expiration time (TTL) based on pin type
  let expiresAt: string | null = null;
  if (data.type && PIN_TTL_HOURS[data.type]) {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + PIN_TTL_HOURS[data.type]);
    expiresAt = expirationDate.toISOString();
  } else if (data.expires_at) {
    expiresAt = data.expires_at;
  }

  // Apply fuzzing if map has it enabled
  let finalLat = data.lat;
  let finalLng = data.lng;
  
  try {
    const mapResult = await db.query(
      `SELECT fuzzing_enabled, fuzzing_radius FROM maps WHERE id = $1`,
      [data.map_id]
    );
    
    if (mapResult.rows.length > 0) {
      const map = mapResult.rows[0];
      const fuzzingEnabled = map.fuzzing_enabled === 'true' || map.fuzzing_enabled === true;
      const fuzzingRadius = map.fuzzing_radius || 100;
    
      if (fuzzingEnabled) {
        const fuzzed = fuzzCoordinates(data.lat, data.lng, fuzzingRadius);
        finalLat = fuzzed.lat;
        finalLng = fuzzed.lng;
        console.log(`🔒 Applied fuzzing: ${data.lat},${data.lng} → ${finalLat},${finalLng}`);
      }
    }
  } catch (error) {
    console.warn('⚠️ Could not check fuzzing settings, using original coordinates:', error);
  }

  // Save to local database first (offline-first, with encryption if enabled)
  const encryptionKey = await getEncryptionKey();
  let finalDescription = data.description || null;
  let finalTags = tagsJson;
  let finalPhotoUrls = photoUrlsJson;
  
  if (encryptionKey) {
    // Encrypt sensitive fields before storing
    const encrypted = await encryptPinRow({
      description: data.description || null,
      tags: tagsJson,
      photo_urls: photoUrlsJson
    }, encryptionKey);
    finalDescription = encrypted.description || finalDescription;
    finalTags = encrypted.tags || finalTags;
    finalPhotoUrls = encrypted.photo_urls || finalPhotoUrls;
  }
  
  await db.query(
    `INSERT INTO pins
      (id,map_id,lat,lng,type,tags,description,photo_urls,expires_at,created_at,updated_at)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      id,
      data.map_id,
      finalLat,
      finalLng,
      data.type || null,
      finalTags,
      finalDescription,
      finalPhotoUrls,
      expiresAt,
      now,
      now
    ]
  );
  
  // NOTE: We do NOT clear the panic wipe flag here
  // The flag prevents fetching OLD pins from PostgREST, but allows NEW pins to be created locally
  // This way, deleted pins stay deleted, but new pins work normally

  // Write to PostgREST so pin appears on server for other clients
  // PostgREST expects TEXT[] arrays as JSON arrays (not strings)
  try {
    // Build PostgREST payload
    const postgresData: any = {
      id,
      map_id: data.map_id,
      lat: finalLat,
      lng: finalLng,
      description: data.description || null,
      created_at: now,
      updated_at: now,
      tags: tagsArray.length > 0 ? tagsArray : [],
      photo_urls: (data.photo_urls && data.photo_urls.length > 0) ? data.photo_urls : [],
    };
    
    // Only add Phase 3 fields if they have values
    // saveToPostgres will automatically retry without them if columns don't exist
    if (data.type) {
      postgresData.type = data.type;
    }
    if (expiresAt) {
      postgresData.expires_at = expiresAt;
    }
    
    // Ensure map exists in PostgREST before saving pin (fixes foreign key errors after panic wipe)
    const mapExists = await ensureMapExistsInPostgres(db, data.map_id);
    if (!mapExists) {
      console.warn('⚠️ Map does not exist in PostgreSQL, queueing pin for retry after map sync...');
      const queuedData: any = {
        id,
        map_id: data.map_id,
        lat: finalLat,
        lng: finalLng,
        description: data.description || null,
        created_at: now,
        updated_at: now,
        tags: tagsArray.length > 0 ? tagsArray : [],
        photo_urls: (data.photo_urls && data.photo_urls.length > 0) ? data.photo_urls : [],
      };
      await operationQueue.enqueue('addPin', queuedData);
      return { id };
    }
    
    // Try to save directly - saveToPostgres handles column errors with fallback
    const success = await saveToPostgres('pins', postgresData);
    
    if (success) {
      console.log('✅ Pin saved to PostgreSQL - will sync to other clients');
      // Trigger immediate UI update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('db-change', { 
          detail: { table: 'pins', data: { id, map_id: data.map_id } } 
        }));
      }
    } else {
      console.warn('⚠️ Failed to save pin to PostgreSQL, queueing for retry...');
      // Remove Phase 3 fields for queue (backward compatibility)
      const queuedData = { ...postgresData };
      delete queuedData.type;
      delete queuedData.expires_at;
      await operationQueue.enqueue('addPin', queuedData);
    }
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    // Check if it's a foreign key constraint error
    if (errorMsg.includes('foreign key constraint') || errorMsg.includes('23503')) {
      console.warn('⚠️ Map does not exist in PostgreSQL, queueing pin for retry after map sync...');
      const postgresData: any = {
        id,
        map_id: data.map_id,
        lat: finalLat,
        lng: finalLng,
        description: data.description || null,
        created_at: now,
        updated_at: now,
        tags: tagsArray.length > 0 ? tagsArray : [],
        photo_urls: (data.photo_urls && data.photo_urls.length > 0) ? data.photo_urls : [],
      };
      if (data.type) {
        postgresData.type = data.type;
      }
      if (expiresAt) {
        postgresData.expires_at = expiresAt;
      }
      await operationQueue.enqueue('addPin', postgresData);
        } else {
      console.warn('⚠️ Failed to save pin to PostgreSQL, queueing for retry:', error);
      const postgresData: any = {
        id,
        map_id: data.map_id,
        lat: finalLat,
        lng: finalLng,
        description: data.description || null,
        created_at: now,
        updated_at: now,
        tags: tagsArray.length > 0 ? tagsArray : [],
        photo_urls: (data.photo_urls && data.photo_urls.length > 0) ? data.photo_urls : [],
      };
      if (data.type) {
        postgresData.type = data.type;
      }
      if (expiresAt) {
        postgresData.expires_at = expiresAt;
      }
      await operationQueue.enqueue('addPin', postgresData);
    }
  }

  return { id };
}

/**
 * Get a map by ID with decryption if enabled
 */
export async function getMap(
  db: PGliteWithSync,
  mapId: string
): Promise<MapRow | null> {
  try {
    const result = await db.query(
      `SELECT * FROM maps WHERE id = $1`,
      [mapId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    // Decrypt map if encryption is enabled
    const encryptionKey = await getEncryptionKey();
    const decrypted = await decryptMapRow(result.rows[0] as MapRow, encryptionKey);
    return decrypted;
  } catch (error) {
    console.error('Failed to get map:', error);
    return null;
  }
}

/**
 * Get all maps with decryption if enabled
 */
export async function getAllMaps(
  db: PGliteWithSync
): Promise<MapRow[]> {
  try {
    const result = await db.query(
      `SELECT * FROM maps ORDER BY created_at DESC`
    );
    
    // Decrypt maps if encryption is enabled
    const encryptionKey = await getEncryptionKey();
    return await decryptMapRows(result.rows as MapRow[], encryptionKey);
  } catch (error) {
    console.error('Failed to get maps:', error);
    return [];
  }
}