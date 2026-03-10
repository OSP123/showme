<!-- src/lib/EncryptionSetup.svelte -->
<!-- Per-map E2E encryption setup -->

<script lang="ts">
  import { onMount } from 'svelte';
  import { _ } from 'svelte-i18n';
  import ConfirmModal from './ConfirmModal.svelte';
  import {
    isMapEncrypted,
    clearMapEncryption,
  } from './db/keyManager';
  import { enableMapEncryption } from './api';

  export let mapId: string = '';
  export let db: any = null;
  export let encryptionSalt: string | null = null;

  let encrypted = false;
  let showSetup = false;
  let passphrase = '';
  let confirmPassphrase = '';
  let error = '';
  let success = '';
  let loading = false;
  let showDisableConfirm = false;

  $: if (mapId) {
    encrypted = isMapEncrypted(mapId);
  }

  async function handleEnable() {
    error = '';
    success = '';

    if (!passphrase || passphrase.length < 8) {
      error = $_('encryption.passphraseLength');
      return;
    }

    if (passphrase !== confirmPassphrase) {
      error = $_('encryption.passphraseMismatch');
      return;
    }

    loading = true;

    try {
      if (!db) throw new Error('Database not available');
      await enableMapEncryption(db, mapId, passphrase);
      encrypted = true;
      success = $_('encryption.enabledWithPassphrase');
      showSetup = false;
      passphrase = '';
      confirmPassphrase = '';
    } catch (err) {
      error = err instanceof Error ? err.message : $_('encryption.failedEnable');
    } finally {
      loading = false;
    }
  }

  function disableEncryption() {
    showDisableConfirm = true;
  }

  function confirmDisableEncryption() {
    clearMapEncryption(mapId);
    encrypted = false;
    success = $_('encryption.encryptionDisabled');
    showDisableConfirm = false;
  }
</script>

<div class="encryption-setup">
  <div class="status">
    <div class="status-row">
      <span class="label">{$_('encryption.label')}</span>
      <span class="value" class:enabled={encrypted}>
        {encrypted ? `🔒 ${$_('encryption.enabled')}` : `🔓 ${$_('encryption.disabled')}`}
      </span>
    </div>
    {#if encrypted}
      <div class="status-row">
        <span class="label">{$_('encryption.keyTypeLabel')}</span>
        <span class="value">🔑 {$_('encryption.passphraseBased')}</span>
      </div>
    {/if}
    {#if encryptionSalt && !encrypted}
      <div class="status-row hint">
        <span>{$_('encryption.needsPassphrase')}</span>
      </div>
    {/if}
  </div>

  {#if !encrypted}
    <button
      class="btn btn-primary"
      on:click={() => { showSetup = !showSetup; error = ''; success = ''; }}
      class:active={showSetup}
    >
      {showSetup ? $_('common.cancel') : encryptionSalt ? $_('encryption.unlockButton') : $_('encryption.enableButton')}
    </button>
  {:else}
    <div class="actions">
      <button class="btn btn-danger" on:click={disableEncryption}>
        {$_('encryption.disableButton')}
      </button>
    </div>
  {/if}

  {#if showSetup}
    <div class="setup-form">
      <h3>{encryptionSalt ? $_('encryption.unlockButton') : $_('encryption.enableButton')}</h3>

      <div class="form-group">
        <label for="passphrase">{$_('encryption.passphrase')}</label>
        <input
          id="passphrase"
          type="password"
          bind:value={passphrase}
          placeholder={$_('encryption.enterPassphrase')}
          disabled={loading}
        />
        <small>{$_('encryption.passphraseHintE2E')}</small>
      </div>

      {#if !encryptionSalt}
        <div class="form-group">
          <label for="confirm-passphrase">{$_('encryption.confirmPassphrase')}</label>
          <input
            id="confirm-passphrase"
            type="password"
            bind:value={confirmPassphrase}
            placeholder={$_('encryption.confirmPassphrasePlaceholder')}
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
        on:click={handleEnable}
        disabled={loading || !passphrase || (!encryptionSalt && passphrase !== confirmPassphrase)}
      >
        {loading ? $_('encryption.processing') : encryptionSalt ? $_('encryption.unlockButton') : $_('encryption.enableButton')}
      </button>
    </div>
  {/if}
</div>

<ConfirmModal
  open={showDisableConfirm}
  title={$_('encryption.disableButton')}
  message={$_('encryption.disableWarning')}
  confirmLabel={$_('encryption.disableButton')}
  variant="danger"
  on:confirm={confirmDisableEncryption}
  on:cancel={() => showDisableConfirm = false}
/>

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

  .status-row.hint {
    color: var(--warning-color, #e67e22);
    font-size: 0.85rem;
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
    min-height: 44px;
  }

  .btn-primary {
    background: var(--primary-color, #007bff);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: var(--primary-hover, #0056b3);
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
