<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { PinType } from './models';

  export let selectedTypes: PinType[] = [];

  const dispatch = createEventDispatcher<{
    filterChange: { types: PinType[] };
  }>();

  const pinTypes: { value: PinType; label: string; emoji: string }[] = [
    { value: 'medical', label: 'Medical', emoji: '🏥' },
    { value: 'water', label: 'Water', emoji: '💧' },
    { value: 'checkpoint', label: 'Checkpoint', emoji: '🚧' },
    { value: 'shelter', label: 'Shelter', emoji: '🏠' },
    { value: 'food', label: 'Food', emoji: '🍽️' },
    { value: 'danger', label: 'Danger', emoji: '⚠️' },
    { value: 'other', label: 'Other', emoji: '📍' },
  ];

  function toggleType(type: PinType) {
    if (selectedTypes.includes(type)) {
      selectedTypes = selectedTypes.filter(t => t !== type);
    } else {
      selectedTypes = [...selectedTypes, type];
    }
    dispatch('filterChange', { types: selectedTypes });
  }

  function clearFilters() {
    selectedTypes = [];
    dispatch('filterChange', { types: [] });
  }
</script>

<div class="pin-filter">
  <div class="filter-header">
    {#if selectedTypes.length > 0}
      <button class="clear-btn" on:click={clearFilters}>Clear</button>
    {/if}
  </div>
  
  <div class="filter-types">
    {#each pinTypes as type}
      <button
        type="button"
        class="filter-type-btn"
        class:active={selectedTypes.includes(type.value)}
        on:click={() => toggleType(type.value)}
      >
        <span class="emoji">{type.emoji}</span>
        <span class="label">{type.label}</span>
      </button>
    {/each}
  </div>
  
  {#if selectedTypes.length > 0}
    <div class="active-filters">
      Showing: {selectedTypes.length} {selectedTypes.length === 1 ? 'type' : 'types'}
    </div>
  {:else}
    <div class="active-filters">
      Showing: All pins
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
    text-align: left;
    width: 100%;
    touch-action: manipulation; /* Prevent double-tap zoom */
    min-height: 44px; /* Minimum touch target size */
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

  .active-filters {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e0e0e0;
    font-size: 12px;
    color: #666;
  }
</style>

