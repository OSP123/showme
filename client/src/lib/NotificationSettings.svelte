<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { PinType } from './models';

  export let mapId: string;
  export let open = false;

  const dispatch = createEventDispatcher<{
    close: void;
  }>();

  let email = '';
  let selectedTypes: Set<PinType> = new Set(['danger', 'medical']);
  let isSubmitting = false;
  let message = '';
  let error = '';

  const pinTypes: { value: PinType; label: string; emoji: string }[] = [
    { value: 'danger', label: 'Danger', emoji: '⚠️' },
    { value: 'medical', label: 'Medical', emoji: '🏥' },
    { value: 'water', label: 'Water', emoji: '💧' },
    { value: 'food', label: 'Food', emoji: '🍽️' },
    { value: 'shelter', label: 'Shelter', emoji: '🏠' },
    { value: 'checkpoint', label: 'Checkpoint', emoji: '🚧' },
    { value: 'other', label: 'Other', emoji: '📍' },
  ];

  function toggleType(type: PinType) {
    if (selectedTypes.has(type)) {
      selectedTypes.delete(type);
    } else {
      selectedTypes.add(type);
    }
    selectedTypes = selectedTypes; // Trigger reactivity
  }

  async function subscribe() {
    if (!email || !email.includes('@')) {
      error = 'Please enter a valid email address';
      return;
    }

    isSubmitting = true;
    error = '';
    message = '';

    try {
      const response = await fetch('/api/notifications/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mapId,
          email,
          pinTypes: Array.from(selectedTypes)
        })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      message = '✅ Subscribed! You\'ll receive email alerts for new pins.';
      email = '';
      
      setTimeout(() => {
        dispatch('close');
      }, 2000);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to subscribe';
    } finally {
      isSubmitting = false;
    }
  }

  function close() {
    dispatch('close');
  }
</script>

{#if open}
  <div class="overlay" on:click={close} on:keydown={(e) => e.key === 'Escape' && close()}>
    <div class="modal" on:click|stopPropagation>
      <div class="header">
        <h3>📢 Email Notifications</h3>
        <button class="close-btn" on:click={close}>×</button>
      </div>

      <p class="description">
        Get email alerts when new pins are added to this map.
      </p>

      <div class="form-group">
        <label for="email">Email Address</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="you@example.com"
          disabled={isSubmitting}
        />
      </div>

      <div class="form-group">
        <label>Alert me for these pin types:</label>
        <div class="pin-types">
          {#each pinTypes as type}
            <button
              type="button"
              class="type-btn"
              class:selected={selectedTypes.has(type.value)}
              on:click={() => toggleType(type.value)}
              disabled={isSubmitting}
            >
              <span class="emoji">{type.emoji}</span>
              <span class="label">{type.label}</span>
            </button>
          {/each}
        </div>
        <p class="hint">Select none to receive alerts for all pin types</p>
      </div>

      {#if message}
        <div class="message success">{message}</div>
      {/if}

      {#if error}
        <div class="message error">{error}</div>
      {/if}

      <div class="actions">
        <button class="btn-secondary" on:click={close} disabled={isSubmitting}>
          Cancel
        </button>
        <button 
          class="btn-primary" 
          on:click={subscribe}
          disabled={isSubmitting || !email}
        >
          {isSubmitting ? 'Subscribing...' : 'Subscribe'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  h3 {
    margin: 0;
    font-size: 20px;
    color: #333;
  }

  .close-btn {
    background: none;
    border: none;
    font-size: 28px;
    cursor: pointer;
    color: #666;
    padding: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .close-btn:hover {
    color: #333;
  }

  .description {
    color: #666;
    font-size: 14px;
    margin-bottom: 20px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  label {
    display: block;
    font-weight: 500;
    margin-bottom: 8px;
    font-size: 14px;
    color: #333;
  }

  input[type="email"] {
    width: 100%;
    padding: 10px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 14px;
  }

  input[type="email"]:focus {
    outline: none;
    border-color: #4a90e2;
  }

  .pin-types {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 8px;
    margin-bottom: 8px;
  }

  .type-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .type-btn:hover {
    border-color: #4a90e2;
    background: #f0f7ff;
  }

  .type-btn.selected {
    border-color: #4a90e2;
    background: #e3f2fd;
  }

  .type-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .emoji {
    font-size: 24px;
  }

  .type-btn .label {
    font-size: 12px;
    font-weight: 500;
  }

  .hint {
    font-size: 12px;
    color: #999;
    margin: 0;
  }

  .message {
    padding: 12px;
    border-radius: 6px;
    margin-bottom: 16px;
    font-size: 14px;
  }

  .message.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .message.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }

  .actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .btn-primary,
  .btn-secondary {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: background 0.2s;
  }

  .btn-primary {
    background: #4a90e2;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #357abd;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #f5f5f5;
    color: #333;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #e0e0e0;
  }

  @media (max-width: 480px) {
    .modal {
      width: 95%;
      padding: 20px;
    }

    .pin-types {
      grid-template-columns: repeat(3, 1fr);
    }

    .actions {
      flex-direction: column;
    }

    .btn-primary,
    .btn-secondary {
      width: 100%;
    }
  }
</style>
