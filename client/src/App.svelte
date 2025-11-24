<script lang="ts">
  import { onMount } from 'svelte';
  import CreateMap from '$lib/CreateMap.svelte';
  import MapView   from '$lib/MapView.svelte';
  import PinLayer  from '$lib/PinLayer.svelte';
  import CreatePin from '$lib/CreatePin.svelte';
  import ShareMap from '$lib/ShareMap.svelte';
  import SyncStatus from '$lib/SyncStatus.svelte';
  import { initLocalDb }    from '$lib/db/pglite';
  import { createMap, addPin, getPins } from '$lib/api';
  import type { Map as GLMap }  from 'maplibre-gl';
  import type { PinData, MapRow } from '$lib/models';

  let db: any;
  let mapId = '';
  let mapInstance: GLMap | null = null;
  let mapData: MapRow | null = null;
  let showCreatePin = false;
  let pinLocation: { lat: number; lng: number } | null = null;

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
    
    // Check if there's a mapId in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlMapId = urlParams.get('map');
    if (urlMapId) {
      mapId = urlMapId;
      await loadMapData();
    }
  });

  async function loadMapData() {
    if (!db || !mapId) return;
    
    try {
      const result = await db.query(
        `SELECT * FROM maps WHERE id = $1`,
        [mapId]
      );
      
      if (result.rows.length > 0) {
        mapData = result.rows[0] as MapRow;
      }
    } catch (error) {
      console.error('Failed to load map data:', error);
    }
  }

  async function handleCreate(event: CustomEvent<{ name: string; isPrivate: boolean }>) {
    console.log('Creating map with:', event.detail);
    try {
      const { name, isPrivate } = event.detail;
      const result = await createMap(db, name, isPrivate);
      console.log('Map created:', result);
      mapId = result.id;
      
      // Update URL to include the map ID
      const url = new URL(window.location.href);
      url.searchParams.set('map', result.id);
      window.history.pushState({}, '', url);
      
      await loadMapData();
    } catch (error) {
      console.error('Failed to create map:', error);
    }
  }

  function handleMapLoad(event: CustomEvent<{ map: GLMap }>) {
    console.log('Map loaded:', event.detail);
    mapInstance = event.detail.map;
    mapInstance.on('click', ({ lngLat }) => {
      console.log('Map clicked at:', lngLat);
      pinLocation = { lat: lngLat.lat, lng: lngLat.lng };
      showCreatePin = true;
    });
  }

  async function handlePinCreate(event: CustomEvent<PinData>) {
    if (!pinLocation) return;
    
    try {
      const pinData: PinData = {
        ...event.detail,
        map_id: mapId,
        lat: pinLocation.lat,
        lng: pinLocation.lng,
      };
      
      await addPin(db, pinData);
      console.log('Pin added successfully');
      
      // Close the pin creation modal
      showCreatePin = false;
      pinLocation = null;
    } catch (error) {
      console.error('Failed to add pin:', error);
    }
  }

  function handlePinCancel() {
    showCreatePin = false;
    pinLocation = null;
  }

  // Reactive: load map data when mapId changes
  $: if (mapId && db) {
    loadMapData();
  }

  console.log('Environment check:', {
    SHAPE_URL: import.meta.env.VITE_ELECTRIC_SHAPE_URL,
    SOURCE_ID: import.meta.env.VITE_ELECTRIC_SOURCE_ID,
    ALL_ENV: import.meta.env
  });
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

  .map-controls {
    position: absolute;
    top: 16px;
    left: 16px;
    z-index: 100;
  }
</style>

<main>
  {#if !mapId}
    <div class="create-map-container">
      <CreateMap disabled={!db} on:create={handleCreate} />
    </div>
  {:else}
    <div class="map-container">
      <SyncStatus {db} />
      
      <div class="map-controls">
        {#if mapData}
          <ShareMap
            mapId={mapId}
            accessToken={mapData.access_token}
            isPrivate={mapData.is_private === 'true'}
          />
        {/if}
      </div>

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

      {#if showCreatePin && pinLocation}
        <CreatePin
          lat={pinLocation.lat}
          lng={pinLocation.lng}
          open={showCreatePin}
          on:create={handlePinCreate}
          on:cancel={handlePinCancel}
        />
      {/if}
    </div>
  {/if}
</main>