<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { _ } from 'svelte-i18n';
  import type { PinType } from './models';
  import { PIN_TYPE_DEFINITIONS } from './i18n/pinTypes';

  export let selectedTypes: PinType[] = [];
  export let availableTags: string[] = [];
  export let selectedTags: string[] = [];

  const dispatch = createEventDispatcher<{
    filterChange: { types: PinType[]; tags: string[] };
  }>();

  function toggleType(type: PinType) {
    if (selectedTypes.includes(type)) {
      selectedTypes = selectedTypes.filter(t => t !== type);
    } else {
      selectedTypes = [...selectedTypes, type];
    }
    dispatch('filterChange', { types: selectedTypes, tags: selectedTags });
  }

  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter(t => t !== tag);
    } else {
      selectedTags = [...selectedTags, tag];
    }
    dispatch('filterChange', { types: selectedTypes, tags: selectedTags });
  }

  function clearFilters() {
    selectedTypes = [];
    selectedTags = [];
    dispatch('filterChange', { types: [], tags: [] });
  }
</script>

<div class="pin-filter">
  <div class="filter-header">
    {#if selectedTypes.length > 0 || selectedTags.length > 0}
      <button class="clear-btn" on:click={clearFilters}>{$_('filter.clear')}</button>
    {/if}
  </div>

  <div class="filter-types">
    {#each PIN_TYPE_DEFINITIONS as type}
      <button
        type="button"
        class="filter-type-btn"
        class:active={selectedTypes.includes(type.value)}
        on:click={() => toggleType(type.value)}
      >
        <span class="emoji">{type.emoji}</span>
        <span class="label">{$_(type.labelKey)}</span>
      </button>
    {/each}
  </div>

  {#if availableTags.length > 0}
    <div class="tag-filter-section">
      <div class="section-label">{$_('filter.tags')}</div>
      <div class="tag-filter-list">
        {#each availableTags as tag}
          <button
            type="button"
            class="tag-filter-btn"
            class:active={selectedTags.includes(tag)}
            on:click={() => toggleTag(tag)}
          >
            {tag}
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if selectedTypes.length > 0 || selectedTags.length > 0}
    <div class="active-filters">
      {$_('filter.showingCount', { values: { count: selectedTypes.length + selectedTags.length } })}
    </div>
  {:else}
    <div class="active-filters">
      {$_('filter.showingAll')}
    </div>
  {/if}
</div>

<style>
  .pin-filter {
    background: white;
    border-radius: 8px;
    padding: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    min-width: 200px;
    max-width: calc(100vw - 32px);
  }

  @media (max-width: 480px) {
    .pin-filter {
      padding: 12px;
      min-width: auto;
      width: calc(100vw - 32px);
    }

    .filter-type-btn {
      padding: 10px;
      font-size: 13px;
    }

    .emoji {
      font-size: 20px;
    }

    .label {
      font-size: 13px;
    }
  }

  .filter-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    margin-bottom: 12px;
  }

  .clear-btn {
    padding: 4px 8px;
    background: #f5f5f5;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 12px;
    cursor: pointer;
    color: #666;
  }

  .clear-btn:hover {
    background: #e0e0e0;
  }

  .filter-types {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .filter-type-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    text-align: start;
    width: 100%;
    touch-action: manipulation;
    min-height: 44px;
  }

  .filter-type-btn:hover {
    border-color: #4a90e2;
    background: #f0f7ff;
  }

  .filter-type-btn.active {
    border-color: #4a90e2;
    background: #e3f2fd;
    font-weight: 500;
  }

  .emoji {
    font-size: 18px;
  }

  .label {
    font-size: 14px;
  }

  .tag-filter-section {
    margin-top: 16px;
    padding-top: 12px;
    border-top: 1px solid #e0e0e0;
  }

  .section-label {
    font-size: 12px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
  }

  .tag-filter-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag-filter-btn {
    padding: 4px 12px;
    border: 1px solid #ddd;
    border-radius: 16px;
    background: white;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
    color: #555;
  }

  .tag-filter-btn:hover {
    border-color: #4a90e2;
    background: #f0f7ff;
  }

  .tag-filter-btn.active {
    border-color: #1976d2;
    background: #e3f2fd;
    color: #1976d2;
    font-weight: 500;
  }

  .active-filters {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e0e0e0;
    font-size: 12px;
    color: #666;
  }
</style>
