// src/lib/expiredPinsCleanup.ts
// Utility to clean up expired pins from the database

import type { PGliteWithSync } from '@electric-sql/pglite-sync';

/**
 * Remove expired pins from the database
 * @param db Database instance
 * @returns Number of pins deleted
 */
export async function cleanupExpiredPins(db: PGliteWithSync): Promise<number> {
  try {
    // Check if expires_at column exists first
    try {
      await db.query('SELECT expires_at FROM pins LIMIT 1');
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('expires_at') || errorMsg.includes('does not exist')) {
        // Column doesn't exist yet, skip cleanup
        return 0;
      }
      throw error;
    }

    const now = new Date().toISOString();
    const result = await db.query(
      `DELETE FROM pins WHERE expires_at IS NOT NULL AND expires_at <= $1`,
      [now]
    );
    
    const deletedCount = result.rowCount || 0;
    if (deletedCount > 0) {
      console.log(`🧹 Cleaned up ${deletedCount} expired pin(s)`);
    }
    
    return deletedCount;
  } catch (error) {
    // Silently handle errors - column might not exist yet
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('expires_at') || errorMsg.includes('does not exist')) {
      return 0; // Column doesn't exist, that's okay
    }
    console.error('Error cleaning up expired pins:', error);
    return 0;
  }
}

/**
 * Start periodic cleanup of expired pins
 * @param db Database instance
 * @param intervalMs Cleanup interval in milliseconds (default: 5 minutes)
 * @returns Cleanup interval ID (can be used with clearInterval)
 */
export function startExpiredPinsCleanup(
  db: PGliteWithSync,
  intervalMs: number = 5 * 60 * 1000
): number {
  // Run cleanup immediately
  cleanupExpiredPins(db);
  
  // Then run periodically
  return setInterval(() => {
    cleanupExpiredPins(db);
  }, intervalMs);
}

