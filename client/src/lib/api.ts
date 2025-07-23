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
      throw new Error(`PostgreSQL save failed: ${response.statusText}`);
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

export async function addPin(
  db: PGliteWithSync,
  data: { map_id: string; lat: number; lng: number }
): Promise<{ id: string }> {
  const id  = crypto.randomUUID();
  const now = new Date().toISOString();

  // NEW: Try to save to PostgreSQL first for ElectricSQL sync
  try {
    console.log('🔄 Saving pin to PostgreSQL for real-time sync...');
    const success = await saveToPostgres('pins', {
      id,
      map_id: data.map_id,
      lat: data.lat,
      lng: data.lng,
      tags: '{}',
      description: null,
      photo_urls: '{}',
      created_at: now,
      updated_at: now
    });
    
    if (success) {
      console.log('✅ Pin saved to PostgreSQL - will sync via ElectricSQL');
    }
  } catch (error) {
    console.error('❌ Failed to save pin to PostgreSQL:', error);
  }

  // EXISTING: Save to local database (preserved exactly)
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
      '{}',
      null,
      '{}',
      now,
      now
    ]
  );

  // EXISTING: Manually trigger sync for pins (preserved exactly)
  try {
    console.log('🔄 Triggering manual sync for pins after adding pin');
    
    // Force a database notification since automatic detection is broken
    setTimeout(async () => {
      try {
        console.log('⚡ Forcing pins sync check...');
        
        // Get fresh database instance
        const freshDb = await initLocalDb();
        
        // Try to manually trigger sync by re-querying
        const result = await freshDb.query('SELECT COUNT(*) FROM pins');
        console.log('📊 Current pin count in DB:', result.rows[0].count);
        
        // Attempt to force sync if method exists
        if (freshDb.electric && typeof freshDb.electric.sync === 'function') {
          await freshDb.electric.sync();
          console.log('✅ Manual sync triggered successfully');
        } else {
          console.log('⚠️ No manual sync method available');
        }
        
      } catch (syncError) {
        console.error('❌ Manual sync failed:', syncError);
      }
    }, 100);
    
  } catch (error) {
    console.error('❌ Failed to trigger pins sync:', error);
  }

  return { id };
}