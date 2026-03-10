// src/lib/db/fieldEncryption.ts
// Field-level encryption for database rows

import type { CryptoKey } from './encryption';
import { encrypt, decrypt, isEncrypted } from './encryption';
import type { PinRow, MapRow } from '../models';

/**
 * Encrypt sensitive fields in a pin row before storing/sending.
 * Tags and photo_urls (TEXT[]) are JSON-stringified before encryption,
 * then wrapped in a single-element array for PostgreSQL compatibility.
 */
export async function encryptPinRow(
  pin: Partial<PinRow>,
  key: CryptoKey
): Promise<Partial<PinRow>> {
  const encrypted: Partial<PinRow> = { ...pin };

  if (pin.description !== null && pin.description !== undefined && pin.description !== '') {
    encrypted.description = await encrypt(pin.description, key);
  }

  // Array fields: JSON.stringify → encrypt → wrap in single-element array
  if (pin.tags !== null && pin.tags !== undefined) {
    const tagsStr = Array.isArray(pin.tags) ? JSON.stringify(pin.tags) : pin.tags;
    if (tagsStr && tagsStr !== '{}' && tagsStr !== '[]' && tagsStr !== '') {
      const encryptedBlob = await encrypt(tagsStr, key);
      encrypted.tags = [encryptedBlob] as any;
    }
  }

  if (pin.photo_urls !== null && pin.photo_urls !== undefined) {
    const urlsStr = Array.isArray(pin.photo_urls) ? JSON.stringify(pin.photo_urls) : pin.photo_urls;
    if (urlsStr && urlsStr !== '{}' && urlsStr !== '[]' && urlsStr !== '') {
      const encryptedBlob = await encrypt(urlsStr, key);
      encrypted.photo_urls = [encryptedBlob] as any;
    }
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in a pin row after retrieving.
 * Handles both direct encrypted strings and single-element encrypted arrays.
 */
export async function decryptPinRow(
  pin: PinRow,
  key: CryptoKey | null
): Promise<PinRow> {
  if (!key) return pin;

  const decrypted: PinRow = { ...pin };

  // Decrypt description (simple string field)
  if (pin.description && isEncrypted(pin.description)) {
    try {
      decrypted.description = await decrypt(pin.description, key);
    } catch (error) {
      console.warn('Failed to decrypt description:', error);
    }
  }

  // Decrypt array fields: detect single-element encrypted array → decrypt → parse
  decrypted.tags = await decryptArrayField(pin.tags, key);
  decrypted.photo_urls = await decryptArrayField(pin.photo_urls, key);

  return decrypted;
}

/**
 * Decrypt an array field that may be encrypted.
 * Handles: single-element encrypted array ['🔒...'], direct encrypted string, or plain array.
 */
async function decryptArrayField(
  value: any,
  key: CryptoKey
): Promise<any> {
  if (!value) return value;

  // Case 1: Single-element array with encrypted blob
  if (Array.isArray(value) && value.length === 1 && isEncrypted(value[0])) {
    try {
      const decryptedJson = await decrypt(value[0], key);
      return JSON.parse(decryptedJson);
    } catch (error) {
      console.warn('Failed to decrypt array field:', error);
      return value;
    }
  }

  // Case 2: Direct encrypted string (legacy or from string column)
  if (typeof value === 'string' && isEncrypted(value)) {
    try {
      const decryptedJson = await decrypt(value, key);
      return JSON.parse(decryptedJson);
    } catch (error) {
      console.warn('Failed to decrypt string array field:', error);
      return value;
    }
  }

  // Case 3: Plain unencrypted value — return as-is
  return value;
}

/**
 * Encrypt sensitive fields in a map row.
 */
export async function encryptMapRow(
  map: Partial<MapRow>,
  key: CryptoKey
): Promise<Partial<MapRow>> {
  const encrypted: Partial<MapRow> = { ...map };

  if (map.name !== undefined && map.name !== '') {
    encrypted.name = await encrypt(map.name, key);
  }

  return encrypted;
}

/**
 * Decrypt sensitive fields in a map row.
 */
export async function decryptMapRow(
  map: MapRow,
  key: CryptoKey | null
): Promise<MapRow> {
  if (!key) return map;

  const decrypted: MapRow = { ...map };

  if (map.name && isEncrypted(map.name)) {
    try {
      decrypted.name = await decrypt(map.name, key);
    } catch (error) {
      console.warn('Failed to decrypt map name:', error);
    }
  }

  return decrypted;
}

/**
 * Decrypt an array of pin rows.
 */
export async function decryptPinRows(
  pins: PinRow[],
  key: CryptoKey | null
): Promise<PinRow[]> {
  if (!key || pins.length === 0) return pins;
  return Promise.all(pins.map((pin) => decryptPinRow(pin, key)));
}

/**
 * Decrypt an array of map rows.
 */
export async function decryptMapRows(
  maps: MapRow[],
  key: CryptoKey | null
): Promise<MapRow[]> {
  if (!key || maps.length === 0) return maps;
  return Promise.all(maps.map((map) => decryptMapRow(map, key)));
}
