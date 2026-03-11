// src/lib/db/encryption.ts
// Encryption utilities for local database using Web Crypto API

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12; // bytes (96 bits for GCM)
const TAG_LENGTH = 128; // bits

/**
 * Derive an encryption key from a passphrase using PBKDF2
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random encryption key
 */
export async function generateKey(): Promise<CryptoKey> {
  return await crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Export a key to ArrayBuffer for storage
 */
export async function exportKey(key: CryptoKey): Promise<ArrayBuffer> {
  return await crypto.subtle.exportKey('raw', key);
}

/**
 * Import a key from ArrayBuffer
 */
export async function importKey(keyData: ArrayBuffer): Promise<CryptoKey> {
  return await crypto.subtle.importKey(
    'raw',
    keyData,
    {
      name: ALGORITHM,
      length: KEY_LENGTH,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

/**
 * Generate a random IV for encryption
 */
export function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

// Prefix marker for encrypted data
const ENCRYPTION_PREFIX = '🔒';

/**
 * Encrypt data using AES-GCM
 * Returns base64-encoded string with prefix: 🔒iv:encryptedData
 */
export async function encrypt(
  data: string,
  key: CryptoKey
): Promise<string> {
  const iv = generateIV();
  const encodedData = new TextEncoder().encode(data);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: TAG_LENGTH,
    },
    key,
    encodedData
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  const base64 = btoa(String.fromCharCode(...combined));
  return ENCRYPTION_PREFIX + base64;
}

/**
 * Decrypt data using AES-GCM
 * Expects base64-encoded string with prefix: 🔒iv:encryptedData
 */
export async function decrypt(
  encryptedData: string,
  key: CryptoKey
): Promise<string> {
  try {
    let data = encryptedData;
    if (data.startsWith(ENCRYPTION_PREFIX)) {
      data = data.slice(ENCRYPTION_PREFIX.length);
    }

    const combined = Uint8Array.from(
      atob(data),
      (c) => c.charCodeAt(0)
    );

    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH,
      },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Check if a string is encrypted (starts with encryption marker)
 */
export function isEncrypted(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith(ENCRYPTION_PREFIX);
}

// Re-export CryptoKey type for convenience
export type { CryptoKey };
