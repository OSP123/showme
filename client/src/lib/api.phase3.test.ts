import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addPin, getPins } from './api';
import type { PGliteWithSync } from '@electric-sql/pglite-sync';
import type { PinData } from './models';
import { PIN_TTL_HOURS } from './models';

// Mock the operation queue
vi.mock('./operationQueue', () => ({
  operationQueue: {
    enqueue: vi.fn().mockResolvedValue('test-operation-id'),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('API Functions - Phase 3 Features', () => {
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

  describe('addPin - Phase 3 Features', () => {
    it('should calculate expires_at based on pin type TTL', async () => {
      const pinData: PinData = {
        map_id: 'test-map-id',
        lat: 40.7128,
        lng: -74.0060,
        type: 'checkpoint', // 2 hour TTL
      };

      const beforeTime = new Date();
      beforeTime.setHours(beforeTime.getHours() + PIN_TTL_HOURS.checkpoint);

      const result = await addPin(mockDb, pinData);

      const afterTime = new Date();
      afterTime.setHours(afterTime.getHours() + PIN_TTL_HOURS.checkpoint);

      // Find the insert call
      const insertCall = (mockDb.query as any).mock.calls.find((call: any[]) =>
        call[0].includes('INSERT INTO pins')
      );

      const expiresAt = insertCall[1][8]; // expires_at is 9th parameter
      const expiresDate = new Date(expiresAt);

      // Should be approximately 2 hours from now (checkpoint TTL)
      expect(expiresDate.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(expiresDate.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should use different TTL for different pin types', async () => {
      const medicalPin: PinData = {
        map_id: 'test-map-id',
        lat: 40.7128,
        lng: -74.0060,
        type: 'medical', // 24 hour TTL
      };

      const dangerPin: PinData = {
        map_id: 'test-map-id',
        lat: 40.7128,
        lng: -74.0060,
        type: 'danger', // 6 hour TTL
      };

      await addPin(mockDb, medicalPin);
      const medicalInsert = (mockDb.query as any).mock.calls.find((call: any[]) =>
        call[0].includes('INSERT INTO pins')
      );
      const medicalExpires = new Date(medicalInsert[1][8]);

      vi.clearAllMocks();
      await addPin(mockDb, dangerPin);
      const dangerInsert = (mockDb.query as any).mock.calls.find((call: any[]) =>
        call[0].includes('INSERT INTO pins')
      );
      const dangerExpires = new Date(dangerInsert[1][8]);

      // Medical should expire 18 hours later than danger (24h vs 6h)
      const diffHours = (medicalExpires.getTime() - dangerExpires.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeCloseTo(18, 0); // Within 1 hour tolerance
    });

    it('should not set expires_at if type is not provided', async () => {
      const pinData: PinData = {
        map_id: 'test-map-id',
        lat: 40.7128,
        lng: -74.0060,
      };

      await addPin(mockDb, pinData);

      const insertCall = (mockDb.query as any).mock.calls.find((call: any[]) =>
        call[0].includes('INSERT INTO pins')
      );

      expect(insertCall[1][8]).toBeNull(); // expires_at should be null
    });

    it('should apply fuzzing when map has fuzzing enabled', async () => {
      const pinData: PinData = {
        map_id: 'test-map-id',
        lat: 40.7128,
        lng: -74.0060,
        type: 'medical',
      };

      // Mock map with fuzzing enabled (first query - map check)
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [{
          fuzzing_enabled: 'true',
          fuzzing_radius: 100,
        }],
      });

      // Mock the pin insert (second query)
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [],
      });

      await addPin(mockDb, pinData);

      // Find the insert call (should be the second call)
      const insertCalls = (mockDb.query as any).mock.calls.filter((call: any[]) =>
        call[0].includes('INSERT INTO pins')
      );
      expect(insertCalls.length).toBeGreaterThan(0);

      const insertCall = insertCalls[0];
      const lat = insertCall[1][2];
      const lng = insertCall[1][3];

      // Coordinates should be fuzzed (not exact)
      expect(lat).not.toBe(40.7128);
      expect(lng).not.toBe(-74.0060);

      // But should be close (within ~100m = ~0.001 degrees)
      expect(Math.abs(lat - 40.7128)).toBeLessThan(0.002);
      expect(Math.abs(lng - -74.0060)).toBeLessThan(0.002);
    });

    it('should not apply fuzzing when map has fuzzing disabled', async () => {
      const pinData: PinData = {
        map_id: 'test-map-id',
        lat: 40.7128,
        lng: -74.0060,
        type: 'medical',
      };

      // Mock map with fuzzing disabled (first query - map check)
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [{
          fuzzing_enabled: 'false',
          fuzzing_radius: 100,
        }],
      });

      // Mock the pin insert (second query)
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [],
      });

      await addPin(mockDb, pinData);

      const insertCalls = (mockDb.query as any).mock.calls.filter((call: any[]) =>
        call[0].includes('INSERT INTO pins')
      );
      expect(insertCalls.length).toBeGreaterThan(0);

      const insertCall = insertCalls[0];
      const lat = insertCall[1][2];
      const lng = insertCall[1][3];

      // Coordinates should be exact
      expect(lat).toBe(40.7128);
      expect(lng).toBe(-74.0060);
    });

    it('should include type and expires_at in PostgREST payload', async () => {
      const pinData: PinData = {
        map_id: 'test-map-id',
        lat: 40.7128,
        lng: -74.0060,
        type: 'water',
      };

      // Mock LOCAL map query (first - for ensureMapExistsInPostgres)
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [{ id: 'test-map-id', name: 'Test Map' }],
      });

      //Mock map query for fuzzing check (second query)
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [{ fuzzing_enabled: false }],
      });

      // Mock fetch for map existence check - map exists
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ id: 'test-map-id' }],
      });

      // Mock fetch for pin creation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 201,
        text: async () => '',
      });

      await addPin(mockDb, pinData);

      // Check PostgREST call for pin creation (should be second fetch)
      const fetchCalls = (global.fetch as any).mock.calls;
      const postgresCall = fetchCalls.find((call: any[]) =>
        call[0].includes('/pins')
      );

      expect(postgresCall).toBeTruthy();
      const body = JSON.parse(postgresCall[1].body);

      expect(body.type).toBe('water');
      expect(body.expires_at).toBeTruthy();
      expect(new Date(body.expires_at).getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('getPins - Expiration Filtering', () => {
    it('should filter out expired pins by default', async () => {
      const now = new Date().toISOString();
      const pastTime = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
      const futureTime = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // 1 hour from now

      // Mock the query that filters expired pins
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [
          { id: 'pin-1', expires_at: null, created_at: now },
          { id: 'pin-3', expires_at: futureTime, created_at: now }, // not expired
        ],
      });

      const pins = await getPins(mockDb, 'test-map-id', false);

      // Should only return non-expired pins
      expect(pins).toHaveLength(2);
      expect(pins.map(p => p.id)).toEqual(['pin-1', 'pin-3']);

      // Should query with expiration filter
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('expires_at IS NULL OR expires_at >'),
        expect.arrayContaining(['test-map-id', expect.any(String)])
      );
    });

    it('should include expired pins when requested', async () => {
      const now = new Date().toISOString();
      const pastTime = new Date(Date.now() - 1000 * 60 * 60).toISOString();

      (mockDb.query as any).mockResolvedValueOnce({
        rows: [
          { id: 'pin-1', expires_at: null, created_at: now },
          { id: 'pin-2', expires_at: pastTime, created_at: now },
        ],
      });

      const pins = await getPins(mockDb, 'test-map-id', true);

      expect(pins).toHaveLength(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM pins WHERE map_id'),
        ['test-map-id']
      );
      expect(mockDb.query).not.toHaveBeenCalledWith(
        expect.stringContaining('expires_at'),
        expect.anything()
      );
    });

    it('should handle missing expires_at column gracefully', async () => {
      // Simulate database without expires_at column
      (mockDb.query as any).mockRejectedValueOnce(
        new Error('column "expires_at" does not exist')
      );

      // Should fall back to simple query
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [{ id: 'pin-1', created_at: new Date().toISOString() }],
      });

      const pins = await getPins(mockDb, 'test-map-id', false);

      expect(pins).toHaveLength(1);
      // Should have tried the simple query as fallback
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM pins WHERE map_id = $1'),
        ['test-map-id']
      );
    });
  });

  describe('Sync Fallback Behavior', () => {
    it('should retry without Phase 3 fields when columns dont exist', async () => {
      const pinData: PinData = {
        map_id: 'test-map-id',
        lat: 40.7128,
        lng: -74.0060,
        type: 'medical',
      };

      // Mock LOCAL map query (for ensureMapExistsInPostgres)
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [{ id: 'test-map-id', name: 'Test Map' }],
      });

      // Mock map query for fuzzing check
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [{ fuzzing_enabled: false }],
      });

      // Mock fetch for map existence check - map exists
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => [{ id: 'test-map-id' }],
      });

      // First pin creation call fails with column error
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => JSON.stringify({
            code: 'PGRST204',
            message: "Could not find the 'expires_at' column of 'pins' in the schema cache",
          }),
        })
        // Second call succeeds
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: async () => '',
        });

      const result = await addPin(mockDb, pinData);

      expect(result).toHaveProperty('id');

      // Should have called PostgREST twice
      const fetchCalls = (global.fetch as any).mock.calls.filter((call: any[]) =>
        call[0].includes('/pins')
      );
      expect(fetchCalls).toHaveLength(2);

      // First call should have type and expires_at
      const firstBody = JSON.parse(fetchCalls[0][1].body);
      expect(firstBody.type).toBe('medical');
      expect(firstBody.expires_at).toBeTruthy();

      // Second call (fallback) should not have them
      const secondBody = JSON.parse(fetchCalls[1][1].body);
      expect(secondBody.type).toBeUndefined();
      expect(secondBody.expires_at).toBeUndefined();
    });

    it('should queue pin without Phase 3 fields if sync fails', async () => {
      const pinData: PinData = {
        map_id: 'test-map-id',
        lat: 40.7128,
        lng: -74.0060,
        type: 'water',
      };

      // Both calls fail
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => JSON.stringify({
            code: 'PGRST204',
            message: "Could not find the 'expires_at' column",
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Server Error',
        });

      // Mock pin insert
      (mockDb.query as any).mockResolvedValueOnce({
        rows: [],
      });

      const { operationQueue } = await import('./operationQueue');
      const result = await addPin(mockDb, pinData);

      expect(result).toHaveProperty('id');

      // Should queue without Phase 3 fields
      expect(operationQueue.enqueue).toHaveBeenCalledWith(
        'addPin',
        expect.objectContaining({
          map_id: pinData.map_id,
          lat: pinData.lat,
          lng: pinData.lng,
        })
      );

      const queuedData = (operationQueue.enqueue as any).mock.calls[0][1];
      expect(queuedData.type).toBeUndefined();
      expect(queuedData.expires_at).toBeUndefined();
    });
  });
});

