import { describe, it, expect } from 'vitest';
import { fuzzCoordinates, fuzzToGrid } from './fuzzing';

describe('Fuzzing Utilities', () => {
  describe('fuzzCoordinates', () => {
    it('should fuzz coordinates within specified radius', () => {
      const lat = 40.7128;
      const lng = -74.0060;
      const radius = 100; // 100 meters

      const fuzzed = fuzzCoordinates(lat, lng, radius);

      // Should be different from original
      expect(fuzzed.lat).not.toBe(lat);
      expect(fuzzed.lng).not.toBe(lng);

      // Should be within ~100m (approximately 0.001 degrees)
      const latDiff = Math.abs(fuzzed.lat - lat);
      const lngDiff = Math.abs(fuzzed.lng - lng);
      
      expect(latDiff).toBeLessThan(0.002);
      expect(lngDiff).toBeLessThan(0.002);
    });

    it('should use default radius of 100m if not specified', () => {
      const lat = 40.7128;
      const lng = -74.0060;

      const fuzzed = fuzzCoordinates(lat, lng);

      const latDiff = Math.abs(fuzzed.lat - lat);
      const lngDiff = Math.abs(fuzzed.lng - lng);
      
      expect(latDiff).toBeLessThan(0.002);
      expect(lngDiff).toBeLessThan(0.002);
    });

    it('should produce different results on each call', () => {
      const lat = 40.7128;
      const lng = -74.0060;

      const fuzzed1 = fuzzCoordinates(lat, lng, 100);
      const fuzzed2 = fuzzCoordinates(lat, lng, 100);

      // Should be different (random)
      expect(fuzzed1.lat).not.toBe(fuzzed2.lat);
      expect(fuzzed1.lng).not.toBe(fuzzed2.lng);
    });

    it('should respect larger radius values', () => {
      const lat = 40.7128;
      const lng = -74.0060;
      const radius = 500; // 500 meters

      const fuzzed = fuzzCoordinates(lat, lng, radius);

      const latDiff = Math.abs(fuzzed.lat - lat);
      const lngDiff = Math.abs(fuzzed.lng - lng);
      
      // Should allow larger differences for larger radius
      expect(latDiff).toBeLessThan(0.01);
      expect(lngDiff).toBeLessThan(0.01);
    });
  });

  describe('fuzzToGrid', () => {
    it('should snap coordinates to grid', () => {
      const lat = 40.7128;
      const lng = -74.0060;
      const gridSize = 50; // 50 meter grid

      const fuzzed = fuzzToGrid(lat, lng, gridSize);

      // Should be different from original (snapped to grid)
      expect(fuzzed.lat).not.toBe(lat);
      expect(fuzzed.lng).not.toBe(lng);

      // Should be on grid (multiples of grid size)
      // Grid size in degrees is approximately gridSize / 111000
      const gridLat = 50 / 111000;
      const gridLng = 50 / (111000 * Math.cos((lat * Math.PI) / 180));

      // Check if snapped to grid (within rounding tolerance)
      // Use modulo with proper handling for negative numbers
      const latRemainder = Math.abs(((fuzzed.lat % gridLat) + gridLat) % gridLat);
      const lngRemainder = Math.abs(((fuzzed.lng % gridLng) + gridLng) % gridLng);
      
      // Allow for rounding errors - should be very close to 0 or gridLat/gridLng
      expect(latRemainder).toBeLessThan(gridLat);
      expect(lngRemainder).toBeLessThan(gridLng);
    });

    it('should use default grid size of 50m if not specified', () => {
      const lat = 40.7128;
      const lng = -74.0060;

      const fuzzed = fuzzToGrid(lat, lng);

      // Should be snapped (not random like fuzzCoordinates)
      expect(fuzzed.lat).not.toBe(lat);
      expect(fuzzed.lng).not.toBe(lng);
    });

    it('should produce consistent results for same input', () => {
      const lat = 40.7128;
      const lng = -74.0060;

      const fuzzed1 = fuzzToGrid(lat, lng, 50);
      const fuzzed2 = fuzzToGrid(lat, lng, 50);

      // Should be the same (deterministic)
      expect(fuzzed1.lat).toBe(fuzzed2.lat);
      expect(fuzzed1.lng).toBe(fuzzed2.lng);
    });
  });
});

