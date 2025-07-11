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
  let currentMapId = '';
  let syncPromise: Promise<void> | null = null;

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
    try {
      await drawPins(); // initial draw
      
      const db = await initLocalDb();
      const subscription = await db.electric.syncShapeToTable({
        shape: {
          url: import.meta.env.VITE_ELECTRIC_SHAPE_URL,
          params: {
            table:     'pins',
            where:     `map_id='${mapId}'`,  // Fixed: quote the value
            source_id: import.meta.env.VITE_ELECTRIC_SOURCE_ID,
            secret:    import.meta.env.VITE_ELECTRIC_SECRET
          }
        },
        table:      'pins',
        primaryKey: ['id'],
        shapeKey:   `pins_${mapId}`,
        initialInsertMethod: 'json'
      });
      
      // Set up a simple polling mechanism to redraw pins when data changes
      // Since ElectricSQL handles the sync, we just need to periodically check for updates
      const pollInterval = setInterval(drawPins, 1000); // Check every second
      
      unsubscribe = () => {
        clearInterval(pollInterval);
        // Note: ElectricSQL doesn't provide an easy way to unsubscribe from individual shapes
        // The sync will continue, but we stop polling for updates
      };
      
    } catch (error) {
      console.error('Failed to setup sync:', error);
    }
  }

  // Better reactive approach - only runs when mapId actually changes
  $: if (map && mapId && mapId !== currentMapId) {
    // Clean up previous subscription
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = undefined;
    }
    
    currentMapId = mapId;
    syncPromise = setupSync();
  }

  onDestroy(() => {
    unsubscribe?.();
  });
</script>