<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { estimateTileCount, prefetchTiles, getOfflineCacheStats } from './tileCache';
  import type { TileBounds } from './tileCache';
  import type { Map as GLMap } from 'maplibre-gl';

  export let open = false;
  export let map: GLMap | null = null;

  const dispatch = createEventDispatcher();

  let minZoom = 10;
  let maxZoom = 14;
  let estimatedTiles = 0;
  let downloading = false;
  let progress = 0;
  let progressTotal = 0;
  let result: { cached: number; failed: number; total: number } | null = null;
  let abortController: AbortController | null = null;
  let cacheStats = { tileCount: 0, estimatedSizeMB: 0 };

  function getBounds(): TileBounds | null {
    if (!map) return null;
    const b = map.getBounds();
    return {
      north: b.getNorth(),
      south: b.getSouth(),
      east: b.getEast(),
      west: b.getWest(),
    };
  }

  function updateEstimate() {
    const bounds = getBounds();
    if (!bounds) {
      estimatedTiles = 0;
      return;
    }
    estimatedTiles = estimateTileCount(bounds, minZoom, maxZoom);
  }

  function updateZoomFromMap() {
    if (!map) return;
    const currentZoom = Math.round(map.getZoom());
    minZoom = Math.max(0, currentZoom - 2);
    maxZoom = Math.min(17, currentZoom + 2);
    updateEstimate();
  }

  async function loadStats() {
    cacheStats = await getOfflineCacheStats();
  }

  $: if (open && map) {
    updateZoomFromMap();
    loadStats();
  }

  $: if (open) {
    updateEstimate();
  }

  async function startDownload() {
    const bounds = getBounds();
    if (!bounds) return;

    downloading = true;
    result = null;
    progress = 0;
    progressTotal = estimatedTiles;
    abortController = new AbortController();

    try {
      result = await prefetchTiles(
        bounds,
        minZoom,
        maxZoom,
        (fetched, total) => {
          progress = fetched;
          progressTotal = total;
        },
        abortController.signal
      );
    } catch (err) {
      console.error('Prefetch error:', err);
    } finally {
      downloading = false;
      abortController = null;
      await loadStats();
    }
  }

  function cancelDownload() {
    abortController?.abort();
  }

  function close() {
    if (downloading) cancelDownload();
    dispatch('close');
  }

  onDestroy(() => {
    abortController?.abort();
  });
</script>

{#if open}
  <div class="save-offline-panel">
    <button class="close-btn" on:click={close}>&times;</button>
    <h3>{$_('offline.saveArea')}</h3>

    <div class="info">
      <p class="stats">
        {$_('offline.cachedTiles')}: <strong>{cacheStats.tileCount}</strong>
        (~{cacheStats.estimatedSizeMB.toFixed(1)} MB)
      </p>
    </div>

    {#if !downloading && !result}
      <div class="controls">
        <label>
          {$_('offline.zoomRange')}
          <div class="zoom-inputs">
            <input type="number" bind:value={minZoom} min={0} max={17} on:change={updateEstimate} />
            <span>–</span>
            <input type="number" bind:value={maxZoom} min={0} max={17} on:change={updateEstimate} />
          </div>
        </label>

        <p class="estimate">
          {$_('offline.estimatedTiles')}: <strong>{estimatedTiles.toLocaleString()}</strong>
          (~{(estimatedTiles * 15 / 1024).toFixed(1)} MB)
        </p>

        {#if estimatedTiles > 5000}
          <p class="warning">{$_('offline.tooManyTiles')}</p>
        {/if}

        <button
          class="download-btn"
          on:click={startDownload}
          disabled={estimatedTiles === 0 || estimatedTiles > 10000}
        >
          {$_('offline.download')}
        </button>
      </div>
    {/if}

    {#if downloading}
      <div class="progress-section">
        <p>{$_('offline.downloading')}...</p>
        <div class="progress-bar">
          <div
            class="progress-fill"
            style="width: {progressTotal > 0 ? (progress / progressTotal * 100) : 0}%"
          ></div>
        </div>
        <p class="progress-text">{progress} / {progressTotal}</p>
        <button class="cancel-btn" on:click={cancelDownload}>
          {$_('offline.cancel')}
        </button>
      </div>
    {/if}

    {#if result}
      <div class="result-section">
        <p class="result-success">{$_('offline.complete')}</p>
        <ul>
          <li>{$_('offline.tilesCached')}: {result.cached}</li>
          {#if result.failed > 0}
            <li class="failed">{$_('offline.tilesFailed')}: {result.failed}</li>
          {/if}
        </ul>
        <button class="download-btn" on:click={() => { result = null; }}>
          {$_('offline.downloadMore')}
        </button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .save-offline-panel {
    position: relative;
    padding: 16px;
  }

  .close-btn {
    position: absolute;
    top: 8px;
    inset-inline-end: 8px;
    background: #f0f0f0;
    border: none;
    border-radius: 50%;
    width: 28px;
    height: 28px;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #333;
  }

  h3 {
    margin: 0 0 12px 0;
    font-size: 16px;
    color: #333;
  }

  .info {
    margin-bottom: 12px;
  }

  .stats {
    margin: 0;
    font-size: 13px;
    color: #666;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  label {
    font-size: 13px;
    font-weight: 500;
    color: #555;
  }

  .zoom-inputs {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }

  .zoom-inputs input {
    width: 60px;
    padding: 6px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
    text-align: center;
  }

  .zoom-inputs span {
    color: #999;
  }

  .estimate {
    margin: 0;
    font-size: 13px;
    color: #555;
  }

  .warning {
    margin: 0;
    font-size: 12px;
    color: #e67e22;
    font-weight: 500;
  }

  .download-btn {
    padding: 10px 16px;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .download-btn:hover:not(:disabled) {
    background: #357abd;
  }

  .download-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .progress-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #4a90e2;
    border-radius: 4px;
    transition: width 0.3s;
  }

  .progress-text {
    margin: 0;
    font-size: 12px;
    color: #666;
    text-align: center;
  }

  .cancel-btn {
    padding: 8px 12px;
    background: #f0f0f0;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    color: #666;
  }

  .cancel-btn:hover {
    background: #e0e0e0;
  }

  .result-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .result-success {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    color: #27ae60;
  }

  .result-section ul {
    margin: 0;
    padding-inline-start: 20px;
    font-size: 13px;
    color: #555;
  }

  .failed {
    color: #e74c3c;
  }
</style>
