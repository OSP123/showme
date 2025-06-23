<script lang="ts">
	import '$styles/map.css';

  import type { PGliteWithSync } from '@electric-sql/pglite-sync';
  import type { ShapeStream, FetchError } from '@electric-sql/client';
  import type { ShapeData } from '@electric-sql/client';

	import { onMount } from 'svelte';
	import { PGlite } from '@electric-sql/pglite';
	import {
		MapLibre,
		GeoJSON,
		CircleLayer,
	} from 'svelte-maplibre';

  import { getDbOnce } from '$lib/db/pglite';

	let db: PGlite | undefined = $state(undefined);
	let testSync: ShapeStream | undefined;
  let { maplibreMap = $bindable() } = $props()
	let loaded: boolean = $state(false);

  const osmStyle = {
    id: 'OSM Raster',
    version: 8,
    name: 'OpenStreetMap',
    sources: {
      osm: {
        type: 'raster',
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ],
        minzoom: 0,
        maxzoom: 19,
        attribution:
          '© <a target="_blank" rel="noopener" href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a>',
      },
    },
    layers: [
      {
        id: 'osm',
        type: 'raster',
        source: 'osm',
        layout: {
          visibility: 'visible',
        },
      },
    ],
  };

	onMount(async () => {
    db = await getDbOnce();

    // Test the database works
    const response = await db?.query('SELECT * FROM pg_catalog.pg_tables;');
    console.log(response);
	});

	async function getTestTableSync(db: PGliteWithSync, mapId: number): Promise<ShapeStream | undefined> {
		if (!db || !mapId) {
			return;
		}

		testSync = await db.electric.syncShapeToTable({
			shape: {
				url: `${import.meta.env.VITE_SYNC_URL}/v1/shape`,
				params: {
					table: 'test',
					where: `map_id=${mapId}`,
				},
			},
			table: 'test',
			primaryKey: ['map_id'],
			shapeKey: 'test',
			initialInsertMethod: 'csv', // performance boost on initial sync
		});
  }
</script>

<main class="flex flex-col h-screen overflow-hidden font-barlow">
  <MapLibre
    style={osmStyle}
    class="map"
    center={[0, 0]}
    zoom={2}
    standardControls
    attributionControl={false}
  >
    <GeoJSON
      id="pois"
      data={{
        "type": "Point",
        "coordinates": [1.501641, 55.454522]
      }}
    >
      <CircleLayer
        id="poi-circles"
        hoverCursor="pointer"
        paint={{
            'circle-color': 'red',
            'circle-radius': 8,
            'circle-stroke-width': 2,
            'circle-stroke-color': 'white',
          }}
      />
    </GeoJSON>
  </MapLibre>
</main>
