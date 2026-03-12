<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { _ } from 'svelte-i18n';

  const dispatch = createEventDispatcher<{
    select: { lat: number; lng: number; name: string; zoom: number };
  }>();

  let query = '';
  let results: Array<{ display_name: string; lat: string; lon: string; type: string; importance: number }> = [];
  let loading = false;
  let showResults = false;
  let debounceTimer: ReturnType<typeof setTimeout>;
  let inputEl: HTMLInputElement;

  function debounceSearch() {
    clearTimeout(debounceTimer);
    if (query.trim().length < 2) {
      results = [];
      showResults = false;
      return;
    }
    loading = true;
    debounceTimer = setTimeout(() => search(), 300);
  }

  async function search() {
    const q = query.trim();
    if (q.length < 2) return;
    try {
      const params = new URLSearchParams({
        q,
        format: 'json',
        limit: '5',
        addressdetails: '0',
      });
      const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
        headers: { 'Accept-Language': document.documentElement.lang || 'en' },
      });
      if (!res.ok) throw new Error('Search failed');
      results = await res.json();
      showResults = results.length > 0;
    } catch {
      results = [];
      showResults = false;
    } finally {
      loading = false;
    }
  }

  function selectResult(result: typeof results[0]) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    // Zoom level based on result importance
    const zoom = result.importance > 0.7 ? 10 : result.importance > 0.4 ? 13 : 16;
    dispatch('select', { lat, lng, name: result.display_name, zoom });
    query = result.display_name.split(',')[0];
    showResults = false;
    results = [];
    inputEl?.blur();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      showResults = false;
      inputEl?.blur();
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      selectResult(results[0]);
    }
  }

  function handleBlur() {
    // Delay to allow click on results
    setTimeout(() => { showResults = false; }, 200);
  }

  function clear() {
    query = '';
    results = [];
    showResults = false;
    inputEl?.focus();
  }
</script>

<div class="search-container">
  <div class="search-input-wrapper">
    <span class="search-icon">🔍</span>
    <input
      bind:this={inputEl}
      type="text"
      bind:value={query}
      on:input={debounceSearch}
      on:keydown={handleKeydown}
      on:focus={() => { if (results.length > 0) showResults = true; }}
      on:blur={handleBlur}
      placeholder={$_('search.placeholder')}
    />
    {#if loading}
      <span class="search-spinner"></span>
    {:else if query}
      <button class="clear-btn" on:click={clear}>×</button>
    {/if}
  </div>

  {#if showResults}
    <ul class="search-results">
      {#each results as result}
        <li>
          <button on:mousedown|preventDefault={() => selectResult(result)}>
            {result.display_name}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .search-container {
    position: relative;
    width: 100%;
    max-width: 360px;
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
    overflow: hidden;
    height: 40px;
  }

  .search-icon {
    padding: 0 8px 0 12px;
    font-size: 14px;
    flex-shrink: 0;
  }

  input {
    flex: 1;
    border: none;
    outline: none;
    font-size: 14px;
    padding: 8px 4px;
    background: transparent;
    min-width: 0;
  }

  .clear-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 18px;
    color: #999;
    padding: 0 10px;
    line-height: 1;
  }

  .clear-btn:hover {
    color: #333;
  }

  .search-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #ddd;
    border-top-color: #4a90e2;
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
    margin-right: 10px;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .search-results {
    position: absolute;
    top: 44px;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    list-style: none;
    margin: 0;
    padding: 4px 0;
    z-index: 200;
    max-height: 240px;
    overflow-y: auto;
  }

  .search-results li button {
    display: block;
    width: 100%;
    text-align: start;
    padding: 10px 14px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: 13px;
    color: #333;
    line-height: 1.4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .search-results li button:hover {
    background: #f0f7ff;
  }

  @media (max-width: 480px) {
    .search-container {
      max-width: none;
    }
  }
</style>
