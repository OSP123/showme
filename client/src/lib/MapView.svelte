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
    console.log('MapView mounting, container:', container);
    const map = new maplibregl.Map({ 
      container, 
      style, 
      center, 
      zoom 
    });
    
    map.on('load', () => {
      console.log('MapLibre map loaded successfully');
      window.map = map;
      dispatch('load', { map });
    });
    
    map.on('error', (e) => {
      console.error('MapLibre error:', e);
    });
    
    return () => map.remove();
  });


</script>

<style>
  .map-container {
    width: 100%;
    height: 100%;
    min-height: 400px; /* Fallback minimum height */
  }
</style>

<div bind:this={container} class="map-container" />