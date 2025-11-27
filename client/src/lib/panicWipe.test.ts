// src/lib/panicWipe.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { panicWipe, canPerformPanicWipe, resetPanicWipeCooldown } from './panicWipe';

// Mock fetch globally
global.fetch = vi.fn();

// Mock window
const mockWindow = {
  dispatchEvent: vi.fn(),
  __panicWipeActive: false,
};
global.window = mockWindow as any;

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
};
global.localStorage = localStorageMock as any;

describe('panicWipe', () => {
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetPanicWipeCooldown();
    mockWindow.__panicWipeActive = false;
    
    // Reset fetch mock
    (global.fetch as any).mockReset();
    
    // Setup mock database
    mockDb = {
      query: vi.fn(),
      electric: {
        stop: vi.fn().mockResolvedValue(undefined),
      },
    };
    
    // Mock successful deletions
    mockDb.query.mockImplementation(async (sql: string) => {
      if (sql.includes('DELETE FROM pins')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('DELETE FROM maps')) {
        return { rows: [], rowCount: 0 };
      }
      if (sql.includes('SELECT COUNT(*)')) {
        return { rows: [{ count: 0 }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    });
    
    // Mock operation queue
    (global.window as any).operationQueue = {
      clearQueue: vi.fn(),
    };
    
    // Mock window.location
    delete (global.window as any).location;
    (global.window as any).location = {
      href: 'http://localhost:5173/?map=test-map-id',
      reload: vi.fn(),
    };
    
    // Mock URL and history
    global.URL = class {
      constructor(public href: string) {}
      searchParams = {
        delete: vi.fn(),
        set: vi.fn(),
        get: vi.fn(),
      };
    } as any;
    
    global.window.history = {
      replaceState: vi.fn(),
      pushState: vi.fn(),
    } as any;
  });

  it('should delete all pins and maps from local database', async () => {
    await panicWipe(mockDb);

    expect(mockDb.query).toHaveBeenCalledWith('DELETE FROM pins');
    expect(mockDb.query).toHaveBeenCalledWith('DELETE FROM maps');
  });

  it('should delete all pins from PostgREST', async () => {
    // Mock PostgREST responses
    const mockPins = [
      { id: 'pin1' },
      { id: 'pin2' },
      { id: 'pin3' },
    ];
    
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockPins,
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 204,
      });

    await panicWipe(mockDb);

    // Should fetch pins from PostgREST
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3015/pins?select=id',
      expect.objectContaining({ method: 'GET' })
    );

    // Should delete pins from PostgREST
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3015/pins?id=in.(pin1,pin2,pin3)',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('should set panic wipe flag in localStorage', async () => {
    await panicWipe(mockDb);

    expect(localStorageMock.setItem).toHaveBeenCalledWith('__panicWipeActive', 'true');
    expect(mockWindow.__panicWipeActive).toBe(true);
  });

  it('should dispatch panic-wipe-complete event', async () => {
    await panicWipe(mockDb);

    expect(mockWindow.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'panic-wipe-complete',
      })
    );
  });

  it('should clear operation queue', async () => {
    await panicWipe(mockDb);

    expect((global.window as any).operationQueue.clearQueue).toHaveBeenCalled();
  });

  it('should clear localStorage', async () => {
    await panicWipe(mockDb);

    expect(localStorageMock.clear).toHaveBeenCalled();
  });

  it('should handle PostgREST errors gracefully', async () => {
    // Mock PostgREST fetch failure
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(panicWipe(mockDb)).resolves.not.toThrow();
    
    // Should still delete from local DB
    expect(mockDb.query).toHaveBeenCalledWith('DELETE FROM pins');
  });

  it('should handle PostgREST delete failures gracefully', async () => {
    // Mock successful fetch but failed delete
    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{ id: 'pin1' }],
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      });

    await expect(panicWipe(mockDb)).resolves.not.toThrow();
  });

  it('should stop ElectricSQL sync before deletion', async () => {
    await panicWipe(mockDb);

    expect(mockDb.electric.stop).toHaveBeenCalled();
  });

  it('should clear mapId from URL', async () => {
    await panicWipe(mockDb);

    expect(global.window.history.replaceState).toHaveBeenCalled();
  });

  it('should handle ElectricSQL stop errors gracefully', async () => {
    mockDb.electric.stop.mockRejectedValueOnce(new Error('Stop failed'));

    await expect(panicWipe(mockDb)).resolves.not.toThrow();
    
    // Should still delete from local DB
    expect(mockDb.query).toHaveBeenCalledWith('DELETE FROM pins');
  });
});
