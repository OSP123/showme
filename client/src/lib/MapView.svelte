<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import maplibregl, { type Map as GLMap } from 'maplibre-gl';
  import 'maplibre-gl/dist/maplibre-gl.css';
  import { getUserLocation } from './geolocation';

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

      // Try to center on user's location
      getUserLocation().then((loc) => {
        if (loc) {
          map.flyTo({ center: loc.center, zoom: loc.zoom, duration: 1500 });
        }
      });
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