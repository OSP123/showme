<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { lookupAccessCode } from './api';

  export let open = false;
  export let mapId: string = '';

  const dispatch = createEventDispatcher<{
    submit: { mapId: string; token: string };
    cancel: void;
  }>();

  let codeInput = '';
  let error = '';
  let loading = false;

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') dispatch('cancel');
    if (e.key === 'Enter') handleSubmit();
  }

  async function handleSubmit() {
    const value = codeInput.trim();
    if (!value) return;

    error = '';
    loading = true;

    try {
      // UUID-length tokens are pasted share links
      if (value.length > 10) {
        // Treat as UUID access_token — use it directly with current mapId
        if (mapId) {
          dispatch('submit', { mapId, token: value });
        } else {
          error = $_('accessCode.invalidCode');
        }
        loading = false;
        return;
      }

      // Short code — look up map by access code
      const result = await lookupAccessCode(value);
      if (!result) {
        error = $_('accessCode.invalidCode');
        loading = false;
        return;
      }

      // Use the access code itself as the token (API accepts both)
      dispatch('submit', { mapId: result.id, token: value.toUpperCase() });
    } catch {
      error = $_('accessCode.error');
    } finally {
      loading = false;
    }
  }
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="access-overlay" on:click={() => dispatch('cancel')} on:keydown={handleKeydown}>
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
    <div class="access-modal" on:click|stopPropagation>
      <h3>{$_('accessCode.title')}</h3>
      <p class="access-description">{$_('accessCode.description')}</p>

      <!-- svelte-ignore a11y-autofocus -->
      <input
        type="text"
        class="code-input"
        bind:value={codeInput}
        placeholder={$_('accessCode.placeholder')}
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
        autofocus
        on:keydown={handleKeydown}
      />

      {#if error}
        <p class="error-message">{error}</p>
      {/if}

      <div class="access-actions">
        <button class="btn-cancel" on:click={() => dispatch('cancel')}>
          {$_('common.cancel')}
        </button>
        <button
          class="btn-submit"
          on:click={handleSubmit}
          disabled={loading || !codeInput.trim()}
        >
          {loading ? $_('accessCode.checking') : $_('accessCode.submit')}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .access-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(2px);
  }

  .access-modal {
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  h3 {
    margin: 0 0 8px 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .access-description {
    margin: 0 0 16px 0;
    font-size: 14px;
    color: #555;
    line-height: 1.5;
  }

  .code-input {
    width: 100%;
    padding: 14px;
    font-size: 20px;
    font-family: monospace;
    text-align: center;
    letter-spacing: 4px;
    text-transform: uppercase;
    border: 2px solid #ddd;
    border-radius: 8px;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.2s;
  }

  .code-input:focus {
    border-color: #4a90e2;
  }

  .error-message {
    margin: 8px 0 0 0;
    color: #dc2626;
    font-size: 13px;
  }

  .access-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 16px;
  }

  .btn-cancel,
  .btn-submit {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
    min-height: 44px;
  }

  .btn-cancel {
    background: #f3f4f6;
    color: #333;
  }

  .btn-cancel:hover {
    background: #e5e7eb;
  }

  .btn-submit {
    background: #4a90e2;
    color: white;
  }

  .btn-submit:hover:not(:disabled) {
    background: #357abd;
  }

  .btn-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 480px) {
    .code-input {
      font-size: 24px;
      padding: 16px;
    }

    .access-actions {
      flex-direction: column-reverse;
    }

    .btn-cancel,
    .btn-submit {
      width: 100%;
    }
  }
</style>
