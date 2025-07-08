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

  async function drawPins() {
    const db = await initLocalDb();
    const res = await db.query<{ rows: PinRow[] }>(
      `SELECT * FROM pins WHERE map_id=$1 ORDER BY created_at`, [mapId]
    );
    // remove old
    markers.forEach(m => m.remove());
    markers = [];
    // add new
    markers = res.rows.map(pin =>
      new Marker({ color: 'red' })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map)
    );
  }

  $: if (map && mapId) {
    drawPins(); // initial draw

    (async () => {
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
    })();
  }

  onDestroy(() => {
    unsubscribe?.();
  });
</script>
