<script lang="ts">
  export let mapId: string;
  export let accessToken: string | null = null;
  export let isPrivate: boolean = false;

  export let open = false;

  function getShareUrl() {
    if (typeof window === 'undefined') return '';
    const url = new URL(window.location.href);
    // App uses query params (App.svelte:23)
    url.searchParams.set('map', mapId);
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


</script>

{#if open}
  <div class="share-panel">
    <div class="share-header">
      <h3>Share Map</h3>
      <!-- Close button is handled by parent, but we keep this for desktop/fallback -->
    </div>
    
    <div class="share-content">
      <label for="share-link-input">Map Link</label>
      <div class="link-input-group">
        <input type="text" readonly value={getShareUrl()} id="share-link-input" />
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

  .private-note {
    margin-top: 12px;
    padding: 8px;
    background: #fff3cd;
    border-radius: 4px;
    font-size: 12px;
    color: #856404;
  }
</style>

