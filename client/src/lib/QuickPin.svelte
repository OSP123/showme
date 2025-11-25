<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { PinType } from './models';
  import { PIN_TTL_HOURS } from './models';

  export let open = false;
  export let lat: number;
  export let lng: number;

  const dispatch = createEventDispatcher<{
    create: { type: PinType; lat: number; lng: number };
    cancel: void;
    advanced: void;
  }>();

  // Common pin presets for crisis scenarios
  const quickPresets: { type: PinType; emoji: string; label: string; ttl: number }[] = [
    { type: 'medical', emoji: '🏥', label: 'Medical', ttl: PIN_TTL_HOURS.medical },
    { type: 'water', emoji: '💧', label: 'Water', ttl: PIN_TTL_HOURS.water },
    { type: 'checkpoint', emoji: '🚧', label: 'Checkpoint', ttl: PIN_TTL_HOURS.checkpoint },
    { type: 'shelter', emoji: '🏠', label: 'Shelter', ttl: PIN_TTL_HOURS.shelter },
    { type: 'food', emoji: '🍽️', label: 'Food', ttl: PIN_TTL_HOURS.food },
    { type: 'danger', emoji: '⚠️', label: 'Danger', ttl: PIN_TTL_HOURS.danger },
  ];

  function handleQuickCreate(type: PinType) {
    dispatch('create', { type, lat, lng });
    // Close immediately after selection
    open = false;
  }

  function cancel() {
    dispatch('cancel');
    open = false;
  }
</script>

{#if open}
  <div class="quick-pin-overlay" on:click={cancel} on:keydown={(e) => e.key === 'Escape' && cancel()}>
    <div class="quick-pin-container" on:click|stopPropagation>
      <div class="quick-pin-header">
        <h3>Quick Pin</h3>
        <button class="close-btn" on:click={cancel} aria-label="Close">×</button>
      </div>
      <p class="quick-pin-subtitle">Tap to add a pin</p>
      <div class="quick-pin-grid">
        {#each quickPresets as preset}
          <button
            type="button"
            class="quick-pin-btn"
            on:click={() => handleQuickCreate(preset.type)}
            aria-label={`Add ${preset.label} pin`}
          >
            <span class="quick-pin-emoji">{preset.emoji}</span>
            <span class="quick-pin-label">{preset.label}</span>
            <span class="quick-pin-ttl">Expires in {preset.ttl}h</span>
          </button>
        {/each}
      </div>
      <div class="quick-pin-footer">
        <button class="advanced-btn" on:click={() => dispatch('advanced')}>
          Advanced Options
        </button>
        <button class="cancel-btn" on:click={cancel}>Cancel</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .quick-pin-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    backdrop-filter: blur(4px);
  }

  .quick-pin-container {
    background: white;
    border-radius: 16px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .quick-pin-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .quick-pin-header h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 28px;
    line-height: 1;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 0.2s;
  }

  .close-btn:hover {
    background: #f0f0f0;
  }

  .quick-pin-subtitle {
    margin: 0 0 20px 0;
    color: #666;
    font-size: 14px;
  }

  .quick-pin-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    margin-bottom: 20px;
  }

  .quick-pin-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 20px 16px;
    border: 2px solid #e0e0e0;
    border-radius: 12px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 100px;
    /* Large touch target for crisis scenarios */
    touch-action: manipulation;
  }

  .quick-pin-btn:active {
    transform: scale(0.95);
    background: #f0f7ff;
    border-color: #4a90e2;
  }

  .quick-pin-btn:hover {
    border-color: #4a90e2;
    background: #f0f7ff;
  }

  .quick-pin-emoji {
    font-size: 36px;
    line-height: 1;
  }

  .quick-pin-label {
    font-size: 16px;
    font-weight: 600;
    color: #333;
  }

  .quick-pin-ttl {
    font-size: 11px;
    color: #999;
    font-weight: 400;
  }

  .quick-pin-footer {
    display: flex;
    gap: 8px;
  }

  .advanced-btn,
  .cancel-btn {
    flex: 1;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: white;
    color: #666;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .advanced-btn {
    border-color: #4a90e2;
    color: #4a90e2;
  }

  .advanced-btn:hover {
    background: #f0f7ff;
  }

  .cancel-btn:hover {
    background: #f5f5f5;
  }

  /* Mobile optimizations */
  @media (max-width: 480px) {
    .quick-pin-container {
      padding: 20px;
    }

    .quick-pin-grid {
      gap: 10px;
    }

    .quick-pin-btn {
      padding: 16px 12px;
      min-height: 90px;
    }

    .quick-pin-emoji {
      font-size: 32px;
    }
  }
</style>

