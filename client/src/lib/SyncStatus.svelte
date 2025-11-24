<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let db: any = null;

  let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let syncStatus: 'syncing' | 'synced' | 'error' | 'offline' = 'offline';

  function updateOnlineStatus() {
    isOnline = navigator.onLine;
    if (!isOnline) {
      syncStatus = 'offline';
    }
  }

  onMount(() => {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();
  });

  onDestroy(() => {
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);
  });

  // Monitor database changes to infer sync status
  $: if (db && isOnline) {
    // If we have a database and we're online, assume syncing
    // In a real implementation, you'd listen to ElectricSQL sync events
    syncStatus = 'syncing';
    
    // Simulate synced state after a delay (replace with actual sync event listener)
    setTimeout(() => {
      if (isOnline) {
        syncStatus = 'synced';
      }
    }, 1000);
  } else if (!isOnline) {
    syncStatus = 'offline';
  }
</script>

<div class="sync-status" class:online={isOnline && syncStatus === 'synced'} class:syncing={syncStatus === 'syncing'} class:offline={syncStatus === 'offline'}>
  <span class="status-icon">
    {#if syncStatus === 'synced'}
      ✓
    {:else if syncStatus === 'syncing'}
      ⟳
    {:else}
      ⚠
    {/if}
  </span>
  <span class="status-text">
    {#if syncStatus === 'synced'}
      Synced
    {:else if syncStatus === 'syncing'}
      Syncing...
    {:else}
      Offline
    {/if}
  </span>
</div>

<style>
  .sync-status {
    position: fixed;
    top: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border-radius: 20px;
    font-size: 12px;
    z-index: 100;
    backdrop-filter: blur(10px);
  }

  .sync-status.online {
    background: rgba(76, 175, 80, 0.9);
  }

  .sync-status.syncing {
    background: rgba(255, 193, 7, 0.9);
  }

  .sync-status.offline {
    background: rgba(158, 158, 158, 0.9);
  }

  .status-icon {
    font-size: 14px;
    line-height: 1;
  }

  .syncing .status-icon {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .status-text {
    font-weight: 500;
  }
</style>

