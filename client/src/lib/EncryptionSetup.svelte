<!-- src/lib/EncryptionSetup.svelte -->
<!-- Component for setting up database encryption -->

<script lang="ts">
  import { onMount } from 'svelte';
  import {
    initializeEncryptionKey,
    reinitializeKeyFromPassphrase,
    isEncryptionEnabled,
    getKeyType,
    clearEncryptionKey,
  } from './db/keyManager';

  let encryptionEnabled = false;
  let keyType: 'generated' | 'passphrase' | null = null;
  let showSetup = false;
  let passphrase = '';
  let confirmPassphrase = '';
  let error = '';
  let success = '';
  let loading = false;

  onMount(async () => {
    encryptionEnabled = isEncryptionEnabled();
    keyType = getKeyType();
  });

  async function enableEncryption() {
    error = '';
    success = '';
    loading = true;

    try {
      if (passphrase) {
        if (passphrase !== confirmPassphrase) {
          error = 'Passphrases do not match';
          loading = false;
          return;
        }
        if (passphrase.length < 8) {
          error = 'Passphrase must be at least 8 characters';
          loading = false;
          return;
        }
        // Initialize with passphrase
        await initializeEncryptionKey(passphrase);
        success = 'Encryption enabled with passphrase';
      } else {
        // Generate key automatically
        await initializeEncryptionKey();
        success = 'Encryption enabled with auto-generated key';
      }

      encryptionEnabled = true;
      keyType = getKeyType();
      showSetup = false;
      passphrase = '';
      confirmPassphrase = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to enable encryption';
    } finally {
      loading = false;
    }
  }

  async function changePassphrase() {
    error = '';
    success = '';
    loading = true;

    try {
      if (!passphrase || passphrase !== confirmPassphrase) {
        error = 'Passphrases do not match';
        loading = false;
        return;
      }
      if (passphrase.length < 8) {
        error = 'Passphrase must be at least 8 characters';
        loading = false;
        return;
      }

      await reinitializeKeyFromPassphrase(passphrase);
      success = 'Passphrase changed successfully';
      showSetup = false;
      passphrase = '';
      confirmPassphrase = '';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to change passphrase';
    } finally {
      loading = false;
    }
  }

  function disableEncryption() {
    if (!confirm('⚠️ Warning: Disabling encryption will make encrypted data unreadable. Are you sure?')) {
      return;
    }
    clearEncryptionKey();
    encryptionEnabled = false;
    keyType = null;
    success = 'Encryption disabled';
  }
</script>

<div class="encryption-setup">
  <div class="status">
    <div class="status-row">
      <span class="label">Encryption:</span>
      <span class="value" class:enabled={encryptionEnabled}>
        {encryptionEnabled ? '🔒 Enabled' : '🔓 Disabled'}
      </span>
    </div>
    {#if encryptionEnabled && keyType}
      <div class="status-row">
        <span class="label">Key Type:</span>
        <span class="value">
          {keyType === 'passphrase' ? '🔑 Passphrase-based' : '🎲 Auto-generated'}
        </span>
      </div>
    {/if}
  </div>

  {#if !encryptionEnabled}
    <button
      class="btn btn-primary"
      on:click={() => (showSetup = !showSetup)}
      class:active={showSetup}
    >
      {showSetup ? 'Cancel' : 'Enable Encryption'}
    </button>
  {:else}
    <div class="actions">
      <button
        class="btn btn-secondary"
        on:click={() => {
          showSetup = !showSetup;
          passphrase = '';
          confirmPassphrase = '';
          error = '';
          success = '';
        }}
      >
        {showSetup ? 'Cancel' : keyType === 'passphrase' ? 'Change Passphrase' : 'Set Passphrase'}
      </button>
      <button class="btn btn-danger" on:click={disableEncryption}>
        Disable Encryption
      </button>
    </div>
  {/if}

  {#if showSetup}
    <div class="setup-form">
      <h3>{encryptionEnabled ? 'Change Passphrase' : 'Enable Encryption'}</h3>
      
      <div class="form-group">
        <label for="passphrase">
          {encryptionEnabled ? 'New Passphrase' : 'Passphrase (optional)'}
        </label>
        <input
          id="passphrase"
          type="password"
          bind:value={passphrase}
          placeholder={encryptionEnabled ? 'Enter new passphrase' : 'Leave empty for auto-generated key'}
          disabled={loading}
        />
        <small>
          {encryptionEnabled
            ? 'Enter a new passphrase to change the encryption key'
            : 'Leave empty to auto-generate a key, or enter a passphrase for better security'}
        </small>
      </div>

      {#if passphrase || !encryptionEnabled}
        <div class="form-group">
          <label for="confirm-passphrase">Confirm Passphrase</label>
          <input
            id="confirm-passphrase"
            type="password"
            bind:value={confirmPassphrase}
            placeholder="Confirm passphrase"
            disabled={loading}
          />
        </div>
      {/if}

      {#if error}
        <div class="error">{error}</div>
      {/if}

      {#if success}
        <div class="success">{success}</div>
      {/if}

      <button
        class="btn btn-primary"
        on:click={encryptionEnabled ? changePassphrase : enableEncryption}
        disabled={loading || (passphrase && passphrase !== confirmPassphrase)}
      >
        {loading ? 'Processing...' : encryptionEnabled ? 'Change Passphrase' : 'Enable Encryption'}
      </button>
    </div>
  {/if}
</div>

<style>
  .encryption-setup {
    padding: 1rem;
    background: var(--bg-secondary, #f5f5f5);
    border-radius: 8px;
    margin: 1rem 0;
  }

  .status {
    margin-bottom: 1rem;
  }

  .status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color, #ddd);
  }

  .status-row:last-child {
    border-bottom: none;
  }

  .label {
    font-weight: 500;
    color: var(--text-secondary, #666);
  }

  .value {
    font-weight: 600;
    color: var(--text-primary, #333);
  }

  .value.enabled {
    color: var(--success-color, #28a745);
  }

  .actions {
    display: flex;
    gap: 0.5rem;
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
    min-height: 44px; /* Mobile-friendly touch target */
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

  .btn-danger {
    background: var(--danger-color, #dc3545);
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: var(--danger-hover, #c82333);
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .setup-form {
    margin-top: 1rem;
    padding: 1rem;
    background: white;
    border-radius: 4px;
    border: 1px solid var(--border-color, #ddd);
  }

  .setup-form h3 {
    margin: 0 0 1rem 0;
    font-size: 1.1rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.25rem;
    font-weight: 500;
    font-size: 0.9rem;
  }

  .form-group input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid var(--border-color, #ddd);
    border-radius: 4px;
    font-size: 0.9rem;
    box-sizing: border-box;
  }

  .form-group small {
    display: block;
    margin-top: 0.25rem;
    color: var(--text-secondary, #666);
    font-size: 0.85rem;
  }

  .error {
    padding: 0.5rem;
    background: #fee;
    color: #c33;
    border-radius: 4px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  .success {
    padding: 0.5rem;
    background: #efe;
    color: #3c3;
    border-radius: 4px;
    margin-bottom: 1rem;
    font-size: 0.9rem;
  }

  /* Mobile responsive */
  @media (max-width: 768px) {
    .encryption-setup {
      padding: 0.75rem;
    }

    .actions {
      flex-direction: column;
    }

    .btn {
      width: 100%;
    }
  }
</style>

