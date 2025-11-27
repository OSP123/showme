# Encryption Testing Guide

This guide explains how to test and verify that database encryption is working correctly.

## Quick Test (Using UI)

1. **Enable Encryption:**
   - Open the app and navigate to a map
   - Click the 🔒 (lock) button in the map controls
   - Click "Enable Encryption"
   - Choose either:
     - **Auto-generated key** (easiest, no passphrase needed)
     - **Passphrase-based** (more secure, requires a passphrase)

2. **Run Encryption Tests:**
   - In the encryption panel, scroll down to the "🔐 Encryption Test Utility"
   - Click "Run Encryption Tests"
   - Review the test results:
     - ✅ Green checkmarks = working correctly
     - ⚠️ Yellow warnings = expected (e.g., no data to test)
     - ❌ Red X = error (encryption not working)

## Manual Testing (Browser Console)

You can also test encryption directly in the browser console:

### 1. Check if Encryption is Enabled

```javascript
// Import encryption utilities
const { isEncryptionEnabled, getEncryptionKey } = await import('/src/lib/db/keyManager.ts');

// Check status
console.log('Encryption enabled:', isEncryptionEnabled());
const key = await getEncryptionKey();
console.log('Key available:', key !== null);
```

### 2. Inspect Raw Database Data (Using SQL Queries)

**Important:** PGlite stores data in IndexedDB as binary files, not traditional tables. You must use SQL queries to inspect the data.

```javascript
// Get the database
const { initLocalDb } = await import('/src/lib/db/pglite.ts');
const db = await initLocalDb();

// Check if data is encrypted (should see 🔒 prefix)
const maps = await db.query('SELECT id, name FROM maps LIMIT 1');
if (maps.rows.length > 0) {
  const map = maps.rows[0];
  console.log('Raw map name:', map.name);
  console.log('Is encrypted:', map.name?.startsWith('🔒'));
  // If encrypted, you'll see: "🔒[long base64 string]"
  // If not encrypted, you'll see readable text like "My Map"
}

// Check pins
const pins = await db.query('SELECT id, description, tags FROM pins LIMIT 1');
if (pins.rows.length > 0) {
  const pin = pins.rows[0];
  console.log('Raw description:', pin.description);
  console.log('Description encrypted:', pin.description?.startsWith('🔒'));
  console.log('Raw tags:', pin.tags);
  console.log('Tags encrypted:', pin.tags?.startsWith('🔒'));
}
```

### 3. Verify Decryption Works

```javascript
// Get decrypted data via API (should work automatically)
const { getMap, getPins } = await import('/src/lib/api.ts');
const db = await initLocalDb();

// Get a map ID
const maps = await db.query('SELECT id FROM maps LIMIT 1');
if (maps.rows.length > 0) {
  const mapId = maps.rows[0].id;
  
  // Get decrypted map
  const decryptedMap = await getMap(db, mapId);
  console.log('Decrypted map name:', decryptedMap.name);
  console.log('✅ Decryption working if name is readable (not starting with 🔒)');
  
  // Get decrypted pins
  const decryptedPins = await getPins(db, mapId);
  if (decryptedPins.length > 0) {
    console.log('Decrypted pin description:', decryptedPins[0].description);
    console.log('✅ Decryption working if description is readable');
  }
}
```

### 4. Test Encryption/Decryption Directly

```javascript
// Import encryption functions
const { generateKey, encrypt, decrypt, isEncrypted } = await import('/src/lib/db/encryption.ts');

// Generate a test key
const key = await generateKey();

// Test encryption
const plaintext = 'This is a test message';
const encrypted = await encrypt(plaintext, key);
console.log('Original:', plaintext);
console.log('Encrypted:', encrypted);
console.log('Has encryption marker:', encrypted.startsWith('🔒'));

// Test decryption
const decrypted = await decrypt(encrypted, key);
console.log('Decrypted:', decrypted);
console.log('✅ Encryption working:', decrypted === plaintext);
```

## Visual Verification (Using SQL Queries)

**Note:** PGlite stores data in IndexedDB as binary files, not traditional tables. You can't inspect the data directly in IndexedDB. Instead, use SQL queries via the browser console.

### Method 1: Using the Test Utility (Easiest)
1. Enable encryption in the app
2. Click the 🔒 button → scroll to "Encryption Test Utility"
3. Click "Run Encryption Tests"
4. Review the results - it will show you encrypted vs decrypted values

### Method 2: Using Browser Console

Open the browser console and run:

```javascript
// Import the test utility
const { testEncryption } = await import('/src/lib/testEncryption.ts');
await testEncryption();
```

This will:
- Check if encryption is enabled
- Query the database directly using SQL
- Show you raw encrypted values vs decrypted values
- Test encryption/decryption functions

### Method 3: Manual SQL Queries

```javascript
// Get database
const { initLocalDb } = await import('/src/lib/db/pglite.ts');
const db = await initLocalDb();

// Check if data is encrypted (query directly)
const maps = await db.query('SELECT id, name FROM maps LIMIT 1');
if (maps.rows.length > 0) {
  const map = maps.rows[0];
  console.log('Map name:', map.name);
  console.log('Is encrypted:', map.name?.startsWith('🔒'));
  
  // If encrypted, you'll see: "🔒[base64 gibberish]"
  // If not encrypted, you'll see readable text
}

// Check pins
const pins = await db.query('SELECT id, description, tags FROM pins LIMIT 1');
if (pins.rows.length > 0) {
  const pin = pins.rows[0];
  console.log('Description:', pin.description);
  console.log('Is encrypted:', pin.description?.startsWith('🔒'));
}
```

## Testing Checklist

- [ ] Encryption can be enabled via UI
- [ ] Encryption status shows as "Enabled" in UI
- [ ] New data (maps/pins) created after enabling encryption is encrypted in IndexedDB
- [ ] Encrypted data appears with 🔒 prefix in raw database
- [ ] Encrypted data is automatically decrypted when viewed in UI
- [ ] Existing unencrypted data remains readable (backward compatibility)
- [ ] Encryption test utility shows all tests passing
- [ ] Disabling encryption shows warning (data becomes unreadable)

## Troubleshooting

### Encryption Not Working?
1. Check browser console for errors
2. Verify encryption is enabled: `isEncryptionEnabled()` should return `true`
3. Check if key exists: `getEncryptionKey()` should return a `CryptoKey` object
4. Ensure you're creating NEW data after enabling encryption (existing data won't be encrypted retroactively)

### Data Not Decrypting?
1. Check if encryption key is still available
2. Verify the key hasn't been cleared from localStorage
3. Check browser console for decryption errors
4. Ensure you're using the API functions (`getMap`, `getPins`) which handle decryption automatically

### Test Utility Not Working?
1. Make sure you have at least one map created
2. Ensure encryption is enabled before running tests
3. Check browser console for any errors
4. Try refreshing the page and running tests again

## Security Notes

- **Encryption keys are stored in localStorage** - This is convenient but means:
  - Keys are accessible to any JavaScript running on the same origin
  - Keys are lost if localStorage is cleared
  - For production, consider more secure key storage (e.g., hardware security modules)
  
- **Passphrase-based keys are more secure** than auto-generated keys because:
  - They can be re-derived if the user remembers the passphrase
  - They're not stored directly (only the salt is stored)
  
- **Field-level encryption** means:
  - Only sensitive fields are encrypted (description, tags, photo_urls, name, access_token)
  - Coordinates (lat/lng) remain unencrypted for performance
  - This is a trade-off between security and performance

