<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { _ } from 'svelte-i18n';
  import { panicWipe, canPerformPanicWipe } from './panicWipe';
  import type { PGlite } from '@electric-sql/pglite';
  import ConfirmModal from './ConfirmModal.svelte';

  export let db: PGlite | any | undefined;
  export let open = false;

  const dispatch = createEventDispatcher<{
    wiped: void;
    cancel: void;
  }>();

  let isWiping = false;
  let confirmText = '';
  const requiredText = 'DELETE ALL';
  let showAlert = false;
  let alertMessage = '';

  async function handleWipe() {
    if (confirmText !== requiredText) {
      return;
    }

    if (!canPerformPanicWipe()) {
      alertMessage = $_('panic.rateLimited');
      showAlert = true;
      return;
    }

    if (!db) {
      console.error('❌ Database not available for panic wipe');
      alertMessage = $_('panic.dbUnavailable');
      showAlert = true;
      return;
    }

    isWiping = true;
    try {
      console.log('🚨 Starting panic wipe...');
      await panicWipe(db);
      console.log('✅ Panic wipe completed successfully');
      dispatch('wiped');
      open = false;
      confirmText = '';
      // Give UI time to update, then reload page to reset app state
      setTimeout(() => {
        console.log('🔄 Reloading page after panic wipe...');
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('❌ Panic wipe failed:', error);
      alertMessage = $_('panic.wipeFailed', { values: { error: error instanceof Error ? error.message : String(error) } });
      showAlert = true;
      isWiping = false;
    }
  }

  function cancel() {
    dispatch('cancel');
    open = false;
    confirmText = '';
  }
</script>

{#if open}
  <div class="panic-overlay" on:click={cancel} on:keydown={(e) => e.key === 'Escape' && cancel()}>
    <div class="panic-container" on:click|stopPropagation>
      <div class="panic-header">
        <span class="panic-icon">🚨</span>
        <h2>{$_('panic.title')}</h2>
      </div>

      <div class="panic-warning">
        <p><strong>{$_('panic.warningIntro')}</strong></p>
        <ul>
          <li>{$_('panic.allMaps')}</li>
          <li>{$_('panic.allPins')}</li>
          <li>{$_('panic.allQueued')}</li>
          <li>{$_('panic.allStorage')}</li>
        </ul>
        <p class="warning-text">{$_('panic.cannotUndo')}</p>
      </div>

      <div class="panic-confirm">
        <label for="confirm-input">
          {$_('panic.typeConfirm', { values: { text: requiredText } })}
        </label>
        <input
          id="confirm-input"
          type="text"
          bind:value={confirmText}
          placeholder={requiredText}
          disabled={isWiping}
          class:error={confirmText && confirmText !== requiredText}
        />
      </div>

      <div class="panic-actions">
        <button
          type="button"
          class="panic-cancel-btn"
          on:click={cancel}
          disabled={isWiping}
        >
          {$_('common.cancel')}
        </button>
        <button
          type="button"
          class="panic-wipe-btn"
          on:click={handleWipe}
          disabled={isWiping || confirmText !== requiredText}
        >
          {isWiping ? $_('panic.wiping') : $_('panic.deleteAll')}
        </button>
      </div>
    </div>
  </div>
{/if}

<ConfirmModal
  open={showAlert}
  title={$_('panic.title')}
  message={alertMessage}
  confirmLabel={$_('common.close')}
  variant="warning"
  on:confirm={() => showAlert = false}
  on:cancel={() => showAlert = false}
/>

<style>
  .panic-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(220, 38, 38, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3000;
    backdrop-filter: blur(8px);
  }

  .panic-container {
    background: white;
    border-radius: 16px;
    padding: 32px;
    max-width: 500px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    border: 3px solid #dc2626;
  }

  .panic-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
  }

  .panic-icon {
    font-size: 36px;
  }

  .panic-header h2 {
    margin: 0;
    font-size: 24px;
    color: #dc2626;
    font-weight: 700;
  }

  .panic-warning {
    background: #fef2f2;
    border: 2px solid #fecaca;
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 24px;
  }

  .panic-warning p {
    margin: 0 0 8px 0;
    color: #991b1b;
  }

  .panic-warning ul {
    margin: 8px 0;
    padding-inline-start: 24px;
    color: #991b1b;
  }

  .panic-warning li {
    margin: 4px 0;
  }

  .warning-text {
    font-weight: 600;
    margin-top: 12px !important;
  }

  .panic-confirm {
    margin-bottom: 24px;
  }

  .panic-confirm label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: #333;
  }

  .panic-confirm input {
    width: 100%;
    padding: 12px;
    border: 2px solid #ddd;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .panic-confirm input.error {
    border-color: #dc2626;
    background: #fef2f2;
  }

  .panic-confirm input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .panic-actions {
    display: flex;
    gap: 12px;
  }

  .panic-cancel-btn,
  .panic-wipe-btn {
    flex: 1;
    padding: 14px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }

  .panic-cancel-btn {
    background: #f3f4f6;
    color: #333;
  }

  .panic-cancel-btn:hover:not(:disabled) {
    background: #e5e7eb;
  }

  .panic-wipe-btn {
    background: #dc2626;
    color: white;
  }

  .panic-wipe-btn:hover:not(:disabled) {
    background: #b91c1c;
  }

  .panic-wipe-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Mobile optimizations */
  @media (max-width: 480px) {
    .panic-container {
      padding: 24px 20px;
      margin: 16px;
      width: calc(100% - 32px);
    }

    .panic-header h2 {
      font-size: 20px;
    }

    .panic-icon {
      font-size: 28px;
    }

    .panic-actions {
      flex-direction: column;
      gap: 8px;
    }

    .panic-cancel-btn,
    .panic-wipe-btn {
      width: 100%;
    }
  }
</style>

