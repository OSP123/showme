import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTileCoords, estimateTileCount, prefetchTiles, getOfflineCacheStats } from './tileCache';

describe('tileCache', () => {
  describe('getTileCoords', () => {
    it('should return correct tile coordinates for a known point at zoom 0', () => {
      // At zoom 0, the entire world is one tile (0,0)
      const tiles = getTileCoords(
        { north: 85, south: -85, east: 180, west: -180 },
        0
      );
      expect(tiles).toEqual([{ z: 0, x: 0, y: 0 }]);
    });

    it('should return correct tile coordinates for zoom 1', () => {
      // At zoom 1, world is 2x2 = 4 tiles
      const tiles = getTileCoords(
        { north: 85, south: -85, east: 180, west: -180 },
        1
      );
      expect(tiles).toHaveLength(4);
      expect(tiles).toContainEqual({ z: 1, x: 0, y: 0 });
      expect(tiles).toContainEqual({ z: 1, x: 1, y: 0 });
      expect(tiles).toContainEqual({ z: 1, x: 0, y: 1 });
      expect(tiles).toContainEqual({ z: 1, x: 1, y: 1 });
    });

    it('should return tiles for a small bounding box', () => {
      // Small area around NYC (~40.7, -74.0) at zoom 10
      const tiles = getTileCoords(
        { north: 40.8, south: 40.7, east: -73.9, west: -74.1 },
        10
      );
      // Should be a small number of tiles (not the whole world)
      expect(tiles.length).toBeGreaterThan(0);
      expect(tiles.length).toBeLessThan(20);
      // All tiles should be at zoom 10
      tiles.forEach(t => expect(t.z).toBe(10));
    });

    it('should handle bounds crossing the antimeridian', () => {
      // Bounds that cross 180° longitude
      const tiles = getTileCoords(
        { north: 50, south: 40, east: -170, west: 170 },
        2
      );
      expect(tiles.length).toBeGreaterThan(0);
    });

    it('should clamp latitude to valid Mercator range', () => {
      // Extreme latitudes beyond Mercator range
      const tiles = getTileCoords(
        { north: 90, south: -90, east: 180, west: -180 },
        0
      );
      expect(tiles).toEqual([{ z: 0, x: 0, y: 0 }]);
    });
  });

  describe('estimateTileCount', () => {
    it('should return correct count for single zoom level', () => {
      const bounds = { north: 85, south: -85, east: 180, west: -180 };
      const count = estimateTileCount(bounds, 0, 0);
      expect(count).toBe(1); // zoom 0 = 1 tile
    });

    it('should return sum across zoom range', () => {
      const bounds = { north: 85, south: -85, east: 180, west: -180 };
      const count = estimateTileCount(bounds, 0, 1);
      // zoom 0: 1 tile, zoom 1: 4 tiles = 5 total
      expect(count).toBe(5);
    });

    it('should return 0 for invalid zoom range', () => {
      const bounds = { north: 40.8, south: 40.7, east: -73.9, west: -74.1 };
      const count = estimateTileCount(bounds, 5, 3); // min > max
      expect(count).toBe(0);
    });

    it('should increase exponentially with zoom', () => {
      const bounds = { north: 40.8, south: 40.7, east: -73.9, west: -74.1 };
      const countLow = estimateTileCount(bounds, 10, 10);
      const countHigh = estimateTileCount(bounds, 14, 14);
      expect(countHigh).toBeGreaterThan(countLow);
    });
  });

  describe('prefetchTiles', () => {
    let mockCache: {
      match: ReturnType<typeof vi.fn>;
      put: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      mockCache = {
        match: vi.fn().mockResolvedValue(undefined), // not cached
        put: vi.fn().mockResolvedValue(undefined),
      };
      vi.stubGlobal('caches', {
        open: vi.fn().mockResolvedValue(mockCache),
      });
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
        new Response('tile-data', { status: 200 })
      ));
    });

    it('should fetch all tiles in bounds and zoom range', async () => {
      const bounds = { north: 85, south: -85, east: 180, west: -180 };
      const result = await prefetchTiles(bounds, 0, 0);

      expect(result.total).toBe(1);
      expect(result.cached).toBe(1);
      expect(result.failed).toBe(0);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(mockCache.put).toHaveBeenCalledTimes(1);
    });

    it('should skip already-cached tiles', async () => {
      mockCache.match.mockResolvedValue(new Response('already-cached'));
      const bounds = { north: 85, south: -85, east: 180, west: -180 };
      const result = await prefetchTiles(bounds, 0, 0);

      expect(result.total).toBe(1);
      expect(result.cached).toBe(1);
      expect(result.failed).toBe(0);
      // Should not have fetched since it was already cached
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should call onProgress callback', async () => {
      const onProgress = vi.fn();
      const bounds = { north: 85, south: -85, east: 180, west: -180 };
      await prefetchTiles(bounds, 0, 1, onProgress);

      // 5 tiles total (1 at z0 + 4 at z1)
      expect(onProgress).toHaveBeenCalled();
      // Last call should have fetched === total
      const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1];
      expect(lastCall[0]).toBe(5); // fetched
      expect(lastCall[1]).toBe(5); // total
    });

    it('should handle fetch failures gracefully', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));
      const bounds = { north: 85, south: -85, east: 180, west: -180 };
      const result = await prefetchTiles(bounds, 0, 0);

      expect(result.total).toBe(1);
      expect(result.cached).toBe(0);
      expect(result.failed).toBe(1);
    });

    it('should support abort via AbortController', async () => {
      const controller = new AbortController();
      // Abort immediately
      controller.abort();

      const bounds = { north: 85, south: -85, east: 180, west: -180 };
      const result = await prefetchTiles(bounds, 0, 1, undefined, controller.signal);

      // Should have stopped early
      expect(result.cached).toBeLessThanOrEqual(result.total);
    });

    it('should use correct tile URL format', async () => {
      const bounds = { north: 85, south: -85, east: 180, west: -180 };
      await prefetchTiles(bounds, 0, 0);

      const fetchedUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      // Should be an OSM tile URL
      expect(fetchedUrl).toMatch(/^https:\/\/[abc]\.tile\.openstreetmap\.org\/0\/0\/0\.png$/);
    });
  });

  describe('getOfflineCacheStats', () => {
    beforeEach(() => {
      const mockCache = {
        keys: vi.fn().mockResolvedValue([
          new Request('https://a.tile.openstreetmap.org/10/300/400.png'),
          new Request('https://b.tile.openstreetmap.org/10/301/400.png'),
        ]),
      };
      vi.stubGlobal('caches', {
        open: vi.fn().mockResolvedValue(mockCache),
      });
    });

    it('should return tile count', async () => {
      const stats = await getOfflineCacheStats();
      expect(stats.tileCount).toBe(2);
    });

    it('should estimate storage size', async () => {
      const stats = await getOfflineCacheStats();
      // Each tile is ~15KB on average
      expect(stats.estimatedSizeMB).toBeGreaterThan(0);
    });
  });
});
