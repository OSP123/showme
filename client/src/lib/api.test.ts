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
          false,  // is_private is now boolean, not string
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
      // Mock map query (for fuzzing check)
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [{ fuzzing_enabled: 'false' }],
      });

      const result = await addPin(mockDb, pinData);

      expect(result).toHaveProperty('id');

      // Verify database insert (now includes type and expires_at)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO pins'),
        expect.arrayContaining([
          result.id,
          pinData.map_id,
          pinData.lat,
          pinData.lng,
          pinData.type, // type column
          expect.stringContaining('medical'), // tags
          pinData.description,
          expect.any(String), // photo_urls
          expect.any(String), // expires_at
          expect.any(String), // created_at
          expect.any(String), // updated_at
        ])
      );
    });

    it('should include type in tags array', async () => {
      // Mock map query (for fuzzing check)
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [{ fuzzing_enabled: 'false' }],
      });

      await addPin(mockDb, pinData);

      const insertCall = (mockDb.query as any).mock.calls.find((call: any[]) =>
        call[0].includes('INSERT INTO pins')
      );

      // tags is now 6th parameter (index 5) and is a native array, not JSON
      const tags = insertCall[1][5];

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

      // Mock map query (for fuzzing check)
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [{ fuzzing_enabled: 'false' }],
      });

      const result = await addPin(mockDb, minimalPin);

      expect(result).toHaveProperty('id');

      const insertCall = (mockDb.query as any).mock.calls.find((call: any[]) =>
        call[0].includes('INSERT INTO pins')
      );

      // Parameters shifted: id, map_id, lat, lng, type, tags, description, photo_urls, expires_at, created_at, updated_at
      expect(insertCall[1][6]).toBeNull(); // description (index 6)
      expect(insertCall[1][7]).toEqual([]); // photo_urls (index 7) - now an array
      expect(insertCall[1][5]).toEqual([]); // tags (index 5) - now an array
      expect(insertCall[1][4]).toBeNull(); // type (index 4)
      expect(insertCall[1][8]).toBeNull(); // expires_at (index 8)
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

      // Mock the query with expiration filter (getPins now filters by expires_at by default)
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

      // getPins now filters by expires_at by default
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('expires_at IS NULL OR expires_at >'),
        expect.arrayContaining(['test-map-id', expect.any(String)])
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

  describe('updatePin', () => {
    it('should update a pin with new data', async () => {
      const { updatePin } = await import('./api');

      const updates = {
        description: 'Updated description',
        tags: ['danger', 'urgent'],
        type: 'danger' as const
      };

      await updatePin(mockDb, 'test-pin-id', updates);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pins SET'),
        expect.arrayContaining([
          expect.any(String), // updated_at
          'Updated description',
          ['danger', 'urgent'],
          'danger',
          'test-pin-id'
        ])
      );
    });

    it('should update only provided fields', async () => {
      const { updatePin } = await import('./api');

      const updates = {
        description: 'New description only'
      };

      await updatePin(mockDb, 'test-pin-id', updates);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('description = $'),
        expect.arrayContaining([
          expect.any(String), // updated_at
          'New description only',
          'test-pin-id'
        ])
      );
    });

    it('should handle photo URL updates', async () => {
      const { updatePin } = await import('./api');

      const updates = {
        photo_urls: ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg']
      };

      await updatePin(mockDb, 'test-pin-id', updates);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('photo_urls = $'),
        expect.arrayContaining([
          expect.any(String), // updated_at
          ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'],
          'test-pin-id'
        ])
      );
    });

    it('should update multiple fields at once', async () => {
      const { updatePin } = await import('./api');

      const updates = {
        description: 'Multi-field update',
        tags: ['medical', 'priority'],
        type: 'medical' as const,
        photo_urls: ['https://example.com/photo.jpg']
      };

      await updatePin(mockDb, 'test-pin-id', updates);

      const queryCall = (mockDb.query as any).mock.calls[0];
      const query = queryCall[0];

      expect(query).toContain('UPDATE pins SET');
      expect(query).toContain('updated_at = $');
      expect(query).toContain('description = $');
      expect(query).toContain('tags = $');
      expect(query).toContain('photo_urls = $');
      expect(query).toContain('type = $');
      expect(query).toContain('WHERE id = $');
    });

    it('should add type to tags if not present', async () => {
      const { updatePin } = await import('./api');

      const updates = {
        type: 'danger' as const,
        tags: ['urgent']
      };

      await updatePin(mockDb, 'test-pin-id', updates);

      const queryCall = (mockDb.query as any).mock.calls[0];
      const params = queryCall[1];

      // Find tags in params
      const tagsIndex = params.findIndex((p: any) => Array.isArray(p) && p.includes('danger'));
      expect(params[tagsIndex]).toEqual(['danger', 'urgent']);
    });
  });
});
