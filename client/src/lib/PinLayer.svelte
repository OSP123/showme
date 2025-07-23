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
  let lastPinCount = -1;

  async function drawPins() {
    const db = await initLocalDb();
    const res = await db.query(
      `SELECT * FROM pins WHERE map_id=$1 ORDER BY created_at`, [mapId]
    );
    
    console.log(`🔍 Drawing pins for map ${mapId}:`, res.rows.length, 'pins found');
    
    // Only update if the pin count changed
    if (res.rows.length === lastPinCount) {
      console.log('📌 Pin count unchanged, skipping redraw');
      return;
    }
    
    console.log('Pin data:', res.rows);
    
    // Remove old markers
    markers.forEach(m => m.remove());
    markers = [];
    
    // Add new markers with coordinate conversion
    markers = res.rows.map((pin, index) => {
      // Convert string coordinates to numbers (fix for ElectricSQL sync)
      const lat = typeof pin.lat === 'string' ? parseFloat(pin.lat) : pin.lat;
      const lng = typeof pin.lng === 'string' ? parseFloat(pin.lng) : pin.lng;
      
      console.log(`📍 Creating marker ${index + 1} at [${lng}, ${lat}]`);
      
      const marker = new Marker({ color: 'red' })
        .setLngLat([lng, lat])
        .addTo(map);
      
      return marker;
    });
    
    lastPinCount = res.rows.length;
    console.log(`✅ Total markers on map: ${markers.length}`);
  }

  async function setupSync() {
    try {
      await drawPins(); // initial draw
      
      console.log('🔄 Pin polling started for map:', mapId);
      
      // Simple polling - no ElectricSQL sync setup here since it's done globally
      const pollInterval = setInterval(async () => {
        try {
          const currentDb = await initLocalDb();
          const currentRes = await currentDb.query(
            `SELECT COUNT(*) as count FROM pins WHERE map_id=$1`, [mapId]
          );
          const currentCount = parseInt(currentRes.rows[0].count);
          
          if (currentCount !== lastPinCount) {
            console.log(`📊 Pin count changed: ${lastPinCount} → ${currentCount}`);
            await drawPins();
          }
        } catch (error) {
          console.error('❌ Error polling for pin updates:', error);
        }
      }, 1000);
      
      unsubscribe = () => {
        console.log('🧹 Cleaning up sync for map:', mapId);
        clearInterval(pollInterval);
      };
      
    } catch (error) {
      console.error('❌ Failed to setup sync:', error);
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
    lastPinCount = -1; // Reset pin count
    console.log('🗺️ Setting up PinLayer for new map:', mapId);
    syncPromise = setupSync();
  }

  onDestroy(() => {
    unsubscribe?.();
    // Clean up markers
    markers.forEach(m => m.remove());
    markers = [];
  });
</script>