<script lang="ts">
  import { onMount } from 'svelte';
  import CreateMap from '$lib/CreateMap.svelte';
  import MapView   from '$lib/MapView.svelte';
  import PinLayer  from '$lib/PinLayer.svelte';
  import { initLocalDb }    from '$lib/db/pglite';
  import { createMap, addPin } from '$lib/api';
  import type { Map as GLMap }  from 'maplibre-gl';

  let db: any;
  let mapId = '';
  let mapInstance: GLMap | null = null;

  // OpenStreetMap raster style
  const osmStyle = {
    id: 'OSM Raster',
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        minzoom: 0,
        maxzoom: 19,
        attribution:
          '© <a href="https://openstreetmap.org" target="_blank" rel="noopener">OSM contributors</a>'
      }
    },
    layers: [
      { id: 'osm', type: 'raster', source: 'osm', layout: { visibility: 'visible' } }
    ]
  };

  // Debug logging
  $: console.log('App state:', { mapId, mapInstance, db });

  onMount(async () => {
    db = await initLocalDb();
  });

  async function handleCreate(event: CustomEvent<{ name: string; isPrivate: boolean }>) {
    console.log('Creating map with:', event.detail);
    try {
      const { name, isPrivate } = event.detail;
      const result = await createMap(db, name, isPrivate);
      console.log('Map created:', result);
      mapId = result.id;
    } catch (error) {
      console.error('Failed to create map:', error);
    }
  }

  function handleMapLoad(event: CustomEvent<{ map: GLMap }>) {
    console.log('Map loaded:', event.detail);
    mapInstance = event.detail.map;
    mapInstance.on('click', async ({ lngLat }) => {
      console.log('Map clicked at:', lngLat);
      try {
        await addPin(db, {
          map_id: mapId,
          lat: lngLat.lat,
          lng: lngLat.lng
        });
        console.log('Pin added successfully');
      } catch (error) {
        console.error('Failed to add pin:', error);
      }
    });
  }
</script>

<style>
  main { 
    width: 100vw; 
    height: 100vh; 
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    background-color: #f0f0f0; /* Debug background */
  }
  
  .map-container {
    flex: 1;
    width: 100%;
    height: 100%;
    position: relative;
    background-color: #e0e0e0; /* Debug background */
    min-height: 500px; /* Ensure minimum height */
  }
  
  .create-map-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    background-color: white;
  }
</style>

<main>
  {#if !mapId}
    <div class="create-map-container">
      <CreateMap disabled={!db} on:create={handleCreate} />
    </div>
  {:else}
    <div class="map-container">
      <MapView
        style={osmStyle}
        center={[0, 0]}
        zoom={2}
        on:load={handleMapLoad}
      />
      {#if mapInstance}
        <PinLayer
          map={mapInstance}
          mapId={mapId}
        />
      {/if}
    </div>
  {/if}
</main>