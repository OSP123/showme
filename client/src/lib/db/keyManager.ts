// src/lib/db/keyManager.ts
// Per-map encryption key management for E2E encryption

import {
  exportKey,
  importKey,
  deriveKeyFromPassphrase,
  generateSalt,
  type CryptoKey,
} from './encryption';

// Per-map key cache: mapId → CryptoKey
const keyCache = new Map<string, CryptoKey>();

/**
 * Initialize encryption for a map with a passphrase.
 * Generates a new salt, derives a key, and stores both locally.
 * Returns the salt (must be saved to server so other users can derive the same key).
 */
export async function initializeMapEncryption(
  mapId: string,
  passphrase: string
): Promise<string> {
  const salt = generateSalt();
  const saltBase64 = btoa(String.fromCharCode(...salt));

  const key = await deriveKeyFromPassphrase(passphrase, salt);

  // Store derived key and salt in localStorage
  const keyData = await exportKey(key);
  const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(keyData)));
  localStorage.setItem(`showme_enc_key_${mapId}`, keyBase64);
  localStorage.setItem(`showme_enc_salt_${mapId}`, saltBase64);

  // Cache in memory
  keyCache.set(mapId, key);

  return saltBase64;
}

/**
 * Unlock a map using a passphrase and the map's stored salt.
 * Derives the same key that the creator generated.
 */
export async function unlockMap(
  mapId: string,
  passphrase: string,
  saltBase64: string
): Promise<CryptoKey> {
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
  const key = await deriveKeyFromPassphrase(passphrase, salt);

  // Store for future sessions
  const keyData = await exportKey(key);
  const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(keyData)));
  localStorage.setItem(`showme_enc_key_${mapId}`, keyBase64);
  localStorage.setItem(`showme_enc_salt_${mapId}`, saltBase64);

  // Cache in memory
  keyCache.set(mapId, key);

  return key;
}

/**
 * Get the encryption key for a map (from cache or localStorage).
 * Returns null if no key exists (map not encrypted or not unlocked).
 */
export async function getMapEncryptionKey(mapId: string): Promise<CryptoKey | null> {
  // Check memory cache first
  const cached = keyCache.get(mapId);
  if (cached) return cached;

  // Try loading from localStorage
  const keyBase64 = localStorage.getItem(`showme_enc_key_${mapId}`);
  if (!keyBase64) return null;

  try {
    const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
    const key = await importKey(keyBytes.buffer);
    keyCache.set(mapId, key);
    return key;
  } catch (error) {
    console.error('Failed to load encryption key for map:', mapId, error);
    return null;
  }
}

/**
 * Check if a map has encryption enabled locally (key stored).
 */
export function isMapEncrypted(mapId: string): boolean {
  return localStorage.getItem(`showme_enc_key_${mapId}`) !== null;
}

/**
 * Clear encryption key for a map.
 * WARNING: Makes locally-encrypted data unreadable.
 */
export function clearMapEncryption(mapId: string): void {
  keyCache.delete(mapId);
  localStorage.removeItem(`showme_enc_key_${mapId}`);
  localStorage.removeItem(`showme_enc_salt_${mapId}`);
}

/**
 * Reset all cached keys (for testing).
 */
export function resetKeyCache(): void {
  keyCache.clear();
}

/**
 * Backward compat: global getEncryptionKey returns null.
 * Old global encryption is deprecated in favor of per-map keys.
 */
export async function getEncryptionKey(): Promise<CryptoKey | null> {
  return null;
}

/**
 * Backward compat: global isEncryptionEnabled returns false.
 */
export function isEncryptionEnabled(): boolean {
  return false;
}
