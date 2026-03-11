import { describe, it, expect } from 'vitest';
import { EXPIRATION_OPTIONS, computeExpiresAt } from './pinExpiration';

describe('Pin Expiration', () => {
  describe('EXPIRATION_OPTIONS', () => {
    it('should include a "default" option that defers to pin type TTL', () => {
      const defaultOpt = EXPIRATION_OPTIONS.find(o => o.value === 'default');
      expect(defaultOpt).toBeDefined();
      expect(defaultOpt!.hours).toBeNull();
    });

    it('should include a "never" option with no expiry', () => {
      const neverOpt = EXPIRATION_OPTIONS.find(o => o.value === 'never');
      expect(neverOpt).toBeDefined();
      expect(neverOpt!.hours).toBeNull();
    });

    it('should include timed options', () => {
      const timed = EXPIRATION_OPTIONS.filter(o => o.hours !== null);
      expect(timed.length).toBeGreaterThanOrEqual(4);
      // Should be sorted ascending
      for (let i = 1; i < timed.length; i++) {
        expect(timed[i].hours!).toBeGreaterThan(timed[i - 1].hours!);
      }
    });
  });

  describe('computeExpiresAt', () => {
    it('should return type-based TTL when selection is "default"', () => {
      const result = computeExpiresAt('default', 'checkpoint'); // checkpoint = 2h
      expect(result).not.toBeNull();
      const diff = new Date(result!).getTime() - Date.now();
      // Should be roughly 2 hours (within 5 seconds tolerance)
      expect(diff).toBeGreaterThan(2 * 60 * 60 * 1000 - 5000);
      expect(diff).toBeLessThan(2 * 60 * 60 * 1000 + 5000);
    });

    it('should return null when selection is "default" and type has no TTL (water)', () => {
      const result = computeExpiresAt('default', 'water');
      expect(result).toBeNull();
    });

    it('should return null when selection is "never"', () => {
      const result = computeExpiresAt('never', 'checkpoint');
      expect(result).toBeNull();
    });

    it('should return a timestamp for a specific hour selection', () => {
      const result = computeExpiresAt('1h', 'water');
      expect(result).not.toBeNull();
      const diff = new Date(result!).getTime() - Date.now();
      expect(diff).toBeGreaterThan(1 * 60 * 60 * 1000 - 5000);
      expect(diff).toBeLessThan(1 * 60 * 60 * 1000 + 5000);
    });

    it('should return correct timestamp for 24h selection', () => {
      const result = computeExpiresAt('24h', 'other');
      expect(result).not.toBeNull();
      const diff = new Date(result!).getTime() - Date.now();
      expect(diff).toBeGreaterThan(24 * 60 * 60 * 1000 - 5000);
      expect(diff).toBeLessThan(24 * 60 * 60 * 1000 + 5000);
    });

    it('should return correct timestamp for 7d selection', () => {
      const result = computeExpiresAt('7d', 'medical');
      expect(result).not.toBeNull();
      const diff = new Date(result!).getTime() - Date.now();
      expect(diff).toBeGreaterThan(7 * 24 * 60 * 60 * 1000 - 5000);
      expect(diff).toBeLessThan(7 * 24 * 60 * 60 * 1000 + 5000);
    });

    it('should override type TTL when user picks a specific time', () => {
      // Checkpoint default is 2h, but user picks 24h
      const result = computeExpiresAt('24h', 'checkpoint');
      expect(result).not.toBeNull();
      const diff = new Date(result!).getTime() - Date.now();
      expect(diff).toBeGreaterThan(24 * 60 * 60 * 1000 - 5000);
    });
  });
});
