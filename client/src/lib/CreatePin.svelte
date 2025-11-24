<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { PinType, PinData } from './models';

  export let lat: number;
  export let lng: number;
  export let open = false;

  const dispatch = createEventDispatcher<{
    create: PinData;
    cancel: void;
  }>();

  let selectedType: PinType = 'other';
  let description = '';
  let tags: string[] = [];
  let tagInput = '';

  const pinTypes: { value: PinType; label: string; emoji: string }[] = [
    { value: 'medical', label: 'Medical', emoji: '🏥' },
    { value: 'water', label: 'Water', emoji: '💧' },
    { value: 'checkpoint', label: 'Checkpoint', emoji: '🚧' },
    { value: 'shelter', label: 'Shelter', emoji: '🏠' },
    { value: 'food', label: 'Food', emoji: '🍽️' },
    { value: 'danger', label: 'Danger', emoji: '⚠️' },
    { value: 'other', label: 'Other', emoji: '📍' },
  ];

  function addTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      tags = [...tags, trimmed];
      tagInput = '';
    }
  }

  function removeTag(tag: string) {
    tags = tags.filter(t => t !== tag);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      addTag();
    }
  }

  function submit() {
    dispatch('create', {
      lat,
      lng,
      type: selectedType,
      description: description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
    // Reset form
    selectedType = 'other';
    description = '';
    tags = [];
    tagInput = '';
  }

  function cancel() {
    dispatch('cancel');
    // Reset form
    selectedType = 'other';
    description = '';
    tags = [];
    tagInput = '';
  }
</script>

{#if open}
  <div class="modal-overlay" on:click={cancel} on:keydown={(e) => e.key === 'Escape' && cancel()}>
    <div class="modal-content" on:click|stopPropagation>
      <h2>Add Pin</h2>
      
      <div class="form-group">
        <label>Type</label>
        <div class="pin-type-grid">
          {#each pinTypes as type}
            <button
              type="button"
              class="pin-type-btn"
              class:active={selectedType === type.value}
              on:click={() => selectedType = type.value}
            >
              <span class="emoji">{type.emoji}</span>
              <span class="label">{type.label}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="form-group">
        <label for="description">Description (optional)</label>
        <textarea
          id="description"
          bind:value={description}
          placeholder="Add details about this location..."
          rows="3"
        />
      </div>

      <div class="form-group">
        <label for="tags">Tags (optional)</label>
        <div class="tag-input-group">
          <input
            id="tags"
            type="text"
            bind:value={tagInput}
            on:keydown={handleKeydown}
            placeholder="Add a tag and press Enter"
          />
          <button type="button" on:click={addTag} disabled={!tagInput.trim()}>
            Add
          </button>
        </div>
        {#if tags.length > 0}
          <div class="tags-list">
            {#each tags as tag}
              <span class="tag">
                {tag}
                <button type="button" class="tag-remove" on:click={() => removeTag(tag)}>×</button>
              </span>
            {/each}
          </div>
        {/if}
      </div>

      <div class="form-actions">
        <button type="button" class="btn-secondary" on:click={cancel}>
          Cancel
        </button>
        <button type="button" class="btn-primary" on:click={submit}>
          Add Pin
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-overlay {
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

  .modal-content {
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  h2 {
    margin: 0 0 20px 0;
    font-size: 24px;
  }

  .form-group {
    margin-bottom: 20px;
  }

  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    font-size: 14px;
  }

  .pin-type-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 8px;
  }

  .pin-type-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
  }

  .pin-type-btn:hover {
    border-color: #4a90e2;
    background: #f0f7ff;
  }

  .pin-type-btn.active {
    border-color: #4a90e2;
    background: #e3f2fd;
  }

  .emoji {
    font-size: 24px;
  }

  .label {
    font-size: 12px;
    font-weight: 500;
  }

  textarea {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: inherit;
    font-size: 14px;
    resize: vertical;
  }

  .tag-input-group {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  }

  .tag-input-group input {
    flex: 1;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }

  .tag-input-group button {
    padding: 8px 16px;
    border: 1px solid #4a90e2;
    border-radius: 4px;
    background: #4a90e2;
    color: white;
    cursor: pointer;
    font-size: 14px;
  }

  .tag-input-group button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    background: #e3f2fd;
    border-radius: 12px;
    font-size: 12px;
  }

  .tag-remove {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 0;
    color: #666;
  }

  .tag-remove:hover {
    color: #000;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
  }

  .btn-primary,
  .btn-secondary {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
  }

  .btn-primary {
    background: #4a90e2;
    color: white;
  }

  .btn-primary:hover {
    background: #357abd;
  }

  .btn-secondary {
    background: #f5f5f5;
    color: #333;
  }

  .btn-secondary:hover {
    background: #e0e0e0;
  }
</style>

