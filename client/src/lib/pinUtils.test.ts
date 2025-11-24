import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getPinColor, getPinEmoji, getTimeAgo } from './pinUtils';
import type { PinRow } from './models';

describe('pinUtils', () => {
  describe('getPinColor', () => {
    it('should return correct color for medical pin', () => {
      const pin: PinRow = {
        id: 'pin-1',
        map_id: 'map-1',
        lat: 40.7128,
        lng: -74.0060,
        tags: JSON.stringify(['medical']),
        description: null,
        photo_urls: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(getPinColor(pin)).toBe('#e74c3c');
    });

    it('should return correct color for water pin', () => {
      const pin: PinRow = {
        id: 'pin-1',
        map_id: 'map-1',
        lat: 40.7128,
        lng: -74.0060,
        tags: JSON.stringify(['water']),
        description: null,
        photo_urls: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(getPinColor(pin)).toBe('#3498db');
    });

    it('should return default color for unknown type', () => {
      const pin: PinRow = {
        id: 'pin-1',
        map_id: 'map-1',
        lat: 40.7128,
        lng: -74.0060,
        tags: JSON.stringify(['unknown']),
        description: null,
        photo_urls: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(getPinColor(pin)).toBe('#95a5a6');
    });

    it('should return default color for invalid JSON', () => {
      const pin: PinRow = {
        id: 'pin-1',
        map_id: 'map-1',
        lat: 40.7128,
        lng: -74.0060,
        tags: 'invalid json',
        description: null,
        photo_urls: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(getPinColor(pin)).toBe('#95a5a6');
    });

    it('should return default color for null tags', () => {
      const pin: PinRow = {
        id: 'pin-1',
        map_id: 'map-1',
        lat: 40.7128,
        lng: -74.0060,
        tags: null,
        description: null,
        photo_urls: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(getPinColor(pin)).toBe('#95a5a6');
    });
  });

  describe('getPinEmoji', () => {
    it('should return correct emoji for medical pin', () => {
      const pin: PinRow = {
        id: 'pin-1',
        map_id: 'map-1',
        lat: 40.7128,
        lng: -74.0060,
        tags: JSON.stringify(['medical']),
        description: null,
        photo_urls: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(getPinEmoji(pin)).toBe('🏥');
    });

    it('should return correct emoji for all pin types', () => {
      const types = [
        { type: 'water', emoji: '💧' },
        { type: 'checkpoint', emoji: '🚧' },
        { type: 'shelter', emoji: '🏠' },
        { type: 'food', emoji: '🍽️' },
        { type: 'danger', emoji: '⚠️' },
        { type: 'other', emoji: '📍' },
      ];

      types.forEach(({ type, emoji }) => {
        const pin: PinRow = {
          id: 'pin-1',
          map_id: 'map-1',
          lat: 40.7128,
          lng: -74.0060,
          tags: JSON.stringify([type]),
          description: null,
          photo_urls: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        };

        expect(getPinEmoji(pin)).toBe(emoji);
      });
    });

    it('should return default emoji for invalid tags', () => {
      const pin: PinRow = {
        id: 'pin-1',
        map_id: 'map-1',
        lat: 40.7128,
        lng: -74.0060,
        tags: 'invalid',
        description: null,
        photo_urls: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      expect(getPinEmoji(pin)).toBe('📍');
    });
  });

  describe('getTimeAgo', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-01-01T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Just now" for very recent dates', () => {
      const date = new Date('2024-01-01T11:59:30Z');
      expect(getTimeAgo(date)).toBe('Just now');
    });

    it('should return minutes ago for recent dates', () => {
      const date = new Date('2024-01-01T11:45:00Z');
      expect(getTimeAgo(date)).toBe('15m ago');
    });

    it('should return hours ago for dates within 24 hours', () => {
      const date = new Date('2024-01-01T10:00:00Z');
      expect(getTimeAgo(date)).toBe('2h ago');
    });

    it('should return days ago for dates within a week', () => {
      const date = new Date('2023-12-30T12:00:00Z');
      expect(getTimeAgo(date)).toBe('2d ago');
    });

    it('should return formatted date for older dates', () => {
      const date = new Date('2023-12-20T12:00:00Z');
      const result = getTimeAgo(date);
      expect(result).toMatch(/\d+\/\d+\/\d+/); // Date format
    });
  });
});

