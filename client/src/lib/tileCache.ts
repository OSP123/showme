// Tile caching utilities for offline map viewing
// Uses the Cache API to store OSM tiles in the same cache as the Service Worker

const TILE_CACHE_NAME = 'map-tiles';
const TILE_SERVERS = ['a', 'b', 'c'];
const AVG_TILE_SIZE_KB = 15;
const MAX_CONCURRENT_FETCHES = 6;

export interface TileBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface TileCoord {
  z: number;
  x: number;
  y: number;
}

export interface PrefetchResult {
  total: number;
  cached: number;
  failed: number;
}

// Convert lat/lng to tile coordinates using Web Mercator projection
function lngToTileX(lng: number, zoom: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
}

function latToTileY(lat: number, zoom: number): number {
  // Clamp latitude to valid Mercator range
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const latRad = (clampedLat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
}

function getTileUrl(z: number, x: number, y: number): string {
  const server = TILE_SERVERS[(x + y) % TILE_SERVERS.length];
  return `https://${server}.tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

// Get all tile coordinates for a bounding box at a given zoom level
export function getTileCoords(bounds: TileBounds, zoom: number): TileCoord[] {
  const maxTile = Math.pow(2, zoom) - 1;

  const xMin = Math.max(0, lngToTileX(bounds.west, zoom));
  const xMax = Math.min(maxTile, lngToTileX(bounds.east, zoom));
  const yMin = Math.max(0, latToTileY(bounds.north, zoom)); // north = smaller y
  const yMax = Math.min(maxTile, latToTileY(bounds.south, zoom));

  const tiles: TileCoord[] = [];

  if (xMin <= xMax) {
    // Normal case (no antimeridian crossing)
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        tiles.push({ z: zoom, x, y });
      }
    }
  } else {
    // Antimeridian crossing: wrap around
    for (let x = xMin; x <= maxTile; x++) {
      for (let y = yMin; y <= yMax; y++) {
        tiles.push({ z: zoom, x, y });
      }
    }
    for (let x = 0; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        tiles.push({ z: zoom, x, y });
      }
    }
  }

  return tiles;
}

// Estimate total tile count for a bounds across a zoom range
export function estimateTileCount(
  bounds: TileBounds,
  minZoom: number,
  maxZoom: number
): number {
  if (minZoom > maxZoom) return 0;
  let total = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    total += getTileCoords(bounds, z).length;
  }
  return total;
}

// Prefetch tiles for a bounding box across zoom levels
export async function prefetchTiles(
  bounds: TileBounds,
  minZoom: number,
  maxZoom: number,
  onProgress?: (fetched: number, total: number) => void,
  signal?: AbortSignal
): Promise<PrefetchResult> {
  // Collect all tile coordinates
  const allTiles: TileCoord[] = [];
  for (let z = minZoom; z <= maxZoom; z++) {
    allTiles.push(...getTileCoords(bounds, z));
  }

  const total = allTiles.length;
  let cached = 0;
  let failed = 0;

  const cache = await caches.open(TILE_CACHE_NAME);

  // Process tiles in batches for controlled concurrency
  for (let i = 0; i < allTiles.length; i += MAX_CONCURRENT_FETCHES) {
    if (signal?.aborted) break;

    const batch = allTiles.slice(i, i + MAX_CONCURRENT_FETCHES);
    const results = await Promise.allSettled(
      batch.map(async (tile) => {
        if (signal?.aborted) return 'aborted';

        const url = getTileUrl(tile.z, tile.x, tile.y);

        // Check if already cached
        const existing = await cache.match(url);
        if (existing) {
          return 'already-cached';
        }

        // Fetch and cache
        const response = await fetch(url);
        if (response.ok) {
          await cache.put(url, response.clone());
          return 'fetched';
        }
        throw new Error(`HTTP ${response.status}`);
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value !== 'aborted') {
        cached++;
      } else if (result.status === 'rejected') {
        failed++;
      }
    }

    onProgress?.(cached + failed, total);
  }

  return { total, cached, failed };
}

// Get cache statistics
export async function getOfflineCacheStats(): Promise<{
  tileCount: number;
  estimatedSizeMB: number;
}> {
  try {
    const cache = await caches.open(TILE_CACHE_NAME);
    const keys = await cache.keys();
    const tileCount = keys.length;
    const estimatedSizeMB = (tileCount * AVG_TILE_SIZE_KB) / 1024;
    return { tileCount, estimatedSizeMB };
  } catch {
    return { tileCount: 0, estimatedSizeMB: 0 };
  }
}
