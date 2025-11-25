<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Marker, Popup } from 'maplibre-gl';
  import type { Map as GLMap } from 'maplibre-gl';
  import type { PinRow } from '$lib/models';
  import { initLocalDb } from '$lib/db/pglite';
  import { getPinColor, getPinEmoji, getTimeAgo } from '$lib/pinUtils';
  import Supercluster from 'supercluster';

  export let map: GLMap;
  export let mapId: string;
  export let filterTypes: string[] = []; // Pin types to show (empty = show all)
  
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
  let clusters: Marker[] = [];
  let unsubscribe: (() => void) | undefined;
  let currentMapId = '';
  let clusterIndex: Supercluster | null = null;
  let useClustering = true; // Enable clustering by default


  async function drawPins() {
    if (!map) return;
    
    const db = await initLocalDb();
    const res = await db.query(
      `SELECT * FROM pins WHERE map_id=$1 ORDER BY created_at`, 
      [mapId]
    );
    
    // Filter pins by type if filter is active
    let filteredPins = res.rows;
    if (filterTypes.length > 0) {
      filteredPins = res.rows.filter((pin) => {
        try {
          const tags = pin.tags ? JSON.parse(pin.tags) : [];
          if (Array.isArray(tags) && tags.length > 0) {
            const pinType = tags[0];
            return filterTypes.includes(pinType);
          }
        } catch (e) {
          // Invalid tags JSON
        }
        // If no type or invalid, only show if 'other' is in filter
        return filterTypes.includes('other');
      });
    }
    
    console.log(`🔍 Drawing pins for map ${mapId}: ${filteredPins.length} of ${res.rows.length} pins (filtered)`);
    
    // Remove old markers and clusters
    markers.forEach(m => m.remove());
    clusters.forEach(c => c.remove());
    markers = [];
    clusters = [];
    
    // Use clustering if enabled and we have many pins
    if (useClustering && filteredPins.length > 10) {
      drawClusteredPins(filteredPins);
    } else {
      drawIndividualPins(filteredPins);
    }
  }

  function drawClusteredPins(pins: PinRow[]) {
    // Prepare points for supercluster
    const points = pins.map((pin, index) => {
      const lat = typeof pin.lat === 'string' ? parseFloat(pin.lat) : pin.lat;
      const lng = typeof pin.lng === 'string' ? parseFloat(pin.lng) : pin.lng;
      return {
        type: 'Feature' as const,
        properties: { pinIndex: index },
        geometry: {
          type: 'Point' as const,
          coordinates: [lng, lat]
        }
      };
    });

    // Initialize cluster index
    if (!clusterIndex) {
      clusterIndex = new Supercluster({
        radius: 50, // Cluster radius in pixels
        maxZoom: 16, // Max zoom to cluster points on
        minZoom: 0, // Min zoom to generate clusters on
        minPoints: 2 // Minimum points to form a cluster
      });
    }

    // Load points into cluster index
    clusterIndex.load(points);

    // Get current map bounds and zoom
    const bounds = map.getBounds();
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth()
    ];
    const zoom = Math.floor(map.getZoom());

    // Get clusters and points for current view
    const clusters_data = clusterIndex.getClusters(bbox, zoom);

    clusters_data.forEach((cluster) => {
      if (cluster.properties.cluster) {
        // It's a cluster - draw cluster marker
        const pointCount = cluster.properties.point_count;
        const el = document.createElement('div');
        el.className = 'cluster-marker';
        el.innerHTML = `<div class="cluster-inner">${pointCount}</div>`;
        el.style.cursor = 'pointer';

        const marker = new Marker({ element: el })
          .setLngLat([cluster.geometry.coordinates[0], cluster.geometry.coordinates[1]])
          .addTo(map);

        // Add click handler to zoom in
        el.addEventListener('click', () => {
          const expansionZoom = Math.min(
            clusterIndex!.getClusterExpansionZoom(cluster.id as number),
            18
          );
          map.easeTo({
            center: [cluster.geometry.coordinates[0], cluster.geometry.coordinates[1]],
            zoom: expansionZoom
          });
        });

        clusters.push(marker);
      } else {
        // It's an individual point - draw pin marker
        const pinIndex = cluster.properties.pinIndex;
        if (pinIndex !== undefined) {
          const pin = pins[pinIndex];
          const marker = createPinMarker(pin);
          markers.push(marker);
        }
      }
    });

    console.log(`✅ Displaying ${clusters.length} clusters and ${markers.length} individual pins`);
  }

  function drawIndividualPins(pins: PinRow[]) {
    // Add new markers with emoji icons and colors
    markers = pins.map((pin) => createPinMarker(pin));
    console.log(`✅ Total markers on map: ${markers.length}`);
  }

  function createPinMarker(pin: PinRow): Marker {
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
      
      // Add popup with pin details (always show popup, even if minimal info)
      let popupContent = `<div class="pin-popup">`;
      
      // Pin type/emoji header
      popupContent += `<div class="pin-header">`;
      popupContent += `<span class="pin-emoji-large">${emoji}</span>`;
      try {
        const tags = pin.tags ? JSON.parse(pin.tags) : [];
        if (Array.isArray(tags) && tags.length > 0) {
          const typeLabels: Record<string, string> = {
            medical: 'Medical',
            water: 'Water',
            checkpoint: 'Checkpoint',
            shelter: 'Shelter',
            food: 'Food',
            danger: 'Danger',
            other: 'Location'
          };
          const typeLabel = typeLabels[tags[0]] || tags[0];
          popupContent += `<span class="pin-type-label">${typeLabel}</span>`;
        }
      } catch (e) {
        // Invalid tags JSON
      }
      popupContent += `</div>`;
      
      // Description
      if (pin.description) {
        popupContent += `<div class="pin-description">${pin.description}</div>`;
      }
      
      // Tags
      try {
        const tags = pin.tags ? JSON.parse(pin.tags) : [];
        if (Array.isArray(tags) && tags.length > 1) {
          // Skip first tag (type) as it's already shown
          const otherTags = tags.slice(1);
          if (otherTags.length > 0) {
            popupContent += `<div class="pin-tags">`;
            otherTags.forEach((tag: string) => {
              popupContent += `<span class="pin-tag">${tag}</span>`;
            });
            popupContent += `</div>`;
          }
        }
      } catch (e) {
        // Invalid tags JSON
      }
      
      // Timestamp
      if (pin.created_at) {
        const date = new Date(pin.created_at);
        const timeAgo = getTimeAgo(date);
        popupContent += `<div class="pin-time">${timeAgo}</div>`;
      }
      
      popupContent += `</div>`;
      
      const popup = new Popup({ offset: 25, closeButton: true, maxWidth: '250px' })
        .setHTML(popupContent);
      
      marker.setPopup(popup);
      
      return marker;
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
                  
                  // Insert into local database (include new Phase 3 fields if they exist)
                  // Try with new columns first, fall back to old schema if needed
                  try {
                    await db.query(
                      `INSERT INTO pins (id, map_id, lat, lng, type, tags, description, photo_urls, expires_at, created_at, updated_at)
                       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                       ON CONFLICT (id) DO NOTHING`,
                      [
                        serverPin.id,
                        serverPin.map_id,
                        serverPin.lat,
                        serverPin.lng,
                        serverPin.type || null,
                        tagsJson,
                        serverPin.description || null,
                        photoUrlsJson,
                        serverPin.expires_at || null,
                        serverPin.created_at,
                        serverPin.updated_at
                      ]
                    );
                  } catch (insertError: any) {
                    // If new columns don't exist, fall back to old schema
                    const errorMsg = insertError?.message || String(insertError);
                    if (errorMsg.includes('expires_at') || errorMsg.includes('type') || errorMsg.includes('does not exist')) {
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
                    } else {
                      throw insertError;
                    }
                  }
                  
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
      
      // Redraw pins when map moves/zooms (for clustering)
      const onMoveEnd = () => {
        drawPins();
      };
      map.on('moveend', onMoveEnd);
      map.on('zoomend', onMoveEnd);
      
      unsubscribe = () => {
        clearInterval(pollInterval);
        map.off('moveend', onMoveEnd);
        map.off('zoomend', onMoveEnd);
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

  // Reactive: redraw pins when filter changes
  $: if (map && mapId) {
    drawPins();
  }

  onDestroy(() => {
    unsubscribe?.();
    // Clean up markers and clusters
    markers.forEach(m => m.remove());
    clusters.forEach(c => c.remove());
    markers = [];
    clusters = [];
  });
</script>

<style>
  :global(.custom-marker) {
    background: none;
    border: none;
    cursor: pointer;
  }

  :global(.pin-popup) {
    max-width: 250px;
    padding: 0;
  }

  :global(.pin-header) {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e0e0e0;
  }

  :global(.pin-emoji-large) {
    font-size: 24px;
    line-height: 1;
  }

  :global(.pin-type-label) {
    font-weight: 600;
    font-size: 14px;
    color: #333;
  }

  :global(.pin-description) {
    margin: 8px 0;
    font-size: 13px;
    color: #555;
    line-height: 1.4;
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

  :global(.pin-time) {
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #e0e0e0;
    font-size: 11px;
    color: #999;
  }

  :global(.cluster-marker) {
    cursor: pointer;
  }

  :global(.cluster-inner) {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #4a90e2;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
    border: 3px solid white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }
</style>