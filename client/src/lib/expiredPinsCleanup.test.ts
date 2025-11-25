import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { cleanupExpiredPins, startExpiredPinsCleanup } from './expiredPinsCleanup';
import type { PGliteWithSync } from '@electric-sql/pglite-sync';

describe('Expired Pins Cleanup', () => {
  let mockDb: PGliteWithSync;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockDb = {
      query: vi.fn(),
      exec: vi.fn(),
    } as any;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('cleanupExpiredPins', () => {
    it('should delete expired pins', async () => {
      // First check if column exists (returns successfully)
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [{ expires_at: null }],
      });

      // Then delete expired pins
      (mockDb.query as any).mockResolvedValueOnce({
        rowCount: 2,
      });

      const deleted = await cleanupExpiredPins(mockDb);

      expect(deleted).toBe(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM pins WHERE expires_at IS NOT NULL AND expires_at <='),
        [expect.any(String)]
      );
    });

    it('should return 0 if no expired pins', async () => {
      (mockDb.query as any).mockResolvedValueOnce({
        rowCount: 0,
      });

      const deleted = await cleanupExpiredPins(mockDb);

      expect(deleted).toBe(0);
    });

    it('should handle missing expires_at column gracefully', async () => {
      // Simulate column doesn't exist
      (mockDb.query as any).mockRejectedValueOnce(
        new Error('column "expires_at" does not exist')
      );

      const deleted = await cleanupExpiredPins(mockDb);

      expect(deleted).toBe(0);
      // Should not throw error
    });

    it('should handle database errors gracefully', async () => {
      (mockDb.query as any).mockRejectedValueOnce(
        new Error('Database connection failed')
      );

      const deleted = await cleanupExpiredPins(mockDb);

      expect(deleted).toBe(0);
    });

    it('should log when pins are deleted', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // First check if column exists (returns successfully)
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [{ expires_at: null }],
      });

      // Then delete expired pins
      (mockDb.query as any).mockResolvedValueOnce({
        rowCount: 3,
      });

      await cleanupExpiredPins(mockDb);

      expect(consoleSpy).toHaveBeenCalledWith('🧹 Cleaned up 3 expired pin(s)');
      
      consoleSpy.mockRestore();
    });
  });

  describe('startExpiredPinsCleanup', () => {
    it('should run cleanup immediately', async () => {
      let callCount = 0;
      // Mock column check + delete pattern
      (mockDb.query as any).mockImplementation(async (query: string) => {
        callCount++;
        // First call is column check
        if (callCount === 1) {
          return { rows: [{ expires_at: null }] };
        }
        // Second call is delete
        return { rowCount: 0 };
      });

      const intervalId = startExpiredPinsCleanup(mockDb, 5000);
      
      // Wait for immediate cleanup to complete (but don't run all timers to avoid interval loop)
      await vi.advanceTimersByTimeAsync(10);

      // Should have run immediately (column check + delete)
      expect(mockDb.query).toHaveBeenCalledTimes(2);
      
      clearInterval(intervalId);
    });

    it('should run cleanup periodically', async () => {
      let callCount = 0;
      // Mock column check + delete pattern (alternating)
      (mockDb.query as any).mockImplementation(async (query: string) => {
        callCount++;
        // Odd calls are column checks, even calls are deletes
        if (callCount % 2 === 1) {
          return { rows: [{ expires_at: null }] };
        }
        return { rowCount: 0 };
      });

      const intervalId = startExpiredPinsCleanup(mockDb, 1000);

      // Initial call (column check + delete = 2 calls)
      await vi.advanceTimersByTimeAsync(10);
      expect(mockDb.query).toHaveBeenCalledTimes(2);

      // Advance timer by 1 second (another column check + delete = 2 more calls)
      await vi.advanceTimersByTimeAsync(1000);
      expect(mockDb.query).toHaveBeenCalledTimes(4);

      clearInterval(intervalId);
    });

    it('should use default interval of 5 minutes', async () => {
      let callCount = 0;
      // Mock column check + delete pattern (alternating)
      (mockDb.query as any).mockImplementation(async (query: string) => {
        callCount++;
        // Odd calls are column checks, even calls are deletes
        if (callCount % 2 === 1) {
          return { rows: [{ expires_at: null }] };
        }
        return { rowCount: 0 };
      });

      const intervalId = startExpiredPinsCleanup(mockDb);

      // Initial call (column check + delete = 2 calls)
      await vi.advanceTimersByTimeAsync(10);
      expect(mockDb.query).toHaveBeenCalledTimes(2);

      // Advance 5 minutes (another column check + delete = 2 more calls)
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
      expect(mockDb.query).toHaveBeenCalledTimes(4);

      clearInterval(intervalId);
    });
  });
});

