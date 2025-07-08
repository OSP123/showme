<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import maplibregl, { type Map as GLMap } from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';

  export let style: any;
  export let center: [number, number] = [0, 0];
  export let zoom = 2;

  const dispatch = createEventDispatcher();
  let container: HTMLDivElement;

  onMount(() => {
    const map = new maplibregl.Map({ container, style, center, zoom });
    map.on('load', () => dispatch('load', { map }));
    return () => map.remove();
  });
</script>

<div bind:this={container} class="w-full h-full" />
