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

  onMount(async () => {
    db = await initLocalDb();
  });

  async function handleCreate(event: CustomEvent<{ name: string; isPrivate: boolean }>) {
    const { name, isPrivate } = event.detail;
    const { id } = await createMap(db, name, isPrivate);
    mapId = id;
  }

  function handleMapLoad(event: CustomEvent<{ map: GLMap }>) {
    mapInstance = event.detail.map;
    mapInstance.on('click', async ({ lngLat }) => {
      await addPin(db, {
        map_id: mapId,
        lat:    lngLat.lat,
        lng:    lngLat.lng
      });
    });
  }
</script>

<style>
  main { width: 100vw; height: 100vh; }
</style>

<main>
  {#if !mapId}
    <CreateMap disabled={!db} on:create={handleCreate} />
  {:else}
    <MapView
      style={osmStyle}
      on:load={handleMapLoad}
    />
    {#if mapInstance}
      <PinLayer
        map={mapInstance}
        mapId={mapId}
      />
    {/if}
  {/if}
</main>
