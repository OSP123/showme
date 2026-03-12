<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { _, locale } from 'svelte-i18n';
  import { SUPPORTED_LOCALES } from './i18n/index';
  export let disabled = false;
  let name = '';
  let isPrivate = false;
  let passphrase = '';
  let confirmPassphrase = '';
  let enableEncryption = false;
  const dispatch = createEventDispatcher<{
    create: { name: string; isPrivate: boolean; passphrase?: string };
    joinPrivate: void;
  }>();

  $: passphraseValid = !enableEncryption || (passphrase.length >= 8 && passphrase === confirmPassphrase);

  // PWA install prompt
  let installPrompt: any = null;
  let isInstalled = false;

  function handleBeforeInstall(e: Event) {
    e.preventDefault();
    installPrompt = e;
  }

  async function installApp() {
    if (!installPrompt) return;
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      isInstalled = true;
    }
    installPrompt = null;
  }

  onMount(() => {
    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      isInstalled = true;
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', () => { isInstalled = true; });
  });

  onDestroy(() => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }
  });

  function submit() {
    if (!name || !passphraseValid) return;
    dispatch('create', {
      name,
      isPrivate,
      passphrase: enableEncryption ? passphrase : undefined
    });
  }
</script>

<div class="controls">
  <div class="top-bar">
    <div class="language-selector">
      <span class="globe">🌐</span>
      <select bind:value={$locale}>
        {#each SUPPORTED_LOCALES as loc}
          <option value={loc.code}>{loc.name}</option>
        {/each}
      </select>
    </div>
  </div>

  <h2>{$_('createMap.title')}</h2>
  <p class="subtitle">{$_('createMap.subtitle')}</p>

  <div class="map-details">
    <div class="input-group">
      <label for="map-name">{$_('createMap.mapName')}</label>
      <input
        id="map-name"
        type="text"
        placeholder={$_('createMap.enterName')}
        bind:value={name}
        disabled={disabled}
      />
    </div>

    <label class="checkbox-label">
      <input
        type="checkbox"
        bind:checked={isPrivate}
        disabled={disabled}
      />
      <span>{$_('createMap.makePrivate')}</span>
    </label>
    {#if isPrivate}
      <p class="private-hint">{$_('createMap.privateHint')}</p>
    {/if}

    <label class="checkbox-label" style="margin-top: 12px;">
      <input
        type="checkbox"
        bind:checked={enableEncryption}
        disabled={disabled}
      />
      <span>{$_('createMap.enableEncryption')}</span>
    </label>
    {#if enableEncryption}
      <div class="encryption-fields">
        <p class="private-hint">{$_('createMap.encryptionHint')}</p>
        <div class="input-group">
          <label for="enc-pass">{$_('encryption.passphrase')}</label>
          <input
            id="enc-pass"
            type="password"
            bind:value={passphrase}
            placeholder={$_('encryption.enterPassphrase')}
            disabled={disabled}
          />
        </div>
        <div class="input-group">
          <label for="enc-confirm">{$_('encryption.confirmPassphrase')}</label>
          <input
            id="enc-confirm"
            type="password"
            bind:value={confirmPassphrase}
            placeholder={$_('encryption.confirmPassphrasePlaceholder')}
            disabled={disabled}
          />
        </div>
        {#if passphrase && passphrase.length < 8}
          <p class="error-hint">{$_('encryption.passphraseLength')}</p>
        {/if}
        {#if passphrase && confirmPassphrase && passphrase !== confirmPassphrase}
          <p class="error-hint">{$_('encryption.passphraseMismatch')}</p>
        {/if}
      </div>
    {/if}
  </div>

  <button
    class="create-btn"
    on:click={submit}
    disabled={!name || disabled || !passphraseValid}
  >
    {#if disabled}{$_('createMap.creating')}{:else}{$_('createMap.createButton')}{/if}
  </button>

  <div class="divider">
    <span>{$_('createMap.or')}</span>
  </div>

  <button
    class="join-btn"
    on:click={() => dispatch('joinPrivate')}
    disabled={disabled}
  >
    {$_('createMap.joinPrivate')}
  </button>

  {#if installPrompt && !isInstalled}
    <div class="install-banner">
      <button class="install-btn" on:click={installApp}>
        <span class="install-icon">📲</span>
        {$_('install.addToDevice')}
      </button>
      <p class="install-hint">{$_('install.hint')}</p>
    </div>
  {/if}
</div>

<style>
  .controls {
    background: white;
    border-radius: 12px;
    padding: 32px;
    max-width: 600px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .top-bar {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 16px;
  }

  .language-selector {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .language-selector .globe {
    font-size: 18px;
  }

  .language-selector select {
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    background: white;
    cursor: pointer;
  }

  h2 {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
    color: #333;
  }

  .subtitle {
    margin: 0 0 24px 0;
    font-size: 14px;
    color: #888;
    line-height: 1.4;
  }

  .map-details {
    margin-bottom: 24px;
  }

  .input-group {
    margin-bottom: 16px;
  }

  .input-group label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }

  .input-group input[type="text"] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    box-sizing: border-box;
  }

  .input-group input[type="text"]:focus {
    outline: none;
    border-color: #4a90e2;
  }

  .input-group input[type="text"]:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #666;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    cursor: pointer;
  }

  .private-hint {
    margin: 8px 0 0 0;
    font-size: 12px;
    color: #888;
    line-height: 1.4;
  }

  .encryption-fields {
    margin-top: 12px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 1px solid #e9ecef;
  }

  .encryption-fields .input-group {
    margin-bottom: 10px;
  }

  .error-hint {
    margin: 4px 0 0 0;
    font-size: 12px;
    color: #dc3545;
    line-height: 1.4;
  }

  .create-btn {
    width: 100%;
    padding: 12px 24px;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .create-btn:hover:not(:disabled) {
    background: #357abd;
  }

  .create-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .divider {
    display: flex;
    align-items: center;
    margin: 20px 0;
    color: #999;
    font-size: 13px;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid #ddd;
  }

  .divider span {
    padding: 0 12px;
  }

  .join-btn {
    width: 100%;
    padding: 12px 24px;
    background: white;
    color: #4a90e2;
    border: 2px solid #4a90e2;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .join-btn:hover:not(:disabled) {
    background: #f0f7ff;
  }

  .join-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .install-banner {
    margin-top: 24px;
    padding-top: 20px;
    border-top: 1px solid #eee;
    text-align: center;
  }

  .install-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #2d8a4e;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .install-btn:hover {
    background: #236b3d;
  }

  .install-icon {
    font-size: 18px;
  }

  .install-hint {
    margin: 8px 0 0 0;
    font-size: 12px;
    color: #888;
    line-height: 1.4;
  }

  /* Mobile optimizations */
  @media (max-width: 480px) {
    .controls {
      padding: 20px 16px;
      max-width: calc(100vw - 32px);
      margin: 16px;
    }

    h2 {
      font-size: 24px;
    }

    .input-group input[type="text"] {
      padding: 12px;
      font-size: 16px; /* Prevent zoom on iOS */
    }

    .create-btn {
      padding: 14px;
      font-size: 16px;
    }
  }
</style>
