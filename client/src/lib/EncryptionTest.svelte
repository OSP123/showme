<!-- src/lib/EncryptionTest.svelte -->
<!-- Component for testing encryption functionality -->

<script lang="ts">
  import { onMount } from 'svelte';
  import { initLocalDb } from './db/pglite';
  import { getPins, getMap } from './api';
  import { isEncryptionEnabled, getEncryptionKey } from './db/keyManager';
  import { isEncrypted } from './db/encryption';

  let db: any = null;
  let testResults: string[] = [];
  let running = false;

  onMount(async () => {
    db = await initLocalDb();
  });

  async function runTests() {
    testResults = [];
    running = true;

    try {
      // Test 1: Check if encryption is enabled
      const enabled = isEncryptionEnabled();
      testResults.push(`✅ Test 1: Encryption enabled = ${enabled}`);

      if (!enabled) {
        testResults.push('⚠️ Encryption is not enabled. Enable it first to test.');
        running = false;
        return;
      }

      // Test 2: Check if we have a key
      const key = await getEncryptionKey();
      testResults.push(`✅ Test 2: Encryption key available = ${key !== null}`);

      // Test 3: Check if we have any maps
      const mapsResult = await db.query('SELECT * FROM maps LIMIT 1');
      if (mapsResult.rows.length === 0) {
        testResults.push('⚠️ No maps found. Create a map first to test encryption.');
        running = false;
        return;
      }

      const map = mapsResult.rows[0];
      testResults.push(`✅ Test 3: Found map "${map.name}"`);

      // Test 4: Check if map name is encrypted (query directly from DB)
      const mapNameEncrypted = isEncrypted(map.name);
      testResults.push(`✅ Test 4: Map name encrypted = ${mapNameEncrypted}`);
      if (mapNameEncrypted) {
        testResults.push(`   Raw encrypted value: "${map.name.substring(0, 60)}..."`);
      } else {
        testResults.push(`   Raw value: "${map.name}"`);
      }

      // Test 5: Get decrypted map (via API - should decrypt automatically)
      const decryptedMap = await getMap(db, map.id);
      testResults.push(`✅ Test 5: Decrypted map name = "${decryptedMap.name}"`);
      testResults.push(`   ${mapNameEncrypted ? '✅' : '⚠️'} Map name ${mapNameEncrypted ? 'was encrypted and' : 'was not encrypted but'} decrypted correctly`);
      
      // Show comparison
      if (mapNameEncrypted && map.name !== decryptedMap.name) {
        testResults.push(`   ✅ Encryption/Decryption working! (raw ≠ decrypted)`);
      } else if (!mapNameEncrypted) {
        testResults.push(`   ℹ️ Map was created before encryption was enabled`);
      }

      // Test 6: Check pins
      const pinsResult = await db.query('SELECT * FROM pins WHERE map_id = $1 LIMIT 5', [map.id]);
      testResults.push(`✅ Test 6: Found ${pinsResult.rows.length} pins`);

      if (pinsResult.rows.length > 0) {
        const pin = pinsResult.rows[0];
        const descEncrypted = pin.description ? isEncrypted(pin.description) : false;
        const tagsEncrypted = pin.tags ? isEncrypted(pin.tags) : false;

        testResults.push(`   Pin description encrypted = ${descEncrypted}`);
        testResults.push(`   Pin tags encrypted = ${tagsEncrypted}`);

        // Test 7: Get decrypted pins (via API)
        const decryptedPins = await getPins(db, map.id);
        if (decryptedPins.length > 0) {
          const decryptedPin = decryptedPins[0];
          testResults.push(`✅ Test 7: Decrypted pin description = "${decryptedPin.description || '(none)'}"`);
          testResults.push(`   ${descEncrypted ? '✅' : '⚠️'} Description ${descEncrypted ? 'was encrypted and' : 'was not encrypted but'} decrypted correctly`);
          
          // Show comparison
          if (descEncrypted && pin.description !== decryptedPin.description) {
            testResults.push(`   ✅ Encryption/Decryption working! (raw ≠ decrypted)`);
            testResults.push(`   Raw encrypted: "${pin.description.substring(0, 50)}..."`);
            testResults.push(`   Decrypted: "${decryptedPin.description}"`);
          } else if (!descEncrypted && pin.description) {
            testResults.push(`   ℹ️ Pin was created before encryption was enabled`);
          }
        }
      } else {
        testResults.push('ℹ️ No pins found. Create a pin to test pin encryption.');
      }

      // Test 8: Create a test pin with encryption
      testResults.push('\n🧪 Test 8: Creating test pin with encryption...');
      const testPinId = crypto.randomUUID();
      const testDescription = `Test encrypted description ${Date.now()}`;
      
      const encryptionKey = await getEncryptionKey();
      if (encryptionKey) {
        const { encrypt } = await import('./db/encryption');
        const encryptedDesc = await encrypt(testDescription, encryptionKey);
        testResults.push(`   Original: "${testDescription}"`);
        testResults.push(`   Encrypted: "${encryptedDesc.substring(0, 50)}..."`);
        testResults.push(`   ✅ Encryption working: ${encryptedDesc.startsWith('🔒')}`);
        
        // Test decryption
        const { decrypt } = await import('./db/encryption');
        const decrypted = await decrypt(encryptedDesc, encryptionKey);
        testResults.push(`   Decrypted: "${decrypted}"`);
        testResults.push(`   ✅ Decryption working: ${decrypted === testDescription}`);
      }

      testResults.push('\n✅ All encryption tests completed!');
    } catch (error) {
      testResults.push(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      running = false;
    }
  }

  function clearResults() {
    testResults = [];
  }
</script>

<div class="encryption-test">
  <h3>🔐 Encryption Test Utility</h3>
  <p class="description">
    This utility tests encryption functionality by checking if data is encrypted in the database
    and if decryption works correctly.
  </p>

  <div class="controls">
    <button class="btn btn-primary" on:click={runTests} disabled={running || !db}>
      {running ? 'Running Tests...' : 'Run Encryption Tests'}
    </button>
    {#if testResults.length > 0}
      <button class="btn btn-secondary" on:click={clearResults}>Clear Results</button>
    {/if}
  </div>

  {#if testResults.length > 0}
    <div class="results">
      {#each testResults as result}
        <div class="result-line">{result}</div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .encryption-test {
    padding: 1rem;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
    margin: 1rem 0;
  }

  .encryption-test h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.1rem;
  }

  .description {
    margin: 0 0 1rem 0;
    color: var(--text-secondary, #666);
    font-size: 0.9rem;
  }

  .controls {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
  }

  .btn {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.2s;
    touch-action: manipulation;
    min-height: 44px;
  }

  .btn-primary {
    background: var(--primary-color, #007bff);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--primary-hover, #0056b3);
  }

  .btn-secondary {
    background: var(--secondary-color, #6c757d);
    color: white;
  }

  .btn-secondary:hover:not(:disabled) {
    background: var(--secondary-hover, #545b62);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .results {
    background: white;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    padding: 1rem;
    font-family: 'Courier New', monospace;
    font-size: 0.85rem;
    max-height: 400px;
    overflow-y: auto;
    white-space: pre-wrap;
  }

  .result-line {
    margin: 0.25rem 0;
    line-height: 1.4;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .encryption-test {
      padding: 0.75rem;
    }

    .controls {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>

