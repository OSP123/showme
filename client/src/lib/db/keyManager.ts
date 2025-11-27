// src/lib/db/keyManager.ts
// Key management for database encryption

import {
  generateKey,
  exportKey,
  importKey,
  deriveKeyFromPassphrase,
  generateSalt,
  type CryptoKey,
} from './encryption';

const STORAGE_KEY = 'showme_encryption_key';
const STORAGE_SALT = 'showme_encryption_salt';
const STORAGE_KEY_TYPE = 'showme_encryption_key_type';

type KeyType = 'generated' | 'passphrase';

interface StoredKeyData {
  keyData: ArrayBuffer;
  salt?: Uint8Array;
  keyType: KeyType;
}

let cachedKey: CryptoKey | null = null;
let cachedKeyType: KeyType | null = null;

/**
 * Initialize encryption key - either from passphrase or generate new one
 */
export async function initializeEncryptionKey(
  passphrase?: string
): Promise<CryptoKey> {
  // If we have a cached key, return it
  if (cachedKey) {
    return cachedKey;
  }

  // Check if we have a stored key
  const stored = getStoredKey();
  
  if (stored) {
    // Import existing key
    cachedKey = await importKey(stored.keyData);
    cachedKeyType = stored.keyType;
    return cachedKey;
  }

  // No stored key - create new one
  if (passphrase) {
    // Derive from passphrase
    const salt = generateSalt();
    cachedKey = await deriveKeyFromPassphrase(passphrase, salt);
    cachedKeyType = 'passphrase';
    
    // Store salt for future use (we'll need it to derive the same key)
    const saltBase64 = btoa(String.fromCharCode(...salt));
    localStorage.setItem(STORAGE_SALT, saltBase64);
    
    // Also store the derived key so we can use it without re-deriving
    // (The key is extractable now, so we can store it)
    const keyData = await exportKey(cachedKey);
    const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(keyData)));
    localStorage.setItem(STORAGE_KEY, keyBase64);
  } else {
    // Generate new key
    cachedKey = await generateKey();
    cachedKeyType = 'generated';
    
    // Export and store the key
    const keyData = await exportKey(cachedKey);
    const keyBase64 = btoa(String.fromCharCode(...new Uint8Array(keyData)));
    localStorage.setItem(STORAGE_KEY, keyBase64);
  }

  // Store key type
  localStorage.setItem(STORAGE_KEY_TYPE, cachedKeyType);

  return cachedKey;
}

/**
 * Get stored key from localStorage
 */
function getStoredKey(): StoredKeyData | null {
  try {
    const keyBase64 = localStorage.getItem(STORAGE_KEY);
    const saltBase64 = localStorage.getItem(STORAGE_SALT);
    const keyType = localStorage.getItem(STORAGE_KEY_TYPE) as KeyType | null;

    if (!keyBase64 || !keyType) {
      return null;
    }

    // Decode key
    const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));
    const keyData = keyBytes.buffer;

    // Decode salt if present
    let salt: Uint8Array | undefined;
    if (saltBase64) {
      salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));
    }

    return { keyData, salt, keyType };
  } catch (error) {
    console.error('Error reading stored encryption key:', error);
    return null;
  }
}

/**
 * Re-initialize key from passphrase (for changing passphrase)
 */
export async function reinitializeKeyFromPassphrase(
  passphrase: string
): Promise<CryptoKey> {
  // Clear cached key
  cachedKey = null;
  cachedKeyType = null;

  // Clear stored key
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_SALT);
  localStorage.removeItem(STORAGE_KEY_TYPE);

  // Generate new key from passphrase
  return await initializeEncryptionKey(passphrase);
}

/**
 * Get current encryption key (or null if not initialized)
 */
export async function getEncryptionKey(): Promise<CryptoKey | null> {
  if (cachedKey) {
    return cachedKey;
  }

  // Try to load from storage
  const stored = getStoredKey();
  if (stored) {
    cachedKey = await importKey(stored.keyData);
    cachedKeyType = stored.keyType;
    return cachedKey;
  }

  return null;
}

/**
 * Check if encryption is enabled
 */
export function isEncryptionEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null || 
         localStorage.getItem(STORAGE_SALT) !== null;
}

/**
 * Clear encryption key (for disabling encryption)
 * WARNING: This will make encrypted data unreadable!
 */
export function clearEncryptionKey(): void {
  cachedKey = null;
  cachedKeyType = null;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_SALT);
  localStorage.removeItem(STORAGE_KEY_TYPE);
}

/**
 * Get key type (how the key was created)
 */
export function getKeyType(): KeyType | null {
  if (cachedKeyType) {
    return cachedKeyType;
  }
  return localStorage.getItem(STORAGE_KEY_TYPE) as KeyType | null;
}

/**
 * Reset the cached key (for testing purposes)
 */
export function resetKeyCache(): void {
  cachedKey = null;
  cachedKeyType = null;
}

