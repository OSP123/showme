// src/lib/db/encryption.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateKey,
  exportKey,
  importKey,
  deriveKeyFromPassphrase,
  generateSalt,
  encrypt,
  decrypt,
  isEncrypted,
} from './encryption';

describe('encryption', () => {
  describe('generateKey', () => {
    it('should generate a valid encryption key', async () => {
      const newKey = await generateKey();
      expect(newKey).toBeInstanceOf(CryptoKey);
      expect(newKey.algorithm.name).toBe('AES-GCM');
    });
  });

  describe('exportKey and importKey', () => {
    it('should export and import a key', async () => {
      const key = await generateKey();
      const keyData = await exportKey(key);
      // Check if it's an ArrayBuffer (works across different contexts)
      expect(keyData).toBeDefined();
      expect(keyData.constructor.name).toBe('ArrayBuffer');
      expect(keyData.byteLength).toBeGreaterThan(0);
      expect(keyData.byteLength).toBe(32); // AES-256 key is 32 bytes

      const importedKey = await importKey(keyData);
      expect(importedKey).toBeInstanceOf(CryptoKey);
      expect(importedKey.algorithm.name).toBe('AES-GCM');
    });
  });

  describe('deriveKeyFromPassphrase', () => {
    it('should derive a key from a passphrase', async () => {
      const passphrase = 'test-passphrase-123';
      const salt = generateSalt();
      const derivedKey = await deriveKeyFromPassphrase(passphrase, salt);

      expect(derivedKey).toBeInstanceOf(CryptoKey);
      expect(derivedKey.algorithm.name).toBe('AES-GCM');
    });

    it('should derive the same key with the same passphrase and salt', async () => {
      const passphrase = 'test-passphrase-123';
      const salt = generateSalt();

      const key1 = await deriveKeyFromPassphrase(passphrase, salt);
      const key2 = await deriveKeyFromPassphrase(passphrase, salt);

      // Export both keys to compare
      const keyData1 = await exportKey(key1);
      const keyData2 = await exportKey(key2);

      expect(new Uint8Array(keyData1)).toEqual(new Uint8Array(keyData2));
    });

    it('should derive different keys with different salts', async () => {
      const passphrase = 'test-passphrase-123';
      const salt1 = generateSalt();
      const salt2 = generateSalt();

      const key1 = await deriveKeyFromPassphrase(passphrase, salt1);
      const key2 = await deriveKeyFromPassphrase(passphrase, salt2);

      const keyData1 = await exportKey(key1);
      const keyData2 = await exportKey(key2);

      expect(new Uint8Array(keyData1)).not.toEqual(new Uint8Array(keyData2));
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt a string', async () => {
      const key = await generateKey();
      const plaintext = 'Hello, World!';
      const encrypted = await encrypt(plaintext, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
      expect(encrypted).not.toBe(plaintext);
    });

    it('should produce different ciphertexts for the same plaintext', async () => {
      const key = await generateKey();
      const plaintext = 'Hello, World!';
      const encrypted1 = await encrypt(plaintext, key);
      const encrypted2 = await encrypt(plaintext, key);

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should encrypt and decrypt empty string', async () => {
      const key = await generateKey();
      const plaintext = '';
      const encrypted = await encrypt(plaintext, key);
      const decrypted = await decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt JSON data', async () => {
      const key = await generateKey();
      const data = { name: 'Test', value: 123 };
      const plaintext = JSON.stringify(data);
      const encrypted = await encrypt(plaintext, key);
      const decrypted = await decrypt(encrypted, key);
      const parsed = JSON.parse(decrypted);

      expect(parsed).toEqual(data);
    });

    it('should fail to decrypt with wrong key', async () => {
      const key = await generateKey();
      const plaintext = 'Hello, World!';
      const encrypted = await encrypt(plaintext, key);
      const wrongKey = await generateKey();

      await expect(decrypt(encrypted, wrongKey)).rejects.toThrow();
    });

    it('should fail to decrypt corrupted data', async () => {
      const key = await generateKey();
      const plaintext = 'Hello, World!';
      const encrypted = await encrypt(plaintext, key);
      const corrupted = encrypted.slice(0, -5); // Remove last 5 characters

      await expect(decrypt(corrupted, key)).rejects.toThrow();
    });
  });

  describe('isEncrypted', () => {
    it('should detect encrypted strings', async () => {
      const key = await generateKey();
      const plaintext = 'Hello, World!';
      const encrypted = await encrypt(plaintext, key);

      expect(isEncrypted(encrypted)).toBe(true);
      expect(isEncrypted(plaintext)).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEncrypted('')).toBe(false);
    });
  });
});

