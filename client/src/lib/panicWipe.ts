// src/lib/panicWipe.ts
// Emergency data deletion functionality

import type { PGlite } from '@electric-sql/pglite';

/**
 * Panic wipe: Deletes all local data immediately
 * This is a safety feature for emergency situations
 */
export async function panicWipe(db: PGlite | any): Promise<void> {
  try {
    console.warn('🚨 PANIC WIPE INITIATED - Deleting all local data...');
    
    // Set flag on window for immediate use (before deletion)
    (window as any).__panicWipeActive = true;
    
    // Dispatch event IMMEDIATELY to stop polling before deletion
    // This prevents polling from re-adding pins during/after deletion
    window.dispatchEvent(new CustomEvent('panic-wipe-complete'));
    console.log('✅ Panic wipe event dispatched - polling should stop now');
    
    // Stop ElectricSQL sync before deletion to prevent re-sync
    try {
      if (db.electric && db.electric.stop) {
        await db.electric.stop();
        console.log('✅ ElectricSQL sync stopped');
      }
    } catch (error) {
      console.warn('⚠️ Could not stop ElectricSQL sync:', error);
    }
    
    // Delete all pins from local database
    const pinsResult = await db.query('DELETE FROM pins');
    console.log('✅ All pins deleted from local DB', pinsResult);
    
    // Also try to delete all pins from PostgREST (remote server)
    // PostgREST requires a filter - use a filter that matches all records
    try {
      // First, try to get all pin IDs to delete them
      const pinsResponse = await fetch('http://localhost:3015/pins?select=id', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (pinsResponse.ok) {
        const allPins = await pinsResponse.json();
        console.log(`🔄 Found ${allPins.length} pins in PostgREST, deleting...`);
        
        // Delete pins in batches (PostgREST might have limits)
        // PostgREST requires UUIDs to be properly formatted in the filter
        for (let i = 0; i < allPins.length; i += 100) {
          const batch = allPins.slice(i, i + 100);
          // PostgREST 'in' operator requires parentheses and comma-separated values
          const ids = batch.map((p: any) => p.id).join(',');
          
          // Delete this batch using PostgREST filter syntax: id=in.(uuid1,uuid2,...)
          const deleteUrl = `http://localhost:3015/pins?id=in.(${ids})`;
          console.log(`🔄 Deleting batch ${Math.floor(i/100) + 1}: ${batch.length} pins from PostgREST`);
          const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
          });
          
          if (deleteResponse.ok || deleteResponse.status === 204) {
            const deletedCount = deleteResponse.headers.get('Content-Range') || batch.length;
            console.log(`✅ Deleted batch ${Math.floor(i/100) + 1} (${batch.length} pins) from PostgREST`);
          } else {
            const errorText = await deleteResponse.text();
            console.error(`❌ Failed to delete pin batch ${Math.floor(i/100) + 1} (${deleteResponse.status}):`, errorText);
            // Continue with next batch even if this one fails
          }
        }
        
        console.log('✅ All pins deleted from PostgREST');
      } else {
        const errorText = await pinsResponse.text();
        console.warn(`⚠️ Could not fetch pins from PostgREST (${pinsResponse.status}):`, errorText);
      }
    } catch (error) {
      console.warn('⚠️ Could not delete pins from PostgREST (server may be offline):', error);
    }
    
    // Verify local deletion
    const pinsCheck = await db.query('SELECT COUNT(*) as count FROM pins');
    const pinsRemaining = pinsCheck.rows[0]?.count || 0;
    if (pinsRemaining > 0) {
      console.warn(`⚠️ Warning: ${pinsRemaining} pins still remain in local DB after deletion`);
    } else {
      console.log('✅ Verified: All pins deleted from local DB successfully');
    }
    
    // Delete all maps from local database
    const mapsResult = await db.query('DELETE FROM maps');
    console.log('✅ All maps deleted from local DB', mapsResult);
    
    // Also try to delete all maps from PostgREST (remote server)
    // PostgREST requires a filter - use a filter that matches all records
    try {
      // First, try to get all map IDs to delete them
      const mapsResponse = await fetch('http://localhost:3015/maps?select=id', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (mapsResponse.ok) {
        const allMaps = await mapsResponse.json();
        console.log(`🔄 Found ${allMaps.length} maps in PostgREST, deleting...`);
        
        // Delete maps in batches (PostgREST might have limits)
        for (let i = 0; i < allMaps.length; i += 100) {
          const batch = allMaps.slice(i, i + 100);
          const ids = batch.map((m: any) => m.id).join(',');
          
          // Delete this batch using PostgREST filter syntax: id=in.(uuid1,uuid2,...)
          const deleteUrl = `http://localhost:3015/maps?id=in.(${ids})`;
          console.log(`🔄 Deleting batch ${Math.floor(i/100) + 1}: ${batch.length} maps from PostgREST`);
          const deleteResponse = await fetch(deleteUrl, {
            method: 'DELETE',
            headers: { 
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
          });
          
          if (deleteResponse.ok || deleteResponse.status === 204) {
            console.log(`✅ Deleted batch ${Math.floor(i/100) + 1} (${batch.length} maps) from PostgREST`);
          } else {
            const errorText = await deleteResponse.text();
            console.error(`❌ Failed to delete map batch ${Math.floor(i/100) + 1} (${deleteResponse.status}):`, errorText);
            // Continue with next batch even if this one fails
          }
        }
        
        console.log('✅ All maps deleted from PostgREST');
      } else {
        const errorText = await mapsResponse.text();
        console.warn(`⚠️ Could not fetch maps from PostgREST (${mapsResponse.status}):`, errorText);
      }
    } catch (error) {
      console.warn('⚠️ Could not delete maps from PostgREST (server may be offline):', error);
    }
    
    // Verify local deletion
    const mapsCheck = await db.query('SELECT COUNT(*) as count FROM maps');
    const mapsRemaining = mapsCheck.rows[0]?.count || 0;
    if (mapsRemaining > 0) {
      console.warn(`⚠️ Warning: ${mapsRemaining} maps still remain in local DB after deletion`);
    } else {
      console.log('✅ Verified: All maps deleted from local DB successfully');
    }
    
    // Clear operation queue FIRST (before localStorage.clear which also clears it)
    // This prevents queued operations from being processed after deletion
    if (typeof window !== 'undefined' && (window as any).operationQueue) {
      try {
        (window as any).operationQueue.clearQueue();
        console.log('✅ Operation queue cleared');
      } catch (e) {
        console.warn('⚠️ Could not clear operation queue:', e);
      }
    }
    
    // Clear localStorage (operation queue, etc.)
    localStorage.clear();
    console.log('✅ LocalStorage cleared');
    
    // Set panic wipe flag AFTER clearing localStorage so it persists across reloads
    // This prevents polling from re-fetching pins from PostgREST after page reload
    localStorage.setItem('__panicWipeActive', 'true');
    (window as any).__panicWipeActive = true;
    console.log('✅ Panic wipe flag set - polling will remain disabled after reload');
    
    // Clear IndexedDB (PGLite storage)
    // Note: PGLite uses IndexedDB, but we can't directly clear it
    // The database will be empty after deleting all tables
    
    console.warn('🚨 PANIC WIPE COMPLETE - All local data has been deleted');
    
    // Clear mapId from URL to force user to create a new map
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('map');
      window.history.replaceState({}, '', url);
      console.log('✅ Cleared mapId from URL - user will need to create a new map');
    }
    
    // Event was already dispatched at the start to stop polling immediately
  } catch (error) {
    console.error('❌ Error during panic wipe:', error);
    throw error;
  }
}

/**
 * Check if panic wipe was recently performed (within last 5 seconds)
 * This helps prevent accidental double-wipes
 */
let lastWipeTime: number = 0;
const WIPE_COOLDOWN_MS = 5000;

export function canPerformPanicWipe(): boolean {
  const now = Date.now();
  if (now - lastWipeTime < WIPE_COOLDOWN_MS) {
    return false;
  }
  lastWipeTime = now;
  return true;
}

/**
 * Reset the cooldown timer (for testing purposes)
 */
export function resetPanicWipeCooldown(): void {
  lastWipeTime = 0;
}

