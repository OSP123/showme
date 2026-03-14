<script lang="ts">
  import { _ } from 'svelte-i18n';
  export let mapId: string;
  export let mapSlug: string | null = null;
  export let accessToken: string | null = null;
  export let accessCode: string | null = null;
  export let isPrivate: boolean = false;
  export let isEncrypted: boolean = false;

  export let open = false;

  function getShareUrl() {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    // Use slug if available for friendlier URLs
    url.searchParams.set('map', mapSlug || mapId);
    if (accessToken) {
      url.searchParams.set('token', accessToken);
    }
    return url.toString();
  }

  let copied = false;
  function copyLink() {
    const url = getShareUrl();
    navigator.clipboard.writeText(url).then(() => {
      copied = true;
      setTimeout(() => copied = false, 2000);
    });
  }

  let codeCopied = false;
  function copyCode() {
    if (!accessCode) return;
    navigator.clipboard.writeText(accessCode).then(() => {
      codeCopied = true;
      setTimeout(() => codeCopied = false, 2000);
    });
  }
</script>

{#if open}
  <div class="share-panel">
    <div class="share-header">
      <h3>{$_('share.title')}</h3>
      <!-- Close button is handled by parent, but we keep this for desktop/fallback -->
    </div>
    
    <div class="share-content">
      <label for="share-link-input">{$_('share.mapLink')}</label>
      <div class="link-input-group">
        <input type="text" readonly value={getShareUrl()} id="share-link-input" />
        <button class="copy-btn" on:click={copyLink}>
          {copied ? `✓ ${$_('share.copied')}` : $_('share.copy')}
        </button>
      </div>
      
      {#if isPrivate && accessCode}
        <div class="access-code-section">
          <label>{$_('share.accessCode')}</label>
          <div class="access-code-display">
            <span class="access-code">{accessCode}</span>
            <button class="copy-btn" on:click={copyCode}>
              {codeCopied ? `✓ ${$_('share.copied')}` : $_('share.copyCode')}
            </button>
          </div>
          <p class="access-code-hint">{$_('share.accessCodeHint')}</p>
        </div>
      {/if}

      {#if isEncrypted}
        <p class="encryption-note">
          🔒 {$_('share.encryptionNote')}
        </p>
      {/if}

      {#if isPrivate}
        <p class="private-note">
          ⚠️ {$_('share.privateNote')}
        </p>
      {/if}
    </div>
  </div>
{/if}

<style>
  .share-panel {
    background: white;
    /* Styles handled by parent modal container if needed, or default here */
    width: 100%;
  }

  /* Mobile styles handled by global modal styles in App.svelte for positioning */
  /* We just ensure content is responsive */


  .share-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid #e0e0e0;
  }

  .share-header h3 {
    margin: 0;
    font-size: 18px;
  }

  .share-content {
    padding: 16px;
  }

  .share-content label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    font-size: 14px;
  }

  .link-input-group {
    display: flex;
    gap: 8px;
  }

  .link-input-group input {
    flex: 1;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    font-family: monospace;
  }

  .copy-btn {
    padding: 8px 16px;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    white-space: nowrap;
  }

  .copy-btn:hover {
    background: #357abd;
  }

  .access-code-section {
    margin-top: 16px;
    padding: 12px;
    background: #f0f7ff;
    border-radius: 8px;
    border: 1px solid #bdd7f5;
  }

  .access-code-section label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    font-size: 14px;
    color: #1a56db;
  }

  .access-code-display {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .access-code {
    font-size: 28px;
    font-family: monospace;
    font-weight: 700;
    letter-spacing: 6px;
    color: #1a56db;
    flex: 1;
  }

  .access-code-hint {
    margin: 8px 0 0 0;
    font-size: 12px;
    color: #555;
    font-style: italic;
  }

  .encryption-note {
    margin-top: 12px;
    padding: 8px;
    background: #e8f5e9;
    border-radius: 4px;
    font-size: 12px;
    color: #2e7d32;
  }

  .private-note {
    margin-top: 12px;
    padding: 8px;
    background: #fff3cd;
    border-radius: 4px;
    font-size: 12px;
    color: #856404;
  }
</style>

