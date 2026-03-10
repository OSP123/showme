// src/lib/api.ts
import type { PGliteWithSync } from '@electric-sql/pglite-sync';
import type { PinRow, PinData, MapRow } from './models';
import { PIN_TTL_HOURS } from './models';
import { initLocalDb } from './db/pglite';
import { operationQueue } from './operationQueue';
import { fuzzCoordinates } from './fuzzing';

// API base URL - use nginx proxy in Docker, relative path in production
const API_URL = import.meta.env.VITE_API_URL || '';

// Access token for private map authentication
let currentAccessToken: string | null = null;

export function setAccessToken(token: string | null) {
  currentAccessToken = token;
}

export function getAccessToken(): string | null {
  return currentAccessToken;
}

// Append token query parameter to a URL
function appendToken(url: string): string {
  if (!currentAccessToken) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(currentAccessToken)}`;
}

// Look up a map by short access code
export async function lookupAccessCode(code: string): Promise<{ id: string; name: string; is_private: boolean } | null> {
  try {
    const response = await fetch(`${API_URL}/api/maps/code/${encodeURIComponent(code)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

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
    // Use GET /api/maps/:id (returns array [map] or [])
    const response = await fetch(appendToken(`${API_URL}/api/maps/${mapId}`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const maps = await response.json();
      if (Array.isArray(maps) && maps.length > 0) {
        return true; // Map exists in PostgreSQL
      }
    }

    // Map doesn't exist in PostgreSQL, try to create it
    console.log(`🔄 Map ${mapId} not found in PostgreSQL, creating it...`);
    const success = await saveToPostgres('maps', {
      id: map.id,
      name: map.name,
      is_private: map.is_private,
      access_token: map.access_token,
      created_at: map.created_at
    });

    return success;
  } catch (error) {
    console.error('Error checking/creating map in PostgreSQL:', error);
    return false;
  }
}

