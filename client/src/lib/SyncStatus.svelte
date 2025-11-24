<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { operationQueue } from './operationQueue';

  export let db: any = null;

  let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  let syncStatus: 'syncing' | 'synced' | 'error' | 'offline' = 'offline';
  let queuedOperations = 0;
  let showDetails = false;

  function updateOnlineStatus() {
    isOnline = navigator.onLine;
    if (!isOnline) {
      syncStatus = 'offline';
    } else {
      // When coming back online, try to process queue
      operationQueue.processQueue();
    }
  }

  onMount(() => {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Subscribe to queue changes
    const unsubscribe = operationQueue.subscribe((count) => {
      queuedOperations = count;
      if (count > 0 && isOnline) {
        syncStatus = 'syncing';
      } else if (count === 0 && isOnline) {
        syncStatus = 'synced';
      }
    });

    // Initial queue length
    queuedOperations = operationQueue.getQueueLength();

    // Check sync status periodically
    const statusInterval = setInterval(() => {
      if (isOnline) {
        // Try to ping the server to check connectivity
        fetch('http://localhost:3015/', { method: 'HEAD', mode: 'no-cors' })
          .then(() => {
            if (queuedOperations === 0) {
              syncStatus = 'synced';
            } else {
              syncStatus = 'syncing';
            }
          })
          .catch(() => {
            syncStatus = 'offline';
          });
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      unsubscribe();
      clearInterval(statusInterval);
    };
  });

  onDestroy(() => {
    // Cleanup handled in onMount return
  });

  function toggleDetails() {
    showDetails = !showDetails;
  }
</script>

<div class="sync-status" class:online={isOnline && syncStatus === 'synced'} class:syncing={syncStatus === 'syncing'} class:offline={syncStatus === 'offline'} class:has-queue={queuedOperations > 0}>
  <button class="status-button" on:click={toggleDetails} type="button">
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
    {#if queuedOperations > 0}
      <span class="queue-badge">{queuedOperations}</span>
    {/if}
  </button>
  
  {#if showDetails}
    <div class="status-details">
      <div class="detail-row">
        <span class="detail-label">Connection:</span>
        <span class="detail-value">{isOnline ? 'Online' : 'Offline'}</span>
      </div>
      {#if queuedOperations > 0}
        <div class="detail-row">
          <span class="detail-label">Queued:</span>
          <span class="detail-value">{queuedOperations} operation{queuedOperations !== 1 ? 's' : ''}</span>
        </div>
        <div class="detail-hint">
          Operations will sync automatically when connection is restored
        </div>
      {:else}
        <div class="detail-hint">
          All operations synced
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .sync-status {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 100;
  }

  .status-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    border-radius: 20px;
    font-size: 12px;
    cursor: pointer;
    backdrop-filter: blur(10px);
    transition: all 0.2s;
  }

  .status-button:hover {
    transform: scale(1.05);
  }

  .sync-status.online .status-button {
    background: rgba(76, 175, 80, 0.9);
  }

  .sync-status.syncing .status-button {
    background: rgba(255, 193, 7, 0.9);
  }

  .sync-status.offline .status-button {
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

  .queue-badge {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 600;
    min-width: 18px;
    text-align: center;
  }

  .status-details {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: white;
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 200px;
    font-size: 12px;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .detail-label {
    color: #666;
    font-weight: 500;
  }

  .detail-value {
    color: #333;
    font-weight: 600;
  }

  .detail-hint {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #e0e0e0;
    color: #999;
    font-size: 11px;
    line-height: 1.4;
  }
</style>

