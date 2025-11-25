<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let mapId: string;
  export let accessToken: string | null = null;
  export let isPrivate: boolean = false;

  let copied = false;
  let showShare = false;

  function getShareUrl(): string {
    const url = new URL(window.location.href);
    url.searchParams.set('map', mapId);
    if (isPrivate && accessToken) {
      url.searchParams.set('token', accessToken);
    }
    return url.toString();
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  }
</script>

<div class="share-controls">
  <button class="share-btn" on:click={() => showShare = !showShare}>
    <span>🔗</span>
    Share Map
  </button>

  {#if showShare}
    <div class="share-panel">
      <div class="share-header">
        <h3>Share Map</h3>
        <button class="close-btn" on:click={() => showShare = false}>×</button>
      </div>
      
      <div class="share-content">
        <label>Map Link</label>
        <div class="link-input-group">
          <input type="text" readonly value={getShareUrl()} id="share-link" />
          <button class="copy-btn" on:click={copyLink}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        
        {#if isPrivate}
          <p class="private-note">
            ⚠️ This is a private map. Share the link with the access token included.
          </p>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .share-controls {
    position: relative;
  }

  .share-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    touch-action: manipulation; /* Prevent double-tap zoom */
    min-height: 44px; /* Minimum touch target size */
  }

  .share-btn:hover {
    background: #357abd;
  }

  .share-panel {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 8px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 400px;
    max-width: calc(100vw - 32px);
    z-index: 200;
  }

  @media (max-width: 480px) {
    .share-btn {
      padding: 8px 12px;
      font-size: 13px;
    }

    .share-panel {
      min-width: auto;
      width: calc(100vw - 32px);
      left: auto;
      right: 0;
      max-width: 320px;
    }

    .share-header {
      padding: 12px;
    }

    .share-header h3 {
      font-size: 16px;
    }

    .share-content {
      padding: 12px;
    }

    .link-input-group {
      flex-direction: column;
      gap: 6px;
    }

    .link-input-group input {
      font-size: 12px;
    }

    .copy-btn {
      width: 100%;
      padding: 10px;
    }
  }

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

  .close-btn {
    background: none;
    border: none;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: #000;
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

  .private-note {
    margin-top: 12px;
    padding: 8px;
    background: #fff3cd;
    border-radius: 4px;
    font-size: 12px;
    color: #856404;
  }
</style>

