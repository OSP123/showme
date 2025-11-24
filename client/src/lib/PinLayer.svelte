<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Marker, Popup } from 'maplibre-gl';
  import type { Map as GLMap } from 'maplibre-gl';
  import type { PinRow } from '$lib/models';
  import { initLocalDb } from '$lib/db/pglite';

  export let map: GLMap;
  export let mapId: string;
  
  // Set up global error handler for unhandled promise rejections from ElectricSQL
  onMount(() => {
    const handler = (event: PromiseRejectionEvent) => {
      const errorMsg = event.reason?.message || String(event.reason);
      // Ignore duplicate key errors from ElectricSQL sync - these are expected
      if (errorMsg.includes('duplicate key') || errorMsg.includes('UNIQUE constraint')) {
        console.debug('⚠️ Ignoring duplicate key error from ElectricSQL (expected)');
        event.preventDefault(); // Prevent error from being logged to console
        return;
      }
    };
    
    window.addEventListener('unhandledrejection', handler);
    
    return () => {
      window.removeEventListener('unhandledrejection', handler);
    };
  });

  let markers: Marker[] = [];
  let unsubscribe: (() => void) | undefined;
  let currentMapId = '';

  function getPinColor(pin: PinRow): string {
    try {
      const tags = pin.tags ? JSON.parse(pin.tags) : [];
      if (Array.isArray(tags) && tags.length > 0) {
        const type = tags[0];
        const colorMap: Record<string, string> = {
          medical: '#e74c3c',
          water: '#3498db',
          checkpoint: '#f39c12',
          shelter: '#2ecc71',
          food: '#9b59b6',
          danger: '#e67e22',
          other: '#95a5a6',
        };
        return colorMap[type] || '#95a5a6';
      }
    } catch (e) {
      // Invalid JSON, use default
    }
    return '#95a5a6';
  }

  function getPinEmoji(pin: PinRow): string {
    try {
      const tags = pin.tags ? JSON.parse(pin.tags) : [];
      if (Array.isArray(tags) && tags.length > 0) {
        const type = tags[0];
        const emojiMap: Record<string, string> = {
          medical: '🏥',
          water: '💧',
          checkpoint: '🚧',
          shelter: '🏠',
          food: '🍽️',
          danger: '⚠️',
          other: '📍',
        };
        return emojiMap[type] || '📍';
      }
    } catch (e) {
      // Invalid JSON, use default
    }
    return '📍';
  }

  async function drawPins() {
    if (!map) return;
    
    const db = await initLocalDb();
    const res = await db.query(
      `SELECT * FROM pins WHERE map_id=$1 ORDER BY created_at`, 
      [mapId]
    );
    
    console.log(`🔍 Drawing pins for map ${mapId}:`, res.rows.length, 'pins found');
    
    // Remove old markers
    markers.forEach(m => m.remove());
    markers = [];
    
    // Add new markers with emoji icons and colors
    markers = res.rows.map((pin) => {
      // Convert string coordinates to numbers (fix for ElectricSQL sync)
      const lat = typeof pin.lat === 'string' ? parseFloat(pin.lat) : pin.lat;
      const lng = typeof pin.lng === 'string' ? parseFloat(pin.lng) : pin.lng;
      
      const emoji = getPinEmoji(pin);
      
      // Create marker element with emoji
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.innerHTML = `<span style="font-size: 24px;">${emoji}</span>`;
      el.style.cursor = 'pointer';
      
      const marker = new Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
      
      // Add popup with pin details
      if (pin.description || pin.tags) {
        let popupContent = `<div class="pin-popup">`;
        
        if (pin.description) {
          popupContent += `<p><strong>${pin.description}</strong></p>`;
        }
        
        try {
          const tags = pin.tags ? JSON.parse(pin.tags) : [];
          if (Array.isArray(tags) && tags.length > 0) {
            popupContent += `<div class="pin-tags">`;
            tags.forEach((tag: string) => {
              popupContent += `<span class="pin-tag">${tag}</span>`;
            });
            popupContent += `</div>`;
          }
        } catch (e) {
          // Invalid tags JSON
        }
        
        popupContent += `</div>`;
        
        const popup = new Popup({ offset: 25, closeButton: true })
          .setHTML(popupContent);
        
        marker.setPopup(popup);
      }
      
      return marker;
    });
    
    console.log(`✅ Total markers on map: ${markers.length}`);
  }

  async function setupSync() {
    try {
      await drawPins(); // initial draw
      
      const db = await initLocalDb();
      
      // Skip ElectricSQL sync for pins due to schema mismatch (TEXT[] vs TEXT)
      // Instead, poll both local DB and PostgREST to get updates
      console.log('🔄 Using polling for pin updates');
      
      let lastPinCount = 0;
      
      // Poll function that checks both local and server
      const pollForUpdates = async () => {
        try {
          // Check local database
          await drawPins();
          
          // Also fetch from PostgREST to get pins from other clients
          try {
            const response = await fetch(
              `http://localhost:3015/pins?map_id=eq.${mapId}&select=*&order=created_at.desc`
            );
            if (response.ok) {
              const serverPins = await response.json();
              
              // Convert server pins (TEXT[] arrays) to local format and insert
              for (const serverPin of serverPins) {
                // Check if pin already exists locally
                const existing = await db.query(
                  `SELECT id FROM pins WHERE id = $1`,
                  [serverPin.id]
                );
                
                if (existing.rows.length === 0) {
                  // Convert arrays to JSON strings
                  const tagsJson = Array.isArray(serverPin.tags) 
                    ? JSON.stringify(serverPin.tags) 
                    : (serverPin.tags || '[]');
                  const photoUrlsJson = Array.isArray(serverPin.photo_urls)
                    ? JSON.stringify(serverPin.photo_urls)
                    : (serverPin.photo_urls || '[]');
                  
                  // Insert into local database
                  await db.query(
                    `INSERT INTO pins (id, map_id, lat, lng, tags, description, photo_urls, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     ON CONFLICT (id) DO NOTHING`,
                    [
                      serverPin.id,
                      serverPin.map_id,
                      serverPin.lat,
                      serverPin.lng,
                      tagsJson,
                      serverPin.description || null,
                      photoUrlsJson,
                      serverPin.created_at,
                      serverPin.updated_at
                    ]
                  );
                  
                  // Redraw to show new pin
                  await drawPins();
                }
              }
            }
          } catch (fetchError) {
            // PostgREST might be unavailable, that's okay
            console.debug('PostgREST fetch failed (expected if offline):', fetchError);
          }
        } catch (error) {
          console.error('❌ Error polling for updates:', error);
        }
      };
      
      // Poll every 2 seconds
      const pollInterval = setInterval(pollForUpdates, 2000);
      
      unsubscribe = () => {
        clearInterval(pollInterval);
      };
      
    } catch (error) {
      console.error('Failed to setup sync:', error);
    }
  }

  // Reactive: setup when map or mapId changes
  $: if (map && mapId && mapId !== currentMapId) {
    // Clean up previous subscription
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = undefined;
    }
    
    currentMapId = mapId;
    setupSync();
  }

  onDestroy(() => {
    unsubscribe?.();
    // Clean up markers
    markers.forEach(m => m.remove());
    markers = [];
  });
</script>

<style>
  :global(.custom-marker) {
    background: none;
    border: none;
    cursor: pointer;
  }

  :global(.pin-popup) {
    max-width: 200px;
  }

  :global(.pin-tags) {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 8px;
  }

  :global(.pin-tag) {
    display: inline-block;
    padding: 2px 8px;
    background: #e3f2fd;
    border-radius: 12px;
    font-size: 11px;
    color: #1976d2;
  }
</style>