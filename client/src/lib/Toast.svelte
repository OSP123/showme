<script lang="ts">
  import { onMount } from 'svelte';
  
  export let message: string;
  export let type: 'info' | 'success' | 'warning' | 'danger' = 'info';
  export let duration = 5000;
  export let onClose: (() => void) | undefined = undefined;
  
  let visible = true;
  
  onMount(() => {
    const timer = setTimeout(() => {
      visible = false;
      if (onClose) onClose();
    }, duration);
    
    return () => clearTimeout(timer);
  });
</script>

{#if visible}
  <div class="toast toast-{type}" on:click={() => { visible = false; if (onClose) onClose(); }}>
    <span class="toast-content">{message}</span>
    <button class="toast-close" on:click|stopPropagation={() => { visible = false; if (onClose) onClose(); }}>×</button>
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    padding: 16px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 300px;
    max-width: 500px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
    cursor: pointer;
  }

  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  .toast-info {
    background: #e3f2fd;
    color: #1976d2;
    border-left: 4px solid #1976d2;
  }

  .toast-success {
    background: #d4edda;
    color: #155724;
    border-left: 4px solid #28a745;
  }

  .toast-warning {
    background: #fff3cd;
    color: #856404;
    border-left: 4px solid #ffc107;
  }

  .toast-danger {
    background: #f8d7da;
    color: #721c24;
    border-left: 4px solid #dc3545;
  }

  .toast-content {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
  }

  .toast-close {
    background: none;
    border: none;
    color: currentColor;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.6;
  }

  .toast-close:hover {
    opacity: 1;
  }

  @media (max-width: 480px) {
    .toast {
      bottom: 16px;
      right: 16px;
      left: 16px;
      min-width: unset;
      max-width: unset;
    }
  }
</style>