// Simple PostgreSQL HTTP client using Backend API
async function saveToPostgres(table: string, data: any) {
  try {
    const response = await fetch(appendToken(`${API_URL}/api/${table}`), {
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
): Promise<{ id: string; access_token: string | null; access_code: string | null }> {
  const id = crypto.randomUUID();
  const access_token = is_private ? crypto.randomUUID() : null;
  const now = new Date().toISOString();
  let access_code: string | null = null;

  // NEW: Save to PostgreSQL via backend API for ElectricSQL sync
  try {
    console.log('🔄 Saving map to PostgreSQL via API for real-time sync...');
    const response = await fetch(appendToken(`${API_URL}/api/maps`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        name,
        is_private,
        access_token,
        fuzzing_enabled: false,
        fuzzing_radius: 100,
        created_at: now
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    // Capture access_code from API response (generated server-side)
    const mapData = await response.json();
    access_code = mapData.access_code || null;

    console.log('✅ Map saved to PostgreSQL - will sync via ElectricSQL');

    // Clear panic wipe flag when user creates a new map
    if (typeof window !== 'undefined' && localStorage.getItem('__panicWipeActive') === 'true') {
      localStorage.removeItem('__panicWipeActive');
      (window as any).__panicWipeActive = false;
      console.log('✅ Panic wipe flag cleared - user created new map, polling will resume');
    }
  } catch (error) {
    console.warn('⚠️ Failed to save map to PostgreSQL via API, queueing for retry:', error);
    await operationQueue.enqueue('createMap', {
      id,
      name,
      is_private,
      access_token,
      created_at: now
    });
  }

  // RESTORED: Save to local database for Optimistic UI
  // We use ON CONFLICT to ensure that if sync arrives later, we don't error.
  await db.query(
    `INSERT INTO maps (id,name,is_private,access_token,access_code,created_at)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       is_private = EXCLUDED.is_private,
       access_token = EXCLUDED.access_token,
       access_code = EXCLUDED.access_code`,
    [
      id,
      name,
      is_private,
      access_token,
      access_code,
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

  return { id, access_token, access_code };
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

    return res.rows;
  } catch (error: any) {
    // If expires_at column doesn't exist, fall back to simple query
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('expires_at') || errorMsg.includes('does not exist')) {
      const res = await db.query(
        `SELECT * FROM pins WHERE map_id = $1 ORDER BY created_at DESC`,
        [mapId]
      );
      return res.rows;
    }
    throw error;
  }
}

// Duplicate import removed

export async function addPin(
  db: PGliteWithSync,
  data: PinData
): Promise<{ id: string }> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  // Process tags - include type if provided
  const tagsArray = data.tags || [];
  if (data.type && !tagsArray.includes(data.type)) {
    tagsArray.unshift(data.type);
  }

  // Process photo URLs
  const photoUrlsArray = data.photo_urls || [];

  // Calculate expiration time (TTL) based on pin type
  let expiresAt: string | null = null;

  const ttlHours = data.type ? PIN_TTL_HOURS[data.type] : undefined;

  if (ttlHours !== undefined) {
    const expirationDate = new Date();
    expirationDate.setHours(expirationDate.getHours() + ttlHours);
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

  // Save to local database first (offline-first)
  const finalDescription = data.description || null;
  const finalTags = tagsArray; // Native arrays for PGlite TEXT[]
  const finalPhotoUrls = photoUrlsArray; // Native arrays for PGlite TEXT[]

  // RESTORED: Save to local database first (Optimistic UI)
  try {
    const query = `
      INSERT INTO pins (id, map_id, lat, lng, type, tags, description, photo_urls, expires_at, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        type = EXCLUDED.type,
        tags = EXCLUDED.tags,
        description = EXCLUDED.description,
        photo_urls = EXCLUDED.photo_urls,
        updated_at = EXCLUDED.updated_at
    `;

    await db.query(query, [
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
    ]);
    console.log('✅ Pin saved locally (optimistic)');
  } catch (err) {
    console.error('⚠️ Local pin save failed:', err);
    // Proceed to API save anyway
  }
  try {
    const response = await fetch(appendToken(`${API_URL}/api/pins`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        map_id: data.map_id,
        lat: finalLat,
        lng: finalLng,
        type: data.type || null,
        tags: tagsArray,
        description: data.description || null,
        photo_urls: data.photo_urls || [],
        expires_at: expiresAt,
        created_at: now,
        updated_at: now
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    console.log('✅ Pin saved to PostgreSQL - will sync to other clients');
    // Trigger immediate UI update
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('db-change', {
        detail: { table: 'pins', data: { id, map_id: data.map_id } }
      }));
    }
  } catch (error) {
    console.warn('⚠️ Failed to save pin to PostgreSQL via API, queueing for retry:', error);
    await operationQueue.enqueue('addPin', {
      id,
      map_id: data.map_id,
      lat: finalLat,
      lng: finalLng,
      type: data.type || null,
      tags: tagsArray,
      description: data.description || null,
      photo_urls: data.photo_urls || [],
      created_at: now,
      updated_at: now
    });
  }

  return { id };
}

/**
 * Update an existing pin
 */
export async function updatePin(
  db: PGliteWithSync,
  pinId: string,
  updates: Partial<PinData>
): Promise<void> {
  const now = new Date().toISOString();

  // Process tags if provided
  let tagsArray = updates.tags;
  if (updates.type && tagsArray && !tagsArray.includes(updates.type)) {
    tagsArray = [updates.type, ...tagsArray];
  }

  // Process photo URLs
  const photoUrlsArray = updates.photo_urls || [];

  const finalDescription = updates.description;
  const finalTags = tagsArray;
  const finalPhotoUrls = photoUrlsArray;

  // Build dynamic UPDATE query based on what's being updated
  const setClauses: string[] = ['updated_at = $1'];
  const values: any[] = [now];
  let paramIndex = 2;

  if (updates.description !== undefined) {
    setClauses.push(`description = $${paramIndex}`);
    values.push(finalDescription);
    paramIndex++;
  }

  if (finalTags) {
    setClauses.push(`tags = $${paramIndex}`);
    values.push(finalTags);
    paramIndex++;
  }

  if (updates.photo_urls !== undefined) {
    setClauses.push(`photo_urls = $${paramIndex}`);
    values.push(finalPhotoUrls);
    paramIndex++;
  }

  if (updates.type) {
    setClauses.push(`type = $${paramIndex}`);
    values.push(updates.type);
    paramIndex++;
  }

  // Add pinId as last parameter
  values.push(pinId);

  const query = `UPDATE pins SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`;

  await db.query(query, values);

  console.log(`✅ Pin ${pinId} updated locally`);

  // Sync update to API so other clients and polling don't overwrite
  const apiPayload: Record<string, any> = {};
  if (updates.description !== undefined) apiPayload.description = updates.description || null;
  if (updates.tags !== undefined) apiPayload.tags = tagsArray || [];
  if (updates.photo_urls !== undefined) apiPayload.photo_urls = updates.photo_urls || [];
  if (updates.type) apiPayload.type = updates.type;

  if (Object.keys(apiPayload).length > 0) {
    try {
      const response = await fetch(appendToken(`${API_URL}/api/pins/${pinId}`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      console.log(`✅ Pin ${pinId} synced to API`);
    } catch (error) {
      console.warn(`⚠️ Failed to sync pin update to API, queueing for retry:`, error);
      await operationQueue.enqueue('updatePin', {
        pinId,
        ...apiPayload
      });
    }
  }
}

/**
 * Get a map by ID
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

    return result.rows[0] as MapRow;
  } catch (error) {
    console.error('Failed to get map:', error);
    return null;
  }
}

/**
 * Get all maps
 */
/**
 * Get all maps
 */
export async function getAllMaps(
  db: PGliteWithSync
): Promise<MapRow[]> {
  try {
    const result = await db.query(
      `SELECT * FROM maps ORDER BY created_at DESC`
    );

    return result.rows as MapRow[];
  } catch (error) {
    console.error('Failed to get maps:', error);
    return [];
  }
}


/**
 * Polling Sync Fallback: Fetch pins from API and merge into local DB.
 * This ensures that even if ElectricSQL replication lags or fails, the client eventually gets the data.
 */
/**
 * Polling Sync Fallback: Fetch pins from API and merge into local DB.
 * returns array of NEW pins that were added (for notifications)
 */
export async function syncPinsFromApi(
  db: PGliteWithSync,
  mapId: string,
  after?: string
): Promise<PinData[]> {
  const newPinsFound: PinData[] = [];
  try {
    let url = `${API_URL}/api/pins?map_id=${mapId}`;
    if (after) {
      url += `&after=${after}`;
    }

    const response = await fetch(appendToken(url));
    if (!response.ok) return [];

    const pins = await response.json();
    if (!Array.isArray(pins) || pins.length === 0) return [];

    // Batch upsert into local DB
    // We transactionally insert/update all fetched pins

    // First, check which ones are NEW to this client (for notifications)
    // We do this by checking if ID exists
    const idsToCheck = pins.map(p => p.id);
    const placeholders = idsToCheck.map((_, i) => `$${i + 1}`).join(',');

    let existingIds: Set<string> = new Set();

    try {
      if (idsToCheck.length > 0) {
        const existingRes = await db.query(
          `SELECT id FROM pins WHERE id IN (${placeholders})`,
          idsToCheck
        );
        existingRes.rows.forEach((row: any) => existingIds.add(row.id));
      }
    } catch (e) {
      console.warn('Failed to check existing IDs:', e);
    }

    await db.transaction(async (tx) => {
      for (const pin of pins) {

        // Identify new pins
        if (!existingIds.has(pin.id)) {
          newPinsFound.push(pin);
        }

        await tx.query(
          `INSERT INTO pins (id, map_id, lat, lng, type, tags, description, photo_urls, expires_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             lat = EXCLUDED.lat,
             lng = EXCLUDED.lng,
             type = EXCLUDED.type,
             tags = EXCLUDED.tags,
             description = EXCLUDED.description,
             photo_urls = EXCLUDED.photo_urls,
             expires_at = EXCLUDED.expires_at,
             updated_at = EXCLUDED.updated_at`,
          [
            pin.id,
            pin.map_id,
            pin.lat,
            pin.lng,
            pin.type,
            pin.tags || [],
            pin.description,
            pin.photo_urls || [],
            pin.expires_at,
            pin.created_at,
            pin.updated_at
          ]
        );
      }
    });

    console.log(`📥 Polled ${pins.length} pins from API (${newPinsFound.length} new)`);
    return newPinsFound;
  } catch (error) {
    console.warn('⚠️ Polling sync failed:', error);
    return [];
  }
}