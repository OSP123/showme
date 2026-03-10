// src/lib/db/keyManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';

// Mock localStorage before importing keyManager
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

import {
  initializeMapEncryption,
  unlockMap,
  getMapEncryptionKey,
  isMapEncrypted,
  clearMapEncryption,
  resetKeyCache,
  getEncryptionKey,
  isEncryptionEnabled,
} from './keyManager';

const TEST_MAP_ID = 'test-map-123';
const TEST_PASSPHRASE = 'test-passphrase-secure';

describe('keyManager (per-map)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    resetKeyCache();
  });

  describe('initializeMapEncryption', () => {
    it('should generate a salt and derive a key from passphrase', async () => {
      const salt = await initializeMapEncryption(TEST_MAP_ID, TEST_PASSPHRASE);
      expect(salt).toBeTruthy();
      expect(typeof salt).toBe('string');
      expect(isMapEncrypted(TEST_MAP_ID)).toBe(true);
    });

    it('should store key in localStorage', async () => {
      await initializeMapEncryption(TEST_MAP_ID, TEST_PASSPHRASE);
      expect(localStorageMock.getItem(`showme_enc_key_${TEST_MAP_ID}`)).toBeTruthy();
      expect(localStorageMock.getItem(`showme_enc_salt_${TEST_MAP_ID}`)).toBeTruthy();
    });

    it('should return a usable encryption key', async () => {
      await initializeMapEncryption(TEST_MAP_ID, TEST_PASSPHRASE);
      const key = await getMapEncryptionKey(TEST_MAP_ID);
      expect(key).toBeInstanceOf(CryptoKey);
    });
  });

  describe('unlockMap', () => {
    it('should derive the same key with same passphrase + salt', async () => {
      // Initialize (creator)
      const salt = await initializeMapEncryption(TEST_MAP_ID, TEST_PASSPHRASE);
      const creatorKey = await getMapEncryptionKey(TEST_MAP_ID);

      // Clear cache to simulate different device
      resetKeyCache();
      localStorageMock.clear();

      // Unlock (recipient) with same passphrase + salt
      const recipientKey = await unlockMap(TEST_MAP_ID, TEST_PASSPHRASE, salt);

      // Both keys should produce the same raw bytes
      const creatorBytes = await crypto.subtle.exportKey('raw', creatorKey!);
      const recipientBytes = await crypto.subtle.exportKey('raw', recipientKey);
      expect(new Uint8Array(creatorBytes)).toEqual(new Uint8Array(recipientBytes));
    });

    it('should derive a different key with wrong passphrase', async () => {
      const salt = await initializeMapEncryption(TEST_MAP_ID, TEST_PASSPHRASE);
      const correctKey = await getMapEncryptionKey(TEST_MAP_ID);

      resetKeyCache();
      localStorageMock.clear();

      const wrongKey = await unlockMap(TEST_MAP_ID, 'wrong-passphrase', salt);

      const correctBytes = await crypto.subtle.exportKey('raw', correctKey!);
      const wrongBytes = await crypto.subtle.exportKey('raw', wrongKey);
      expect(new Uint8Array(correctBytes)).not.toEqual(new Uint8Array(wrongBytes));
    });

    it('should store key locally after unlock', async () => {
      const salt = await initializeMapEncryption(TEST_MAP_ID, TEST_PASSPHRASE);
      resetKeyCache();
      localStorageMock.clear();

      await unlockMap(TEST_MAP_ID, TEST_PASSPHRASE, salt);
      expect(isMapEncrypted(TEST_MAP_ID)).toBe(true);
    });
  });

  describe('getMapEncryptionKey', () => {
    it('should return null for non-encrypted map', async () => {
      const key = await getMapEncryptionKey('nonexistent-map');
      expect(key).toBeNull();
    });

    it('should return cached key on subsequent calls', async () => {
      await initializeMapEncryption(TEST_MAP_ID, TEST_PASSPHRASE);
      const key1 = await getMapEncryptionKey(TEST_MAP_ID);
      const key2 = await getMapEncryptionKey(TEST_MAP_ID);
      expect(key1).toBe(key2); // Same object reference (cached)
    });

    it('should load from localStorage when cache is empty', async () => {
      await initializeMapEncryption(TEST_MAP_ID, TEST_PASSPHRASE);
      resetKeyCache(); // Clear cache but keep localStorage
      const key = await getMapEncryptionKey(TEST_MAP_ID);
      expect(key).toBeInstanceOf(CryptoKey);
    });
  });

  describe('isMapEncrypted', () => {
    it('should return false for non-encrypted map', () => {
      expect(isMapEncrypted('no-key')).toBe(false);
    });

    it('should return true after initialization', async () => {
      await initializeMapEncryption(TEST_MAP_ID, TEST_PASSPHRASE);
      expect(isMapEncrypted(TEST_MAP_ID)).toBe(true);
    });
  });

  describe('clearMapEncryption', () => {
    it('should remove key and mark map as not encrypted', async () => {
      await initializeMapEncryption(TEST_MAP_ID, TEST_PASSPHRASE);
      expect(isMapEncrypted(TEST_MAP_ID)).toBe(true);

      clearMapEncryption(TEST_MAP_ID);
      expect(isMapEncrypted(TEST_MAP_ID)).toBe(false);
      const key = await getMapEncryptionKey(TEST_MAP_ID);
      expect(key).toBeNull();
    });
  });

  describe('per-map isolation', () => {
    it('should use different keys for different maps', async () => {
      const salt1 = await initializeMapEncryption('map-1', TEST_PASSPHRASE);
      const salt2 = await initializeMapEncryption('map-2', TEST_PASSPHRASE);

      const key1 = await getMapEncryptionKey('map-1');
      const key2 = await getMapEncryptionKey('map-2');

      // Different salts → different keys even with same passphrase
      expect(salt1).not.toBe(salt2);
      const bytes1 = await crypto.subtle.exportKey('raw', key1!);
      const bytes2 = await crypto.subtle.exportKey('raw', key2!);
      expect(new Uint8Array(bytes1)).not.toEqual(new Uint8Array(bytes2));
    });
  });

  describe('backward compat', () => {
    it('getEncryptionKey should return null (global key deprecated)', async () => {
      const key = await getEncryptionKey();
      expect(key).toBeNull();
    });

    it('isEncryptionEnabled should return false (global encryption deprecated)', () => {
      expect(isEncryptionEnabled()).toBe(false);
    });
  });
});
