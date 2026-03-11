import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getUserLocation, type UserLocation } from './geolocation';

describe('geolocation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should return user location when geolocation succeeds', async () => {
    const mockPosition = {
      coords: { latitude: 40.7128, longitude: -74.006, accuracy: 50 },
      timestamp: Date.now(),
    };

    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((success) => {
          success(mockPosition);
        }),
      },
    });

    const result = await getUserLocation();
    expect(result).toEqual({
      center: [-74.006, 40.7128] as [number, number],
      zoom: 13,
    });
  });

  it('should return null when user denies permission', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((_success, error) => {
          error({ code: 1, message: 'User denied' });
        }),
      },
    });

    const result = await getUserLocation();
    expect(result).toBeNull();
  });

  it('should return null when geolocation is not available', async () => {
    vi.stubGlobal('navigator', {});

    const result = await getUserLocation();
    expect(result).toBeNull();
  });

  it('should return null on timeout', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((_success, error) => {
          error({ code: 3, message: 'Timeout' });
        }),
      },
    });

    const result = await getUserLocation();
    expect(result).toBeNull();
  });

  it('should use zoom 13 for high accuracy (< 100m)', async () => {
    const mockPosition = {
      coords: { latitude: 51.5074, longitude: -0.1278, accuracy: 50 },
      timestamp: Date.now(),
    };

    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((success) => success(mockPosition)),
      },
    });

    const result = await getUserLocation();
    expect(result?.zoom).toBe(13);
  });

  it('should use zoom 11 for low accuracy (> 1000m)', async () => {
    const mockPosition = {
      coords: { latitude: 51.5074, longitude: -0.1278, accuracy: 2000 },
      timestamp: Date.now(),
    };

    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((success) => success(mockPosition)),
      },
    });

    const result = await getUserLocation();
    expect(result?.zoom).toBe(11);
  });

  it('should use zoom 12 for medium accuracy (100-1000m)', async () => {
    const mockPosition = {
      coords: { latitude: 35.6762, longitude: 139.6503, accuracy: 500 },
      timestamp: Date.now(),
    };

    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: vi.fn((success) => success(mockPosition)),
      },
    });

    const result = await getUserLocation();
    expect(result?.zoom).toBe(12);
  });
});
