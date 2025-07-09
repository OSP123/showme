<script lang="ts">
  import { onDestroy } from 'svelte';
  import { Marker } from 'maplibre-gl';
  import type { Map as GLMap } from 'maplibre-gl';
  import type { PinRow } from '$lib/models';
  import { initLocalDb } from '$lib/db/pglite';

  export let map: GLMap;
  export let mapId: string;

  let markers: Marker[] = [];
  let unsubscribe: () => void;
  let syncInitialized = false;

  async function drawPins() {
    const db = await initLocalDb();
    const res = await db.query(
      `SELECT * FROM pins WHERE map_id=$1 ORDER BY created_at`, [mapId]
    );
    
    // remove old markers
    markers.forEach(m => m.remove());
    markers = [];
    
    // add new markers
    markers = res.rows.map(pin =>
      new Marker({ color: 'red' })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map)
    );
  }

  async function setupSync() {
    if (syncInitialized) return;
    syncInitialized = true;
    
    try {
      await drawPins(); // initial draw
      
      const db = await initLocalDb();
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
      
      unsubscribe = stream.subscribe(drawPins);
    } catch (error) {
      console.error('Failed to setup sync:', error);
      syncInitialized = false; // Reset so we can try again
    }
  }

  // Reactive statement - only runs when map or mapId changes
  $: if (map && mapId && !syncInitialized) {
    setupSync();
  }

  onDestroy(() => {
    unsubscribe?.();
  });
</script>