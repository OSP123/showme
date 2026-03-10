<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { _ } from 'svelte-i18n';
  export let disabled = false;
  let name = '';
  let isPrivate = false;
  const dispatch = createEventDispatcher<{
    create: { name: string; isPrivate: boolean };
    joinPrivate: void;
  }>();

  function submit() {
    if (!name) return;
    dispatch('create', { name, isPrivate });
  }
</script>

<div class="controls">
  <h2>{$_('createMap.title')}</h2>

  <div class="map-details">
    <div class="input-group">
      <label for="map-name">{$_('createMap.mapName')}</label>
      <input
        id="map-name"
        type="text"
        placeholder={$_('createMap.enterName')}
        bind:value={name}
        disabled={disabled}
      />
    </div>

    <label class="checkbox-label">
      <input
        type="checkbox"
        bind:checked={isPrivate}
        disabled={disabled}
      />
      <span>{$_('createMap.makePrivate')}</span>
    </label>
    {#if isPrivate}
      <p class="private-hint">{$_('createMap.privateHint')}</p>
    {/if}
  </div>

  <button
    class="create-btn"
    on:click={submit}
    disabled={!name || disabled}
  >
    {#if disabled}{$_('createMap.creating')}{:else}{$_('createMap.createButton')}{/if}
  </button>

  <div class="divider">
    <span>{$_('createMap.or')}</span>
  </div>

  <button
    class="join-btn"
    on:click={() => dispatch('joinPrivate')}
    disabled={disabled}
  >
    {$_('createMap.joinPrivate')}
  </button>
</div>

<style>
  .controls {
    background: white;
    border-radius: 12px;
    padding: 32px;
    max-width: 600px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  h2 {
    margin: 0 0 24px 0;
    font-size: 24px;
    font-weight: 600;
    color: #333;
  }

  .map-details {
    margin-bottom: 24px;
  }

  .input-group {
    margin-bottom: 16px;
  }

  .input-group label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    font-weight: 500;
    color: #333;
  }

  .input-group input[type="text"] {
    width: 100%;
    padding: 10px 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
    box-sizing: border-box;
  }

  .input-group input[type="text"]:focus {
    outline: none;
    border-color: #4a90e2;
  }

  .input-group input[type="text"]:disabled {
    background: #f5f5f5;
    cursor: not-allowed;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: #666;
    cursor: pointer;
  }

  .checkbox-label input[type="checkbox"] {
    cursor: pointer;
  }

  .private-hint {
    margin: 8px 0 0 0;
    font-size: 12px;
    color: #888;
    line-height: 1.4;
  }

  .create-btn {
    width: 100%;
    padding: 12px 24px;
    background: #4a90e2;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
  }

  .create-btn:hover:not(:disabled) {
    background: #357abd;
  }

  .create-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .divider {
    display: flex;
    align-items: center;
    margin: 20px 0;
    color: #999;
    font-size: 13px;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid #ddd;
  }

  .divider span {
    padding: 0 12px;
  }

  .join-btn {
    width: 100%;
    padding: 12px 24px;
    background: white;
    color: #4a90e2;
    border: 2px solid #4a90e2;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .join-btn:hover:not(:disabled) {
    background: #f0f7ff;
  }

  .join-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Mobile optimizations */
  @media (max-width: 480px) {
    .controls {
      padding: 20px 16px;
      max-width: calc(100vw - 32px);
      margin: 16px;
    }

    h2 {
      font-size: 24px;
    }

    .input-group input[type="text"] {
      padding: 12px;
      font-size: 16px; /* Prevent zoom on iOS */
    }

    .create-btn {
      padding: 14px;
      font-size: 16px;
    }
  }
</style>
