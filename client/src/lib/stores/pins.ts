// src/lib/stores/pins.ts
import { readable } from 'svelte/store';
import type { PinRow } from '$lib/models';
import { initLocalDb } from '$lib/db/pglite';
import type { ShapeStream } from '@electric-sql/pglite-sync';

const shapeStreams = new Map<string, Promise<ShapeStream>>();

export function pinsStore(mapId: string) {
  return readable<PinRow[]>([], (set) => {
    let localStream: ShapeStream | null = null;

    // kick off async work
    (async () => {
      if (!mapId) return;

      const db = await initLocalDb();

      // 1) initial load
      const { rows } = await db.query<{ rows: PinRow[] }>(
        `SELECT * FROM pins WHERE map_id = $1 ORDER BY created_at`,
        [mapId]
      );
      set(rows);

      // 2) get-or-create a single ShapeStream per map
      const key = `pins_${mapId}`;
      let streamPromise = shapeStreams.get(key);
      if (!streamPromise) {
        streamPromise = db.electric.syncShapeToTable({
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
          shapeKey:   key,
          initialInsertMethod: 'json'
        });
        shapeStreams.set(key, streamPromise);
      }

      // 3) once you have the stream, subscribe to it
      localStream = await streamPromise;
      localStream.subscribe(async () => {
        const { rows } = await db.query<{ rows: PinRow[] }>(
          `SELECT * FROM pins WHERE map_id = $1 ORDER BY created_at`,
          [mapId]
        );
        set(rows);
      });
    })().catch(console.error);

    // teardown: unsubscribe the local subscriber only
    return () => {
      if (localStream) localStream.unsubscribe();
    };
  });
}
