<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Marker, Popup } from 'maplibre-gl';
  import type { Map as GLMap } from 'maplibre-gl';
  import type { PinRow } from '$lib/models';
  import { initLocalDb } from '$lib/db/pglite';
  import { getPins } from '$lib/api';
  import { getPinColor, getPinEmoji, getTimeAgo } from '$lib/pinUtils';
  import Supercluster from 'supercluster';
  import { getThumbnailUrl } from '$lib/imageCache';

  export let map: GLMap;
  export let mapId: string;
  export let filterTypes: string[] = []; // Pin types to show (empty = show all)
  
  // Set up global error handler for unhandled promise rejections from ElectricSQL
  onMount(() => {
    // Initialize panic wipe flag from localStorage (persists across reloads)
    const storedFlag = localStorage.getItem('__panicWipeActive');
    if (storedFlag === 'true') {
      (window as any).__panicWipeActive = true;
      console.log('🚨 Panic wipe flag detected from previous session - polling disabled');
    } else if ((window as any).__panicWipeActive === undefined) {
      (window as any).__panicWipeActive = false;
    }
    
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
    
    // Listen for panic wipe events to stop sync and clear pins
    const panicWipeHandler = () => {
      console.log('🔄 Panic wipe detected, stopping sync and clearing pins...');
      
      // Set window-level flag FIRST - accessible from any closure
      (window as any).__panicWipeActive = true;
      
      // Clear all markers immediately
      markers.forEach(m => m.remove());
      clusters.forEach(c => c.remove());
      markers = [];
      clusters = [];
      
      // Also call unsubscribe to clean up event listeners
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = undefined;
      }
    };
    window.addEventListener('panic-wipe-complete', panicWipeHandler);
    
    return () => {
      window.removeEventListener('unhandledrejection', handler);
      window.removeEventListener('panic-wipe-complete', panicWipeHandler);
    };
  });

  let markers: Marker[] = [];
  let clusters: Marker[] = [];
  let unsubscribe: (() => void) | undefined;
  let currentMapId = '';
  let clusterIndex: Supercluster | null = null;
  let useClustering = true; // Enable clustering by default

  // Helper function to check if panic wipe is active (checks both window flag and localStorage)
  function isPanicWipeActive(): boolean {
    return (window as any).__panicWipeActive || localStorage.getItem('__panicWipeActive') === 'true';
  }

  async function drawPins() {
    if (!map) return;
    
    // NOTE: We DO draw pins even if panic wipe is active
    // The flag only prevents fetching from PostgREST, not displaying local pins
    // This allows newly created pins to be displayed
    
    const db = await initLocalDb();
    // Use getPins API function which handles decryption automatically
    const pins = await getPins(db, mapId, true); // includeExpired = true for drawing
    
    // Filter pins by type if filter is active
    let filteredPins = pins;
    if (filterTypes.length > 0) {
      filteredPins = pins.filter((pin) => {
        // Tags are now arrays (TEXT[]), not JSON strings
        const tags = Array.isArray(pin.tags) ? pin.tags : [];
        if (tags.length > 0) {
          const pinType = tags[0];
          return filterTypes.includes(pinType);
        }
        // If no type or invalid, only show if 'other' is in filter
        return filterTypes.includes('other');
      });
    }
    
    console.log(`🔍 Drawing pins for map ${mapId}: ${filteredPins.length} of ${pins.length} pins (filtered)`);
    
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
      // Tags are now arrays (TEXT[]), not JSON strings
      const tags = Array.isArray(pin.tags) ? pin.tags : [];
      if (tags.length > 0) {
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
      popupContent += `</div>`;
      
      // Description
      if (pin.description) {
        popupContent += `<div class="pin-description">${pin.description}</div>`;
      }
      
      // Tags
      // Tags are now arrays (TEXT[]), not JSON strings
      const tagsForDisplay = Array.isArray(pin.tags) ? pin.tags : [];
      if (tagsForDisplay.length > 1) {
        // Skip first tag (type) as it's already shown
        const otherTags = tagsForDisplay.slice(1);
        if (otherTags.length > 0) {
          popupContent += `<div class="pin-tags">`;
          otherTags.forEach((tag: string) => {
            popupContent += `<span class="pin-tag">${tag}</span>`;
          });
          popupContent += `</div>`;
        }
      }
      
      // Photos
      const photoUrls = Array.isArray(pin.photo_urls) ? pin.photo_urls : [];
      if (photoUrls.length > 0) {
        popupContent += `<div class="pin-photos">`;
        photoUrls.slice(0, 3).forEach((url: string, index: number) => {
          const thumbUrl = getThumbnailUrl(url, 150);
          popupContent += `<img src="${thumbUrl}" alt="Photo ${index + 1}" class="pin-photo-thumb" onclick="window.open('${url}', '_blank')" />`;
        });
        if (photoUrls.length > 3) {
          popupContent += `<div class="more-photos">+${photoUrls.length - 3} more</div>`;
        }
        popupContent += `</div>`;
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
      
      // Handle marker clicks - open popup and prevent map click
      el.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from reaching map
        // Toggle popup (MapLibre's default behavior, but we ensure it happens)
        if (!popup.isOpen()) {
          marker.togglePopup();
        }
      });
      
      return marker;
  }

  async function setupSync() {
    // Check panic wipe flag - if set, skip sync setup but still draw local pins
    const panicWipeActive = isPanicWipeActive();
    if (panicWipeActive) {
      console.log('⏸️ Skipping sync setup - panic wipe is active');
      // Still draw pins once from local DB
      await drawPins();
      return;
    }
    
    try {
      await drawPins(); // initial draw
      
      const db = await initLocalDb();
      
      // Use database change listeners instead of polling
      // ElectricSQL will automatically sync and trigger these listeners
      console.log('📡 Setting up database change listeners for real-time sync...');
      
      // Listen for db-change events (dispatched by pglite.ts when pins table changes)
      const dbChangeHandler = async (event: CustomEvent) => {
        if (isPanicWipeActive()) {
          console.debug('⏸️ Database change ignored - panic wipe active');
          return;
        }
        
        const { table, data } = event.detail;
        if (table === 'pins') {
          console.log('📡 Pins table changed, redrawing...');
          await drawPins();
        }
      };
      
      window.addEventListener('db-change', dbChangeHandler as EventListener);
      
      // Redraw pins when map moves/zooms (for clustering)
      const onMoveEnd = () => {
        // Always redraw - flag only prevents sync setup, not local display
        drawPins();
      };
      map.on('moveend', onMoveEnd);
      map.on('zoomend', onMoveEnd);
      
      unsubscribe = () => {
        window.removeEventListener('db-change', dbChangeHandler as EventListener);
        map.off('moveend', onMoveEnd);
        map.off('zoomend', onMoveEnd);
      };
      
      console.log('✅ Real-time sync configured using ElectricSQL!');
      
    } catch (error) {
      console.error('Failed to setup sync:', error);
    }
  }

  // Reactive: setup when map or mapId changes, or when panic wipe flag is cleared
  $: if (map && mapId) {
    // Check if we need to setup sync (either new mapId or we haven't set up yet)
    const shouldSetup = mapId !== currentMapId || (!unsubscribe && !isPanicWipeActive());
    
    if (shouldSetup) {
      // Clean up previous subscription
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = undefined;
      }
      
      currentMapId = mapId;
      setupSync();
    }
  }

  // Reactive: redraw pins when filter changes
  // NOTE: We redraw even if panic wipe is active - flag only prevents PostgREST polling
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
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background-color: rgba(74, 144, 226, 0.7);
    color: white;
    font-weight: bold;
    font-size: 14px;
    border: 2px solid white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
  }

  :global(.pin-photos) {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    margin: 12px 0;
  }

  :global(.pin-photo-thumb) {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 6px;
    cursor: pointer;
    transition: transform 0.2s;
  }

  :global(.pin-photo-thumb:hover) {
    transform: scale(1.05);
  }

  :global(.more-photos) {
    grid-column: span 3;
    text-align: center;
    font-size: 11px;
    color: #666;
    padding: 4px;
    background: #f5f5f5;
    border-radius: 4px;
  }
</style>
```