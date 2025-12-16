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
  import EncryptionSetup from '$lib/EncryptionSetup.svelte';
  import EncryptionTest from '$lib/EncryptionTest.svelte';
  import { initLocalDb }    from '$lib/db/pglite';
  import { createMap, addPin, updatePin, getPins, getMap } from '$lib/api';
  import type { Map as GLMap }  from 'maplibre-gl';
  import type { PinData, MapRow, PinType, PinRow } from '$lib/models';

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
  let showEncryptionSetup = false;
  let editMode = false;
  let editPinId: string | null = null;
  let editPinData: Partial<PinData> | null = null;

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
    
    // Make testEncryption available globally for console testing
    try {
      const { testEncryption } = await import('$lib/testEncryption');
      (window as any).testEncryption = testEncryption;
      console.log('💡 Tip: Run testEncryption() in the console to test encryption');
    } catch (error) {
      // Ignore if module not found
    }
    
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
      mapData = await getMap(db, mapId);
      
      // If map doesn't exist, clear mapId and show CreateMap screen
      if (!mapData) {
        console.warn(`⚠️ Map ${mapId} does not exist, clearing from URL`);
        mapId = '';
        const url = new URL(window.location.href);
        url.searchParams.delete('map');
        window.history.replaceState({}, '', url);
      }
    } catch (error) {
      console.error('Failed to load map data:', error);
      // Map doesn't exist, clear mapId
      mapId = '';
      const url = new URL(window.location.href);
      url.searchParams.delete('map');
      window.history.replaceState({}, '', url);
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
    mapInstance.on('click', (e) => {
      // Don't show pin menu if clicking on a marker/popup
      // MapLibre sets e.originalEvent.target, check if it's a marker element
      const target = e.originalEvent?.target as HTMLElement;
      if (target && (
        target.closest('.maplibregl-marker') || 
        target.closest('.maplibregl-popup') ||
        target.closest('.custom-marker') ||
        target.closest('.cluster-marker')
      )) {
        return; // Ignore clicks on markers/popups
      }
      
      console.log('Map clicked at:', e.lngLat);
      pinLocation = { lat: e.lngLat.lat, lng: e.lngLat.lng };
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
    
    if (!db || !mapId) return;
    
    // Check if map exists before creating pin
    try {
      const mapCheck = await db.query('SELECT id FROM maps WHERE id = $1', [mapId]);
      if (mapCheck.rows.length === 0) {
        console.error('❌ Map does not exist - cannot create pin. Please create a new map first.');
        // Clear mapId from URL and show CreateMap screen
        mapId = '';
        mapData = null;
        const url = new URL(window.location.href);
        url.searchParams.delete('map');
        window.history.replaceState({}, '', url);
        alert('The map no longer exists. Please create a new map first.');
        return;
      }
    } catch (error) {
      console.error('Failed to check if map exists:', error);
      return;
    }
    
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
    editMode = false;
    editPinId = null;
    editPinData = null;
  }

  async function handlePinUpdate(event: CustomEvent<{ pinId: string; updates: Partial<PinData> }>) {
    const { pinId, updates } = event.detail;
    
    try {
      await updatePin(db, pinId, updates);
      console.log('Pin updated successfully');
      
      // Close the edit modal
      showCreatePin = false;
      editMode = false;
      editPinId = null;
      editPinData = null;
      pinLocation = null;
    } catch (error) {
      console.error('Failed to update pin:', error);
    }
  }

  // Make edit function available globally for PinLayer
  if (typeof window !== 'undefined') {
    (window as any).editPin = async (pin: PinRow) => {
      editMode = true;
      editPinId = pin.id;
      editPinData = {
        type: pin.type || undefined,
        description: pin.description || undefined,
        tags: pin.tags || [],
        photo_urls: pin.photo_urls || [],
      };
      pinLocation = { lat: Number(pin.lat), lng: Number(pin.lng) };
      showCreatePin = true;
      showQuickPin = false;
    };
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

    .new-map-btn {
      padding: 10px 14px;
      font-size: 13px;
      gap: 4px;
      min-width: 44px;
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

  .new-map-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    touch-action: manipulation;
    min-height: 44px;
  }

  .new-map-btn:hover {
    background: #2563eb;
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

  .encryption-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 12px;
    background: white;
    color: #333;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    font-size: 18px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    touch-action: manipulation;
    min-width: 44px;
    min-height: 44px;
  }

  .encryption-btn:hover {
    background: #f5f5f5;
  }

  .encryption-panel {
    position: absolute;
    top: 16px;
    right: 16px;
    z-index: 100;
    max-width: 400px;
    width: calc(100% - 32px);
  }

  @media (max-width: 480px) {
    .encryption-btn {
      padding: 10px;
      font-size: 20px;
    }

    .encryption-panel {
      top: 8px;
      right: 8px;
      width: calc(100% - 16px);
      max-width: none;
    }
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
        <button 
          class="new-map-btn" 
          on:click={() => {
            mapId = '';
            const url = new URL(window.location.href);
            url.searchParams.delete('map');
            window.history.pushState({}, '', url);
          }}
          title="Create a new map"
        >
          ➕ New Map
        </button>
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
        <button 
          class="encryption-btn" 
          on:click={() => showEncryptionSetup = !showEncryptionSetup}
          title="Database encryption settings"
        >
          🔒
        </button>
      </div>

      {#if showEncryptionSetup}
        <div class="encryption-panel">
          <EncryptionSetup />
          <EncryptionTest />
        </div>
      {/if}

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
          mode={editMode ? 'edit' : 'create'}
          pinId={editPinId}
          initialData={editPinData}
          on:create={handlePinCreate}
          on:update={handlePinUpdate}
          on:cancel={handlePinCancel}
        />
      {/if}

    </div>
  {/if}

  <!-- PanicWipe should be available regardless of map state -->
  <PanicWipe
    {db}
    open={showPanicWipe}
    on:wiped={handlePanicWipeComplete}
    on:cancel={() => showPanicWipe = false}
  />
</main>