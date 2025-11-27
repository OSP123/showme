// src/lib/testEncryption.ts
// Console utility for testing encryption
// Usage: Import this in browser console and call testEncryption()

import { initLocalDb } from './db/pglite';
import { getMap, getPins } from './api';
import { isEncryptionEnabled, getEncryptionKey } from './db/keyManager';
import { isEncrypted, encrypt, decrypt } from './db/encryption';

export async function testEncryption() {
  console.log('🔐 Starting Encryption Test...\n');

  // Test 1: Check if encryption is enabled
  const enabled = isEncryptionEnabled();
  console.log(`1️⃣ Encryption enabled: ${enabled ? '✅ YES' : '❌ NO'}`);
  
  if (!enabled) {
    console.log('\n⚠️ Encryption is not enabled. Enable it first via the UI (🔒 button).');
    return;
  }

  // Test 2: Check if we have a key
  const key = await getEncryptionKey();
  console.log(`2️⃣ Encryption key available: ${key !== null ? '✅ YES' : '❌ NO'}`);

  // Test 3: Get database
  const db = await initLocalDb();
  console.log('3️⃣ Database connected: ✅');

  // Test 4: Check maps
  console.log('\n4️⃣ Checking Maps...');
  const mapsResult = await db.query('SELECT id, name FROM maps LIMIT 1');
  
  if (mapsResult.rows.length === 0) {
    console.log('   ⚠️ No maps found. Create a map first.');
    return;
  }

  const map = mapsResult.rows[0];
  const mapNameEncrypted = isEncrypted(map.name);
  console.log(`   Map ID: ${map.id}`);
  console.log(`   Map name encrypted: ${mapNameEncrypted ? '✅ YES' : '⚠️ NO (created before encryption)'}`);
  
  if (mapNameEncrypted) {
    console.log(`   Raw encrypted value: "${map.name.substring(0, 60)}..."`);
  } else {
    console.log(`   Raw value: "${map.name}"`);
  }

  // Test 5: Get decrypted map
  console.log('\n5️⃣ Testing Decryption...');
  const decryptedMap = await getMap(db, map.id);
  console.log(`   Decrypted map name: "${decryptedMap.name}"`);
  
  if (mapNameEncrypted && map.name !== decryptedMap.name) {
    console.log('   ✅ Encryption/Decryption working! (raw ≠ decrypted)');
  } else if (!mapNameEncrypted) {
    console.log('   ℹ️ Map was created before encryption was enabled');
  }

  // Test 6: Check pins
  console.log('\n6️⃣ Checking Pins...');
  const pinsResult = await db.query(
    'SELECT id, description, tags FROM pins WHERE map_id = $1 LIMIT 3',
    [map.id]
  );
  
  console.log(`   Found ${pinsResult.rows.length} pins`);
  
  if (pinsResult.rows.length > 0) {
    for (let i = 0; i < pinsResult.rows.length; i++) {
      const pin = pinsResult.rows[i];
      const descEncrypted = pin.description ? isEncrypted(pin.description) : false;
      const tagsEncrypted = pin.tags ? isEncrypted(pin.tags) : false;
      
      console.log(`\n   Pin ${i + 1} (${pin.id.substring(0, 8)}...):`);
      console.log(`     Description encrypted: ${descEncrypted ? '✅ YES' : '⚠️ NO'}`);
      if (descEncrypted) {
        console.log(`     Raw encrypted: "${pin.description.substring(0, 50)}..."`);
      } else if (pin.description) {
        console.log(`     Raw value: "${pin.description}"`);
      }
      
      // Get decrypted version
      const decryptedPins = await getPins(db, map.id);
      const decryptedPin = decryptedPins.find(p => p.id === pin.id);
      if (decryptedPin) {
        console.log(`     Decrypted: "${decryptedPin.description || '(none)'}"`);
        if (descEncrypted && pin.description !== decryptedPin.description) {
          console.log(`     ✅ Decryption working!`);
        }
      }
    }
  } else {
    console.log('   ℹ️ No pins found. Create a pin to test pin encryption.');
  }

  // Test 7: Test encryption directly
  console.log('\n7️⃣ Testing Encryption/Decryption Functions...');
  if (key) {
    const testText = `Test message ${Date.now()}`;
    const encrypted = await encrypt(testText, key);
    const decrypted = await decrypt(encrypted, key);
    
    console.log(`   Original: "${testText}"`);
    console.log(`   Encrypted: "${encrypted.substring(0, 60)}..."`);
    console.log(`   Decrypted: "${decrypted}"`);
    console.log(`   Match: ${testText === decrypted ? '✅ YES' : '❌ NO'}`);
    console.log(`   Has encryption marker: ${encrypted.startsWith('🔒') ? '✅ YES' : '❌ NO'}`);
  }

  console.log('\n✅ Encryption test complete!');
  console.log('\n💡 Tips:');
  console.log('   - Encrypted data should start with 🔒');
  console.log('   - Raw database values should be unreadable (base64 gibberish)');
  console.log('   - Decrypted values should be readable text');
  console.log('   - New data created after enabling encryption will be encrypted');
  console.log('   - Old data created before encryption remains unencrypted (backward compatible)');
}

// Make it available globally for easy console access
if (typeof window !== 'undefined') {
  (window as any).testEncryption = testEncryption;
}

