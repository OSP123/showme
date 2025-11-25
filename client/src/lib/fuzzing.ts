// src/lib/fuzzing.ts
// Coordinate fuzzing utilities for privacy/security

/**
 * Fuzzes coordinates by adding random offset within specified radius
 * @param lat Original latitude
 * @param lng Original longitude
 * @param radiusMeters Radius in meters to fuzz within
 * @returns Fuzzed coordinates { lat, lng }
 */
export function fuzzCoordinates(
  lat: number,
  lng: number,
  radiusMeters: number = 100
): { lat: number; lng: number } {
  // Convert meters to degrees (approximate)
  // 1 degree latitude ≈ 111,000 meters
  // 1 degree longitude ≈ 111,000 * cos(latitude) meters
  const latOffset = radiusMeters / 111000;
  const lngOffset = radiusMeters / (111000 * Math.cos((lat * Math.PI) / 180));

  // Generate random offset within radius (uniform distribution in circle)
  const angle = Math.random() * 2 * Math.PI;
  const distance = Math.random() * radiusMeters;
  
  // Convert distance to lat/lng offsets
  const latFuzz = (distance / 111000) * Math.cos(angle);
  const lngFuzz = (distance / (111000 * Math.cos((lat * Math.PI) / 180))) * Math.sin(angle);

  return {
    lat: lat + latFuzz,
    lng: lng + lngFuzz,
  };
}

/**
 * Grid-based fuzzing: snaps coordinates to nearest grid point
 * @param lat Original latitude
 * @param lng Original longitude
 * @param gridSizeMeters Grid cell size in meters
 * @returns Fuzzed coordinates snapped to grid
 */
export function fuzzToGrid(
  lat: number,
  lng: number,
  gridSizeMeters: number = 50
): { lat: number; lng: number } {
  // Convert grid size to degrees
  const latGrid = gridSizeMeters / 111000;
  const lngGrid = gridSizeMeters / (111000 * Math.cos((lat * Math.PI) / 180));

  // Snap to grid
  return {
    lat: Math.round(lat / latGrid) * latGrid,
    lng: Math.round(lng / lngGrid) * lngGrid,
  };
}

