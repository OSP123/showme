import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMap, addPin, getPins } from './api';
import type { PGliteWithSync } from '@electric-sql/pglite-sync';
import type { PinData } from './models';

// Mock the operation queue
vi.mock('./operationQueue', () => ({
  operationQueue: {
    enqueue: vi.fn().mockResolvedValue('test-operation-id'),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('API Functions', () => {
  let mockDb: PGliteWithSync;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create a mock database
    mockDb = {
      query: vi.fn(),
      exec: vi.fn(),
    } as any;

    // Mock successful fetch responses
    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    });
  });

  describe('createMap', () => {
    it('should create a map with correct data', async () => {
      const result = await createMap(mockDb, 'Test Map', false);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBeNull();

      // Verify database insert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO maps'),
        expect.arrayContaining([
          result.id,
          'Test Map',
          'false',
          null,
          expect.any(String),
        ])
      );

      // Verify PostgREST call
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3015/maps',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should create a private map with access token', async () => {
      const result = await createMap(mockDb, 'Private Map', true);

      expect(result.access_token).toBeTruthy();
      expect(typeof result.access_token).toBe('string');
    });

    it('should queue operation if PostgREST fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Error',
      });

      const { operationQueue } = await import('./operationQueue');
      
      const result = await createMap(mockDb, 'Test Map', false);

      expect(result).toHaveProperty('id');
      expect(operationQueue.enqueue).toHaveBeenCalledWith(
        'createMap',
        expect.objectContaining({
          name: 'Test Map',
        })
      );
    });
  });

  describe('addPin', () => {
    const pinData: PinData = {
      map_id: 'test-map-id',
      lat: 40.7128,
      lng: -74.0060,
      type: 'medical',
      tags: ['urgent', 'hospital'],
      description: 'Test pin',
      photo_urls: ['photo1.jpg'],
    };

    it('should add a pin with correct data', async () => {
      const result = await addPin(mockDb, pinData);

      expect(result).toHaveProperty('id');

      // Verify database insert
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pins'),
        expect.arrayContaining([
          result.id,
          pinData.map_id,
          pinData.lat,
          pinData.lng,
          expect.stringContaining('medical'),
          pinData.description,
          expect.any(String),
          expect.any(String),
          expect.any(String),
        ])
      );
    });

    it('should include type in tags array', async () => {
      await addPin(mockDb, pinData);

      const insertCall = (mockDb.query as any).mock.calls.find((call: any[]) =>
        call[0].includes('INSERT INTO pins')
      );

      const tagsJson = insertCall[1][4]; // tags is 5th parameter (index 4)
      const tags = JSON.parse(tagsJson);

      expect(tags).toContain('medical');
      expect(tags).toContain('urgent');
      expect(tags).toContain('hospital');
    });

    it('should handle pins without optional fields', async () => {
      const minimalPin: PinData = {
        map_id: 'test-map-id',
        lat: 40.7128,
        lng: -74.0060,
      };

      const result = await addPin(mockDb, minimalPin);

      expect(result).toHaveProperty('id');

      const insertCall = (mockDb.query as any).mock.calls.find((call: any[]) =>
        call[0].includes('INSERT INTO pins')
      );

      expect(insertCall[1][5]).toBeNull(); // description
      expect(insertCall[1][6]).toBe('[]'); // photo_urls
    });

    it('should queue operation if PostgREST fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Error',
      });

      const { operationQueue } = await import('./operationQueue');
      
      const result = await addPin(mockDb, pinData);

      expect(result).toHaveProperty('id');
      expect(operationQueue.enqueue).toHaveBeenCalledWith(
        'addPin',
        expect.objectContaining({
          map_id: pinData.map_id,
          lat: pinData.lat,
          lng: pinData.lng,
        })
      );
    });
  });

  describe('getPins', () => {
    it('should retrieve pins for a map', async () => {
      const mockPins = [
        {
          id: 'pin-1',
          map_id: 'test-map-id',
          lat: 40.7128,
          lng: -74.0060,
          tags: '["medical"]',
          description: 'Test pin',
          photo_urls: '[]',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      (mockDb.query as any).mockResolvedValueOnce({
        rows: mockPins,
      });

      const pins = await getPins(mockDb, 'test-map-id');

      expect(pins).toHaveLength(1);
      expect(pins[0]).toMatchObject({
        id: 'pin-1',
        map_id: 'test-map-id',
        lat: 40.7128,
        lng: -74.0060,
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM pins'),
        ['test-map-id']
      );
    });

    it('should return empty array if no pins found', async () => {
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [],
      });

      const pins = await getPins(mockDb, 'non-existent-map');

      expect(pins).toHaveLength(0);
    });
  });
});

