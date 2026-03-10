import { describe, it, expect } from 'vitest';
import { generateKey } from './encryption';
import {
  encryptPinRow,
  decryptPinRow,
  encryptMapRow,
  decryptMapRow,
} from './fieldEncryption';
import type { PinRow, MapRow } from '../models';

describe('fieldEncryption', () => {
  describe('encryptPinRow / decryptPinRow', () => {
    it('should encrypt and decrypt description', async () => {
      const key = await generateKey();
      const pin: Partial<PinRow> = { description: 'Secret location' };
      const encrypted = await encryptPinRow(pin, key);
      expect(encrypted.description).not.toBe('Secret location');
      expect(encrypted.description).toMatch(/^🔒/);

      const full: PinRow = {
        id: '1', map_id: '1', lat: 0, lng: 0, type: null,
        tags: null, photo_urls: null, expires_at: null,
        created_at: '', updated_at: '',
        description: encrypted.description!,
      };

      const decrypted = await decryptPinRow(full, key);
      expect(decrypted.description).toBe('Secret location');
    });

    it('should encrypt array fields as single-element encrypted arrays', async () => {
      const key = await generateKey();
      const pin: Partial<PinRow> = {
        tags: ['shelter', 'water'] as any,
        photo_urls: ['https://example.com/1.jpg'] as any,
      };

      const encrypted = await encryptPinRow(pin, key);

      // Should be arrays with a single encrypted element
      expect(Array.isArray(encrypted.tags)).toBe(true);
      expect((encrypted.tags as any).length).toBe(1);
      expect((encrypted.tags as any)[0]).toMatch(/^🔒/);

      expect(Array.isArray(encrypted.photo_urls)).toBe(true);
      expect((encrypted.photo_urls as any).length).toBe(1);
      expect((encrypted.photo_urls as any)[0]).toMatch(/^🔒/);
    });

    it('should decrypt single-element encrypted arrays back to original arrays', async () => {
      const key = await generateKey();
      const originalTags = ['shelter', 'water', 'safe'];
      const originalPhotos = ['https://example.com/1.jpg', 'https://example.com/2.jpg'];

      const encrypted = await encryptPinRow({
        tags: originalTags as any,
        photo_urls: originalPhotos as any,
      }, key);

      const full: PinRow = {
        id: '1', map_id: '1', lat: 0, lng: 0, type: null,
        description: null, expires_at: null,
        created_at: '', updated_at: '',
        tags: encrypted.tags as any,
        photo_urls: encrypted.photo_urls as any,
      };

      const decrypted = await decryptPinRow(full, key);
      expect(decrypted.tags).toEqual(originalTags);
      expect(decrypted.photo_urls).toEqual(originalPhotos);
    });

    it('should pass through unencrypted data when no key', async () => {
      const pin: PinRow = {
        id: '1', map_id: '1', lat: 0, lng: 0, type: 'water',
        tags: ['a', 'b'] as any, description: 'plain text',
        photo_urls: [] as any, expires_at: null,
        created_at: '', updated_at: '',
      };

      const result = await decryptPinRow(pin, null);
      expect(result.description).toBe('plain text');
      expect(result.tags).toEqual(['a', 'b']);
    });

    it('should not encrypt empty arrays', async () => {
      const key = await generateKey();
      const pin: Partial<PinRow> = {
        tags: [] as any,
        photo_urls: [] as any,
      };

      const encrypted = await encryptPinRow(pin, key);
      // Empty arrays should remain as-is (not encrypted)
      expect(encrypted.tags).toEqual([]);
      expect(encrypted.photo_urls).toEqual([]);
    });
  });

  describe('encryptMapRow / decryptMapRow', () => {
    it('should encrypt and decrypt map name', async () => {
      const key = await generateKey();
      const encrypted = await encryptMapRow({ name: 'Crisis Map Alpha' }, key);
      expect(encrypted.name).toMatch(/^🔒/);

      const full: MapRow = {
        id: '1', name: encrypted.name!, is_private: 'false',
        access_token: null, access_code: null, encryption_salt: null,
        created_at: '',
      };

      const decrypted = await decryptMapRow(full, key);
      expect(decrypted.name).toBe('Crisis Map Alpha');
    });

    it('should pass through when no key', async () => {
      const map: MapRow = {
        id: '1', name: 'Plain Map', is_private: 'false',
        access_token: null, access_code: null, encryption_salt: null,
        created_at: '',
      };

      const result = await decryptMapRow(map, null);
      expect(result.name).toBe('Plain Map');
    });
  });

  describe('E2E round-trip', () => {
    it('should encrypt → store → retrieve → decrypt correctly for pins', async () => {
      const key = await generateKey();

      // Simulate full flow
      const original = {
        description: 'Emergency water source at park fountain',
        tags: ['water', 'safe', 'verified'] as any,
        photo_urls: ['https://cdn.example.com/photo1.jpg'] as any,
      };

      // Encrypt (before sending to server)
      const encrypted = await encryptPinRow(original, key);

      // Simulate what server stores and returns
      const fromServer: PinRow = {
        id: 'pin-123', map_id: 'map-456',
        lat: 40.7128, lng: -74.0060,
        type: 'water',
        tags: encrypted.tags as any,
        description: encrypted.description!,
        photo_urls: encrypted.photo_urls as any,
        expires_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      // Verify server data is encrypted
      expect(fromServer.description).toMatch(/^🔒/);
      expect(Array.isArray(fromServer.tags)).toBe(true);

      // Decrypt (after receiving from server)
      const decrypted = await decryptPinRow(fromServer, key);
      expect(decrypted.description).toBe(original.description);
      expect(decrypted.tags).toEqual(original.tags);
      expect(decrypted.photo_urls).toEqual(original.photo_urls);

      // Coordinates remain unencrypted
      expect(decrypted.lat).toBe(40.7128);
      expect(decrypted.lng).toBe(-74.0060);
      expect(decrypted.type).toBe('water');
    });
  });
});
