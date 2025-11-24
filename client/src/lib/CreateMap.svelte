<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let disabled = false;
  let name = '';
  let isPrivate = false;
  let selectedTemplate: string | null = null;
  const dispatch = createEventDispatcher();

  interface MapTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    defaultPrivate: boolean;
  }

  const templates: MapTemplate[] = [
    {
      id: 'custom',
      name: 'Custom Map',
      description: 'Create your own map from scratch',
      icon: '🗺️',
      defaultPrivate: false
    },
    {
      id: 'crisis',
      name: 'Crisis Response',
      description: 'Emergency response map for medical, water, and shelter locations',
      icon: '🚨',
      defaultPrivate: false
    },
    {
      id: 'community',
      name: 'Community Map',
      description: 'Share local resources and information with your community',
      icon: '👥',
      defaultPrivate: false
    },
    {
      id: 'event',
      name: 'Event Map',
      description: 'Map for events, checkpoints, and gathering points',
      icon: '🎪',
      defaultPrivate: false
    },
    {
      id: 'private',
      name: 'Private Map',
      description: 'Private map with access token protection',
      icon: '🔒',
      defaultPrivate: true
    }
  ];

  function selectTemplate(template: MapTemplate) {
    selectedTemplate = template.id;
    if (template.id !== 'custom') {
      name = template.name;
      isPrivate = template.defaultPrivate;
    } else {
      name = '';
      isPrivate = false;
    }
  }

  function submit() {
    if (!name) return;
    dispatch('create', { name, isPrivate });
  }
</script>

<div class="controls">
  <h2>Create a Map</h2>
  
  <div class="templates">
    <p class="templates-label">Choose a template:</p>
    <div class="template-grid">
      {#each templates as template}
        <button
          type="button"
          class="template-card"
          class:selected={selectedTemplate === template.id}
          on:click={() => selectTemplate(template)}
          disabled={disabled}
        >
          <span class="template-icon">{template.icon}</span>
          <span class="template-name">{template.name}</span>
          <span class="template-desc">{template.description}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="map-details">
    <div class="input-group">
      <label for="map-name">Map Name</label>
      <input
        id="map-name"
        type="text"
        placeholder="Enter map name"
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
      <span>Make this map private (requires access token)</span>
    </label>
  </div>

  <button 
    class="create-btn" 
    on:click={submit} 
    disabled={!name || disabled}
  >
    {#if disabled}Creating…{:else}Create Map{/if}
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

  .templates {
    margin-bottom: 24px;
  }

  .templates-label {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 500;
    color: #666;
  }

  .template-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
  }

  .template-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    text-align: center;
  }

  .template-card:hover:not(:disabled) {
    border-color: #4a90e2;
    background: #f0f7ff;
  }

  .template-card.selected {
    border-color: #4a90e2;
    background: #e3f2fd;
  }

  .template-card:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .template-icon {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .template-name {
    font-weight: 600;
    font-size: 14px;
    color: #333;
    margin-bottom: 4px;
  }

  .template-desc {
    font-size: 11px;
    color: #666;
    line-height: 1.3;
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
</style>
