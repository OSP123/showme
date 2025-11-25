// src/lib/panicWipe.ts
// Emergency data deletion functionality

import type { PGliteWithSync } from '@electric-sql/pglite-sync';

/**
 * Panic wipe: Deletes all local data immediately
 * This is a safety feature for emergency situations
 */
export async function panicWipe(db: PGliteWithSync): Promise<void> {
  try {
    console.warn('🚨 PANIC WIPE INITIATED - Deleting all local data...');
    
    // Delete all pins
    await db.query('DELETE FROM pins');
    console.log('✅ All pins deleted');
    
    // Delete all maps
    await db.query('DELETE FROM maps');
    console.log('✅ All maps deleted');
    
    // Clear localStorage (operation queue, etc.)
    localStorage.clear();
    console.log('✅ LocalStorage cleared');
    
    // Clear IndexedDB (PGLite storage)
    // Note: PGLite uses IndexedDB, but we can't directly clear it
    // The database will be empty after deleting all tables
    
    console.warn('🚨 PANIC WIPE COMPLETE - All local data has been deleted');
    
    // Dispatch event to notify UI
    window.dispatchEvent(new CustomEvent('panic-wipe-complete'));
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

