<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { _ } from 'svelte-i18n';

  export let open = false;
  export let title = '';
  export let message = '';
  export let confirmLabel = '';
  export let cancelLabel = '';
  export let variant: 'danger' | 'warning' | 'info' = 'info';

  const dispatch = createEventDispatcher<{
    confirm: void;
    cancel: void;
  }>();

  function handleConfirm() {
    dispatch('confirm');
    open = false;
  }

  function handleCancel() {
    dispatch('cancel');
    open = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') handleCancel();
  }
</script>

{#if open}
  <div class="confirm-overlay" on:click={handleCancel} on:keydown={handleKeydown}>
    <div class="confirm-modal" on:click|stopPropagation>
      <h3 class="confirm-title">{title || $_('confirm.title')}</h3>
      <p class="confirm-message">{message}</p>
      <div class="confirm-actions">
        <button class="btn-cancel" on:click={handleCancel}>
          {cancelLabel || $_('common.cancel')}
        </button>
        <button class="btn-confirm btn-{variant}" on:click={handleConfirm}>
          {confirmLabel || $_('common.confirm')}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .confirm-overlay {
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

  .confirm-modal {
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .confirm-title {
    margin: 0 0 12px 0;
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }

  .confirm-message {
    margin: 0 0 20px 0;
    font-size: 14px;
    color: #555;
    line-height: 1.5;
  }

  .confirm-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .btn-cancel,
  .btn-confirm {
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

  .btn-danger {
    background: #dc2626;
    color: white;
  }

  .btn-danger:hover {
    background: #b91c1c;
  }

  .btn-warning {
    background: #f59e0b;
    color: white;
  }

  .btn-warning:hover {
    background: #d97706;
  }

  .btn-info {
    background: #4a90e2;
    color: white;
  }

  .btn-info:hover {
    background: #357abd;
  }

  @media (max-width: 480px) {
    .confirm-actions {
      flex-direction: column-reverse;
    }

    .btn-cancel,
    .btn-confirm {
      width: 100%;
    }
  }
</style>
