// src/lib/db/keyManager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

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

// Replace global localStorage with mock
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Import after setting up localStorage mock
import {
  initializeEncryptionKey,
  getEncryptionKey,
  isEncryptionEnabled,
  getKeyType,
  clearEncryptionKey,
  reinitializeKeyFromPassphrase,
  resetKeyCache,
} from './keyManager';

describe('keyManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorageMock.clear();
    // Reset module state by clearing cached key
    resetKeyCache();
  });

  describe('initializeEncryptionKey', () => {
    it('should generate a key when no passphrase is provided', async () => {
      const key = await initializeEncryptionKey();
      expect(key).toBeInstanceOf(CryptoKey);
      expect(isEncryptionEnabled()).toBe(true);
      expect(getKeyType()).toBe('generated');
    });

    it('should derive a key from a passphrase', async () => {
      const passphrase = 'test-passphrase-123';
      const key = await initializeEncryptionKey(passphrase);
      expect(key).toBeInstanceOf(CryptoKey);
      expect(isEncryptionEnabled()).toBe(true);
      expect(getKeyType()).toBe('passphrase');
    });

    it('should return the same key on subsequent calls', async () => {
      const key1 = await initializeEncryptionKey();
      const key2 = await initializeEncryptionKey();

      // Export both keys to compare
      const keyData1 = await crypto.subtle.exportKey('raw', key1);
      const keyData2 = await crypto.subtle.exportKey('raw', key2);

      expect(new Uint8Array(keyData1)).toEqual(new Uint8Array(keyData2));
    });
  });

  describe('getEncryptionKey', () => {
    it('should return null when no key is initialized', async () => {
      const key = await getEncryptionKey();
      expect(key).toBeNull();
    });

    it('should return the key after initialization', async () => {
      await initializeEncryptionKey();
      const key = await getEncryptionKey();
      expect(key).toBeInstanceOf(CryptoKey);
    });
  });

  describe('isEncryptionEnabled', () => {
    it('should return false when no key is stored', () => {
      expect(isEncryptionEnabled()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await initializeEncryptionKey();
      expect(isEncryptionEnabled()).toBe(true);
    });
  });

  describe('getKeyType', () => {
    it('should return null when no key is stored', () => {
      expect(getKeyType()).toBeNull();
    });

    it('should return "generated" for auto-generated keys', async () => {
      await initializeEncryptionKey();
      expect(getKeyType()).toBe('generated');
    });

    it('should return "passphrase" for passphrase-derived keys', async () => {
      await initializeEncryptionKey('test-passphrase');
      expect(getKeyType()).toBe('passphrase');
    });
  });

  describe('clearEncryptionKey', () => {
    it('should clear the encryption key', async () => {
      await initializeEncryptionKey();
      expect(isEncryptionEnabled()).toBe(true);

      clearEncryptionKey();
      expect(isEncryptionEnabled()).toBe(false);
      expect(getKeyType()).toBeNull();
    });
  });

  describe('reinitializeKeyFromPassphrase', () => {
    it('should reinitialize with a new passphrase', async () => {
      // First initialize with auto-generated key
      await initializeEncryptionKey();
      const oldKey = await getEncryptionKey();
      expect(getKeyType()).toBe('generated');

      // Reinitialize with passphrase
      const newKey = await reinitializeKeyFromPassphrase('new-passphrase');
      expect(newKey).toBeInstanceOf(CryptoKey);
      expect(getKeyType()).toBe('passphrase');

      // New key should be different
      const oldKeyData = await crypto.subtle.exportKey('raw', oldKey!);
      const newKeyData = await crypto.subtle.exportKey('raw', newKey);
      expect(new Uint8Array(oldKeyData)).not.toEqual(new Uint8Array(newKeyData));
    });
  });
});

