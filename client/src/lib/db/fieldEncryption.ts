// src/lib/db/fieldEncryption.ts
// Field-level encryption for database rows

import type { CryptoKey } from './encryption';
import { encrypt, decrypt, isEncrypted } from './encryption';
import type { PinRow, MapRow } from '../models';

/**
 * Encrypt sensitive fields in a pin row before storing
 * Note: Coordinates (lat/lng) are kept unencrypted for indexing/search performance
 * but can be encrypted by storing as encrypted strings in a future schema update
 */
export async function encryptPinRow(
  pin: Partial<PinRow>,
  key: CryptoKey
): Promise<Partial<PinRow>> {
  const encrypted: Partial<PinRow> = { ...pin };

  // Encrypt TEXT fields
  // Note: lat/lng are DOUBLE PRECISION, so we keep them unencrypted for now
  // In a future update, we could add encrypted coordinate columns
  if (pin.description !== null && pin.description !== undefined && pin.description !== '') {
    encrypted.description = await encrypt(pin.description, key);
  }
  if (pin.tags !== null && pin.tags !== undefined && pin.tags !== '{}' && pin.tags !== '') {
    encrypted.tags = await encrypt(pin.tags, key);
  }
  if (pin.photo_urls !== null && pin.photo_urls !== undefined && pin.photo_urls !== '{}' && pin.photo_urls !== '') {
    encrypted.photo_urls = await encrypt(pin.photo_urls, key);
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in a pin row after retrieving
 */
export async function decryptPinRow(
  pin: PinRow,
  key: CryptoKey | null
): Promise<PinRow> {
  if (!key) {
    // No encryption key - return as-is (backward compatibility)
    return pin;
  }

  const decrypted: PinRow = { ...pin };

  // Decrypt TEXT fields if they appear to be encrypted
  // Note: lat/lng remain unencrypted (stored as DOUBLE PRECISION)
  if (pin.description && isEncrypted(pin.description)) {
    try {
      decrypted.description = await decrypt(pin.description, key);
    } catch (error) {
      console.warn('Failed to decrypt description, using original value:', error);
    }
  }

  if (pin.tags && isEncrypted(pin.tags)) {
    try {
      decrypted.tags = await decrypt(pin.tags, key);
    } catch (error) {
      console.warn('Failed to decrypt tags, using original value:', error);
    }
  }

  if (pin.photo_urls && isEncrypted(pin.photo_urls)) {
    try {
      decrypted.photo_urls = await decrypt(pin.photo_urls, key);
    } catch (error) {
      console.warn('Failed to decrypt photo_urls, using original value:', error);
    }
  }

  return decrypted;
}

/**
 * Encrypt sensitive fields in a map row before storing
 */
export async function encryptMapRow(
  map: Partial<MapRow>,
  key: CryptoKey
): Promise<Partial<MapRow>> {
  const encrypted: Partial<MapRow> = { ...map };

  // Encrypt sensitive fields
  if (map.name !== undefined) {
    encrypted.name = await encrypt(map.name, key);
  }
  if (map.access_token !== null && map.access_token !== undefined) {
    encrypted.access_token = await encrypt(map.access_token, key);
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in a map row after retrieving
 */
export async function decryptMapRow(
  map: MapRow,
  key: CryptoKey | null
): Promise<MapRow> {
  if (!key) {
    // No encryption key - return as-is (backward compatibility)
    return map;
  }

  const decrypted: MapRow = { ...map };

  // Decrypt sensitive fields if they appear to be encrypted
  if (map.name && isEncrypted(map.name)) {
    try {
      decrypted.name = await decrypt(map.name, key);
    } catch (error) {
      console.warn('Failed to decrypt map name, using original value:', error);
    }
  }

  if (map.access_token && isEncrypted(map.access_token)) {
    try {
      decrypted.access_token = await decrypt(map.access_token, key);
    } catch (error) {
      console.warn('Failed to decrypt access_token, using original value:', error);
    }
  }

  return decrypted;
}

/**
 * Encrypt an array of pin rows
 */
export async function decryptPinRows(
  pins: PinRow[],
  key: CryptoKey | null
): Promise<PinRow[]> {
  if (!key || pins.length === 0) {
    return pins;
  }

  return Promise.all(pins.map((pin) => decryptPinRow(pin, key)));
}

/**
 * Decrypt an array of map rows
 */
export async function decryptMapRows(
  maps: MapRow[],
  key: CryptoKey | null
): Promise<MapRow[]> {
  if (!key || maps.length === 0) {
    return maps;
  }

  return Promise.all(maps.map((map) => decryptMapRow(map, key)));
}

