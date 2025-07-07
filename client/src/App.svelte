<script lang="ts">
  import { onMount } from 'svelte';
  import type { Map as GLMap, Marker as GLMarker } from 'maplibre-gl';
  import Map from '$lib/Map.svelte';
  import 'maplibre-gl/dist/maplibre-gl.css';

  import { initLocalDb } from '$lib/db/pglite';
  import { createMap, addPin, getPins } from '$lib/api';
  import type { PinRow } from '$lib/models';
  import type { ShapeStream } from '@electric-sql/pglite-sync';

  let db: any;

  // UI state
  let mapId     = '';
  let mapName   = '';
  let isPrivate = false;
  let loading   = false;

  // Map instance & markers
  let mapInstance: GLMap;
  let markers: GLMarker[] = [];
  let center: [number, number] = [0, 0];
  let zoom = 2;

  // OSM raster style
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
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
        layout: { visibility: 'visible' }
      }
    ]
  };

  // track active ShapeStream per mapId
  const pinStreams = new Map<string, ShapeStream>();

  onMount(async () => {
    db = await initLocalDb();
  });

  async function onCreateMap() {
    if (!db || !mapName) return;
    loading = true;
    const { id } = await createMap(db, mapName, isPrivate);
    mapId = id;
    loading = false;
  }

  async function drawPins() {
    if (!db || !mapId || !mapInstance) return;
    markers.forEach((m) => m.remove());
    markers = [];
    const list = await getPins(db, mapId);
    for (const pin of list) {
      const m = new GLMarker({ color: 'red' })
        .setLngLat([pin.lng, pin.lat])
        .addTo(mapInstance);
      markers.push(m);
    }
  }

  async function handleMapLoad(e: CustomEvent<{ map: GLMap }>) {
    mapInstance = e.detail.map;

    mapInstance.on('click', async ({ lngLat }) => {
      if (!mapId) return;
      await addPin(db, {
        map_id: mapId,
        lat:    lngLat.lat,
        lng:    lngLat.lng
      });
    });

    await drawPins();

    if (!pinStreams.has(mapId)) {
      const stream = await db.electric.syncShapeToTable({
        shape: {
          url: import.meta.env.VITE_ELECTRIC_SHAPE_URL,
          params: {
            table:     'pins',
            where:     `map_id=${mapId}`,
            source_id: import.meta.env.VITE_ELECTRIC_SOURCE_ID,
            secret:    import.meta.env.VITE_ELECTRIC_SECRET
          }
        },
        table:      'pins',
        primaryKey: ['id'],
        shapeKey:   `pins_${mapId}`,
        initialInsertMethod: 'json'
      });
      pinStreams.set(mapId, stream);

      stream.subscribe(async () => {
        await drawPins();
      });
    }
  }
</script>

<style>
  main       { width: 100vw; height: 100vh; }
  .controls  { padding: 1rem; background: #f9f9f9; }
  .controls input { margin-right: .5rem; }
</style>

<main>
  {#if !mapId}
    <div class="controls">
      <h2>Create a Map</h2>
      <input
        type="text"
        placeholder="Map name"
        bind:value={mapName}
        disabled={loading}
      />
      <label>
        <input
          type="checkbox"
          bind:checked={isPrivate}
          disabled={loading}
        />
        Private
      </label>
      <button on:click={onCreateMap} disabled={!mapName || loading}>
        {#if loading}Creating…{:else}Create Map{/if}
      </button>
    </div>
  {:else}
    <Map
      style={osmStyle}
      {center}
      {zoom}
      on:load={handleMapLoad}
      className="map"
    />
  {/if}
</main>
