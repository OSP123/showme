<script lang="ts">
  import { onMount } from 'svelte';
  import CreateMap from '$lib/CreateMap.svelte';
  import MapView   from '$lib/MapView.svelte';
  import PinLayer  from '$lib/PinLayer.svelte';
  import CreatePin from '$lib/CreatePin.svelte';
  import QuickPin from '$lib/QuickPin.svelte';
  import ShareMap from '$lib/ShareMap.svelte';
  import SyncStatus from '$lib/SyncStatus.svelte';
  import PinFilter from '$lib/PinFilter.svelte';
  import PanicWipe from '$lib/PanicWipe.svelte';
  import { initLocalDb }    from '$lib/db/pglite';
  import { createMap, addPin, getPins } from '$lib/api';
  import type { Map as GLMap }  from 'maplibre-gl';
  import type { PinData, MapRow, PinType } from '$lib/models';

  let db: any;
  let mapId = '';
  let mapInstance: GLMap | null = null;
  let mapData: MapRow | null = null;
  let showCreatePin = false;
  let showQuickPin = false;
  let pinLocation: { lat: number; lng: number } | null = null;
  let selectedPinTypes: PinType[] = [];
  let showFilter = false;
  let showPanicWipe = false;

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
  $: {
    console.log('App state:', { mapId, mapInstance: !!mapInstance, db: !!db });
    if (!mapId && db) {
      console.log('ℹ️ No mapId - showing CreateMap screen. Create a map or add ?map=<id> to URL');
    }
  }

  onMount(async () => {
    db = await initLocalDb();
    
    // Check if there's a mapId in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlMapId = urlParams.get('map');
    if (urlMapId) {
      mapId = urlMapId;
      await loadMapData();
    } else {
      // If no mapId in URL, try to load the first available map
      try {
        const result = await db.query('SELECT id FROM maps ORDER BY created_at DESC LIMIT 1');
        if (result.rows.length > 0) {
          mapId = result.rows[0].id;
          // Update URL to include the map ID
          const url = new URL(window.location.href);
          url.searchParams.set('map', mapId);
          window.history.replaceState({}, '', url);
          await loadMapData();
        }
      } catch (error) {
        console.error('Failed to load first map:', error);
      }
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
      // Show QuickPin by default for crisis scenarios
      showQuickPin = true;
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
      showQuickPin = false;
      pinLocation = null;
    } catch (error) {
      console.error('Failed to add pin:', error);
    }
  }

  async function handleQuickPinCreate(event: CustomEvent<{ type: PinType; lat: number; lng: number }>) {
    if (!pinLocation) return;
    
    try {
      const pinData: PinData = {
        map_id: mapId,
        lat: event.detail.lat,
        lng: event.detail.lng,
        type: event.detail.type,
      };
      
      await addPin(db, pinData);
      console.log('Quick pin added successfully');
      
      // Close the quick pin modal
      showQuickPin = false;
      pinLocation = null;
    } catch (error) {
      console.error('Failed to add quick pin:', error);
    }
  }

  function handlePinCancel() {
    showCreatePin = false;
    showQuickPin = false;
    pinLocation = null;
  }

  function handlePanicWipeComplete() {
    showPanicWipe = false;
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

  @media (max-width: 480px) {
    .map-container {
      min-height: 100vh;
      min-height: -webkit-fill-available; /* iOS Safari fix */
    }
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
    display: flex;
    gap: 8px;
    flex-direction: column;
  }

  @media (max-width: 480px) {
    .map-controls {
      top: 8px;
      left: 8px;
      gap: 6px;
    }

    .filter-toggle-btn {
      padding: 10px;
      font-size: 20px;
      gap: 0;
      min-width: 44px; /* Minimum touch target size */
      justify-content: center;
    }

    .filter-toggle-btn span:last-child {
      display: none; /* Hide "Filter" text on mobile, show only icon */
    }

    .panic-btn {
      padding: 10px 14px;
      font-size: 13px;
      gap: 4px;
      min-width: 44px; /* Minimum touch target size */
    }

    .filter-panel {
      top: 8px;
      left: 8px;
      margin-top: 50px;
    }
  }

  .filter-toggle-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: white;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    touch-action: manipulation; /* Prevent double-tap zoom */
  }

  .filter-toggle-btn:hover {
    background: #f5f5f5;
  }

  .panic-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #dc2626;
    color: white;
    border: 1px solid #b91c1c;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    touch-action: manipulation; /* Prevent double-tap zoom */
    min-height: 44px; /* Minimum touch target size */
  }

  .panic-btn:hover {
    background: #b91c1c;
  }

  .filter-panel {
    position: absolute;
    top: 16px;
    left: 16px;
    margin-top: 60px;
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
        <button class="filter-toggle-btn" on:click={() => showFilter = !showFilter}>
          <span>🔍</span>
          Filter
        </button>
        <button 
          class="panic-btn" 
          on:click={() => showPanicWipe = true}
          title="Emergency data wipe"
        >
          🚨 Wipe
        </button>
      </div>

      {#if showFilter}
        <div class="filter-panel">
          <PinFilter
            bind:selectedTypes={selectedPinTypes}
            on:filterChange={(e) => {
              selectedPinTypes = e.detail.types;
            }}
          />
        </div>
      {/if}

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
          filterTypes={selectedPinTypes}
        />
      {/if}

      {#if showQuickPin && pinLocation}
        <QuickPin
          lat={pinLocation.lat}
          lng={pinLocation.lng}
          open={showQuickPin}
          on:create={handleQuickPinCreate}
          on:cancel={handlePinCancel}
          on:advanced={() => {
            showQuickPin = false;
            showCreatePin = true;
          }}
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

      <PanicWipe
        {db}
        open={showPanicWipe}
        on:wiped={handlePanicWipeComplete}
        on:cancel={() => showPanicWipe = false}
      />
    </div>
  {/if}
</main>