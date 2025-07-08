<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  export let disabled = false;
  let name = '';
  let isPrivate = false;
  const dispatch = createEventDispatcher();

  function submit() {
    if (!name) return;
    dispatch('create', { name, isPrivate });
  }
</script>

<div class="controls">
  <h2>Create a Map</h2>
  <input
    type="text"
    placeholder="Map name"
    bind:value={name}
    disabled={disabled}
  />
  <label>
    <input
      type="checkbox"
      bind:checked={isPrivate}
      disabled={disabled}
    />
    Private
  </label>
  <button on:click={submit} disabled={!name || disabled}>
    {#if disabled}Creating…{:else}Create Map{/if}
  </button>
</div>
