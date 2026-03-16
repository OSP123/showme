<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import CreateMap from '$lib/CreateMap.svelte';
  import MapView   from '$lib/MapView.svelte';
  import PinLayer  from '$lib/PinLayer.svelte';
  import CreatePin from '$lib/CreatePin.svelte';
  import QuickPin from '$lib/QuickPin.svelte';
  import ShareMap from '$lib/ShareMap.svelte';
  import SyncStatus from '$lib/SyncStatus.svelte';
  import PinFilter from '$lib/PinFilter.svelte';
  import PanicWipe from '$lib/PanicWipe.svelte';
  import EncryptionSetup from '$lib/EncryptionSetup.svelte';
  import NotificationBell from '$lib/NotificationBell.svelte';
  import { initLocalDb }    from '$lib/db/pglite';
  import { createMap, addPin, updatePin, getPins, getMap, syncPinsFromApi, setAccessToken, getAccessToken, enableMapEncryption, resolveMapSlug } from '$lib/api';
  import type { Map as GLMap }  from 'maplibre-gl';
  import type { PinData, MapRow, PinType, PinRow } from '$lib/models';
  import { notifications, getPinTypeEmoji } from '$lib/notifications';
  import { _ } from 'svelte-i18n';
  import { locale } from 'svelte-i18n';
  import { SUPPORTED_LOCALES } from '$lib/i18n';
  import ConfirmModal from '$lib/ConfirmModal.svelte';
  import AccessCodeModal from '$lib/AccessCodeModal.svelte';
  import { isMapEncrypted, unlockMap } from '$lib/db/keyManager';
  import SaveAreaOffline from '$lib/SaveAreaOffline.svelte';
  import LocationSearch from '$lib/LocationSearch.svelte';

  // Synchronous initialization to prevent flash
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  let mapId = urlParams.get('map') || '';

  // Read token from URL or localStorage
  const urlToken = urlParams.get('token') || '';
  if (urlToken && mapId) {
    setAccessToken(urlToken);
    // Persist token for returning users
    localStorage.setItem(`showme_token_${mapId}`, urlToken);
    // Clean token from URL for security
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete('token');
    window.history.replaceState({}, '', cleanUrl);
  } else if (mapId) {
    // Try localStorage fallback
    const storedToken = localStorage.getItem(`showme_token_${mapId}`);
    if (storedToken) {
      setAccessToken(storedToken);
    }
  }
  
  let db: any;
  let mapInstance: GLMap | null = null;
  let mapData: MapRow | null = null;
  let showCreatePin = false;
  let showQuickPin = false;
  let pinLocation: { lat: number; lng: number } | null = null;
  let selectedPinTypes: PinType[] = [];
  let selectedTags: string[] = [];
  let availableTags: string[] = [];
  
  // Modal State Management
  type ModalState = 'menu' | 'filter' | 'share' | 'notifications' | 'panic' | 'offline' | null;
  let activeModal: ModalState = null;

  let editMode = false;
  let editPinId: string | null = null;
  let editPinData: Partial<PinData> | null = null;
  let showNotifications = false; // Kept for binding compatibility, controlled via activeModal
  let mapLoading = false;
  let showAlertModal = false;
  let alertMessage = '';
  let showAccessCodeModal = false;
  let showPassphraseModal = false;
  let passphraseInput = '';
  let passphraseError = '';

  async function handlePassphraseUnlock() {
    if (!passphraseInput || !mapData?.encryption_salt) return;
    passphraseError = '';
    try {
      await unlockMap(mapId, passphraseInput, mapData.encryption_salt);
      showPassphraseModal = false;
      passphraseInput = '';
      // Reload map data with decryption
      await loadMapData();
    } catch {
      passphraseError = 'Invalid passphrase. Please try again.';
    }
  }

  function closeAllModals() {
    activeModal = null;
    showNotifications = false;
  }

  function toggleModal(modal: ModalState) {
    if (activeModal === modal) {
      closeAllModals();
    } else {
      activeModal = modal;
      if (modal === 'notifications') showNotifications = true;
    }
  }
  let showMobileMenu = false;

  // OSM raster tiles — loaded directly from CDN edge servers for speed
  const mapStyle = {
    version: 8 as const,
    sources: {
      osm: {
        type: 'raster' as const,
        tiles: [
          'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
          'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 19,
        attribution:
          '© <a href="https://openstreetmap.org" target="_blank" rel="noopener">OSM contributors</a>'
      }
    },
    layers: [
      { id: 'osm', type: 'raster' as const, source: 'osm' }
    ]
  };

  // Debug logging
  $: {
    console.log('App state:', { mapId, mapInstance: !!mapInstance, db: !!db });
    if (!mapId && db) {
      console.log('ℹ️ No mapId - showing CreateMap screen. Create a map or add ?map=<id> to URL');
    }
  }

  onMount(async () => {
    db = await initLocalDb();

    // Listen for tag updates from PinLayer
    const tagHandler = (e: CustomEvent) => {
      availableTags = e.detail.tags;
    };
    window.addEventListener('pin-tags-updated', tagHandler as EventListener);

    // If mapId doesn't look like a UUID, try to resolve it as a slug
    if (mapId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(mapId)) {
      const resolved = await resolveMapSlug(mapId);
      if (resolved) {
        mapId = resolved.id;
        // Update URL to use the real map ID
        const url = new URL(window.location.href);
        url.searchParams.set('map', resolved.slug || resolved.id);
        window.history.replaceState({}, '', url);
      }
    }

    // Check if there's a mapId already set (from synchronous check)
    if (mapId) {
      mapLoading = true;
      await loadMapData();
    }

    return () => {
      window.removeEventListener('pin-tags-updated', tagHandler as EventListener);
    };
  });

  let isMapLoading = false;

  async function loadMapData() {
    if (!db || !mapId) return;

    isMapLoading = true;
    try {
      // Check API access first (catches 403 for private maps)
      const API_URL = import.meta.env.VITE_API_URL || '';
      const token = getAccessToken();
      let apiUrl = `${API_URL}/api/maps/${mapId}`;
      if (token) apiUrl += `?token=${encodeURIComponent(token)}`;

      const apiResponse = await fetch(apiUrl);
      if (apiResponse.status === 403) {
        isMapLoading = false;
        showAccessCodeModal = true;
        return;
      }

      // Poll for map availability (Server-First Sync Architecture)
      // We wait up to 10 seconds for the map to sync from the server
      const maxRetries = 20;
      const retryDelay = 500; // ms

      for (let i = 0; i < maxRetries; i++) {
        mapData = await getMap(db, mapId);
        if (mapData) {
          // Check if map needs encryption unlock
          if (mapData.encryption_salt && !isMapEncrypted(mapId)) {
            isMapLoading = false;
            showPassphraseModal = true;
            return;
          }
          isMapLoading = false;
          return; // Map found!
        }
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }

      // If map still doesn't exist after timeout, clear mapId and show CreateMap screen
      if (!mapData) {
        console.warn(`⚠️ Map ${mapId} does not exist after timeout, clearing from URL`);
        mapId = '';
        const url = new URL(window.location.href);
        url.searchParams.delete('map');
        window.history.replaceState({}, '', url);
      }
    } catch (error) {
      console.error('Failed to load map data:', error);
      // Map doesn't exist, clear mapId
      mapId = '';
      const url = new URL(window.location.href);
      url.searchParams.delete('map');
      window.history.replaceState({}, '', url);
    } finally {
      isMapLoading = false;
    }

  }

  // Polling Sync Implementation
  let pollingInterval: any = null;
  let lastSyncTimestamp: string | undefined = undefined;

  async function performSync() {
    if (!db || !mapId) return;
    
    const newPins = await syncPinsFromApi(db, mapId, lastSyncTimestamp);
    
    if (newPins && newPins.length > 0) {
      // Update timestamp to the latest pin's updated_at or created_at
      // Find the most recent timestamp
      const latestPin = newPins.reduce((prev, current) => {
        const prevDate = new Date(prev.updated_at || prev.created_at || 0);
        const currDate = new Date(current.updated_at || current.created_at || 0);
        return prevDate > currDate ? prev : current;
      });
      
      const newTimestamp = latestPin.updated_at || latestPin.created_at;
      if (newTimestamp) {
        lastSyncTimestamp = newTimestamp;
      }
      
      // Notify for new pins
      newPins.forEach(pin => {
        notifications.add({
          type: 'pin_added',
          pinType: pin.type || 'other',
          emoji: getPinTypeEmoji(pin.type),
          message: $_('app.notification.pinAdded', { values: { type: pin.type || 'pin' } })
        });
      });
    }
  }

  function startPolling() {
    stopPolling();
    if (db && mapId) {
       console.log('🔄 Starting polling sync for map:', mapId);
       
       // Initial sync to get all pins (or fill local DB)
       // We pass undefined as timestamp effectively to fetch all (or use a stored timestamp if we persisted it, but for now we fetch all on load to be safe)
       lastSyncTimestamp = undefined;
       performSync();

       // Interval sync (every 4 seconds)
       pollingInterval = setInterval(() => {
         performSync();
       }, 4000);
    }
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  onDestroy(() => {
    stopPolling();
  });

  async function handleAccessCodeSubmit(event: CustomEvent<{ mapId: string; token: string }>) {
    const { mapId: newMapId, token } = event.detail;
    showAccessCodeModal = false;

    // Set token and persist
    setAccessToken(token);
    localStorage.setItem(`showme_token_${newMapId}`, token);

    // Navigate to the map
    mapId = newMapId;
    const url = new URL(window.location.href);
    url.searchParams.set('map', newMapId);
    window.history.replaceState({}, '', url);

    await loadMapData();
  }

  async function handleCreate(event: CustomEvent<{ name: string; isPrivate: boolean; passphrase?: string }>) {
    console.log('Creating map with:', event.detail);
    mapLoading = true;
    try {
      const { name, isPrivate, passphrase } = event.detail;
      const result = await createMap(db, name, isPrivate, passphrase);
      console.log('Map created:', result);
      mapId = result.id;

      // Set access token for private maps so the creator can access their own map
      if (isPrivate && result.access_token) {
        setAccessToken(result.access_token);
        localStorage.setItem(`showme_token_${result.id}`, result.access_token);
      }

      // Update URL to include the map ID
      const url = new URL(window.location.href);
      url.searchParams.set('map', result.id);
      window.history.pushState({}, '', url);

      await loadMapData();
    } catch (error) {
      console.error('Failed to create map:', error);
    }
  }

  function handleMapLoad(event: CustomEvent<{ map: GLMap }>) {
    console.log('Map loaded:', event.detail);
    mapLoading = false;
    mapInstance = event.detail.map;
    mapInstance.on('click', (e) => {
      // Don't show pin menu if clicking on a marker/popup
      // MapLibre sets e.originalEvent.target, check if it's a marker element
      const target = e.originalEvent?.target as HTMLElement;
      if (target && (
        target.closest('.maplibregl-marker') || 
        target.closest('.maplibregl-popup') ||
        target.closest('.custom-marker') ||
        target.closest('.cluster-marker')
      )) {
        return; // Ignore clicks on markers/popups
      }
      
      console.log('Map clicked at:', e.lngLat);
      pinLocation = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      // Show QuickPin by default for crisis scenarios
      showQuickPin = true;
    });
  }

  async function handlePinCreate(event: CustomEvent<PinData>) {
    if (!pinLocation) return;
    
    try {
      const pinData: PinData = {
        ...event.detail,
        map_id: mapId,
        lat: pinLocation.lat,
        lng: pinLocation.lng,
      };
      
      await addPin(db, pinData);
      console.log('Pin added successfully');
      
      // Add notification
      notifications.add({
        type: 'pin_added',
        pinType: pinData.type,
        emoji: getPinTypeEmoji(pinData.type),
        message: $_('app.notification.pinCreated', { values: { type: pinData.type || 'pin' } })
      });
      
      // Close the pin creation modal
      showCreatePin = false;
      showQuickPin = false;
      pinLocation = null;
    } catch (error) {
      console.error('Failed to add pin:', error);
    }
  }

  async function handleQuickPinCreate(event: CustomEvent<{ type: PinType; lat: number; lng: number }>) {
    if (!pinLocation) return;
    
    if (!db || !mapId) return;
    
    // Check if map exists before creating pin
    try {
      const mapCheck = await db.query('SELECT id FROM maps WHERE id = $1', [mapId]);
      if (mapCheck.rows.length === 0) {
        console.error('❌ Map does not exist - cannot create pin. Please create a new map first.');
        // Clear mapId from URL and show CreateMap screen
        mapId = '';
        mapData = null;
        const url = new URL(window.location.href);
        url.searchParams.delete('map');
        window.history.replaceState({}, '', url);
        alertMessage = $_('app.mapNotExist');
        showAlertModal = true;
        return;
      }
    } catch (error) {
      console.error('Failed to check if map exists:', error);
      return;
    }
    
    try {
      const pinData: PinData = {
        map_id: mapId,
        lat: event.detail.lat,
        lng: event.detail.lng,
        type: event.detail.type,
      };
      
      await addPin(db, pinData);
      console.log('Quick pin added successfully');
      
      // Add notification
      notifications.add({
        type: 'pin_added',
        pinType: pinData.type,
        emoji: getPinTypeEmoji(pinData.type),
        message: $_('app.notification.quickPinAdded', { values: { type: pinData.type } })
      });
      
      // Close the quick pin modal
      showQuickPin = false;
      pinLocation = null;
    } catch (error) {
      console.error('Failed to add quick pin:', error);
    }
  }

  function handlePinCancel() {
    showCreatePin = false;
    showQuickPin = false;
    pinLocation = null;
    editMode = false;
    editPinId = null;
    editPinData = null;
  }

  async function handlePinUpdate(event: CustomEvent<{ pinId: string; updates: Partial<PinData> }>) {
    const { pinId, updates } = event.detail;
    
    try {
      await updatePin(db, pinId, updates);
      console.log('Pin updated successfully');
      
      // Add notification
      notifications.add({
        type: 'pin_updated',
        pinType: updates.type,
        emoji: getPinTypeEmoji(updates.type),
        message: $_('app.notification.pinUpdated', { values: { description: updates.description?.substring(0, 30) || $_('app.notification.changesSaved') } })
      });
      
      // Close the edit modal
      showCreatePin = false;
      editMode = false;
      editPinId = null;
      editPinData = null;
      pinLocation = null;
    } catch (error) {
      console.error('Failed to update pin:', error);
    }
  }

  // Make edit function available globally for PinLayer
  if (typeof window !== 'undefined') {
    (window as any).editPin = async (pin: PinRow) => {
      editMode = true;
      editPinId = pin.id;
      editPinData = {
        type: pin.type || undefined,
        description: pin.description || undefined,
        tags: pin.tags || [],
        photo_urls: pin.photo_urls || [],
      };
      pinLocation = { lat: Number(pin.lat), lng: Number(pin.lng) };
      showCreatePin = true;
      showQuickPin = false;
    };
  }

  // Reactive: load map data when mapId changes
  $: if (mapId && db) {
    loadMapData();
    startPolling();
  }

  console.log('Environment check:', {
    SHAPE_URL: import.meta.env.VITE_ELECTRIC_SHAPE_URL,
    SOURCE_ID: import.meta.env.VITE_ELECTRIC_SOURCE_ID,
    ALL_ENV: import.meta.env
  });
</script>

<style>
  main { 
    width: 100vw; 
    height: 100vh; 
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    background-color: #f0f0f0; /* Debug background */
  }
  
  .map-container {
    flex: 1;
    width: 100%;
    height: 100%;
    position: relative;
    background-color: #e0e0e0; /* Debug background */
    min-height: 500px; /* Ensure minimum height */
  }

  @media (max-width: 768px) {
    .map-container {
      min-height: 100vh;
      min-height: -webkit-fill-available; /* iOS Safari fix */
    }
  }
  
  .create-map-container {
    display: flex;
    align-items: flex-start; /* Changed from center to allow scrolling */
    justify-content: center;
    width: 100%;
    height: 100vh; /* changed from 100% to ensure full viewport */
    background-color: white;
    overflow-y: auto; /* Allow vertically scrolling */
    -webkit-overflow-scrolling: touch;
    padding: 20px 0; /* Add top/bottom padding */
    box-sizing: border-box; 
  }

  /* --- Desktop / Default Styles --- */

  /* Search Bar */
  .search-bar-container {
    position: absolute;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 100;
    width: 360px;
    max-width: calc(100vw - 32px);
  }

  /* Map Controls Container (Desktop: Top-Left Vertical Stack) */
  .map-controls {
    position: absolute;
    top: 16px;
    inset-inline-start: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 100;
  }

  /* Buttons Common Styles */
  .new-map-btn, .filter-toggle-btn, .panic-btn, .share-btn-menu, .notification-btn, .offline-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s;
    height: 40px;
    white-space: nowrap;
    color: #333;
  }

  .new-map-btn:hover, .filter-toggle-btn:hover, .panic-btn:hover, .share-btn-menu:hover, .notification-btn:hover, .offline-btn:hover {
    background: #f5f5f5;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  }

  /* Specific Button Colors */
  .new-map-btn, .share-btn-menu {
    background: #4a90e2;
    color: white;
    border: none;
  }
  .new-map-btn:hover, .share-btn-menu:hover {
    background: #357abd;
  }

  .panic-btn {
    background: #dc3545;
    color: white;
    border: none;
  }
  .panic-btn:hover {
    background: #bd2130;
  }
  
  /* Notification Button Special Styling */
  .notification-btn {
    position: relative;
    padding: 8px;
    justify-content: center;
    min-width: 40px;
  }
  
  .notification-btn {
    font-size: 0; /* Hide text on desktop */
  }
  .notification-btn span:first-child {
    font-size: 18px; /* Visible icon */
  }
  .notification-btn .badge {
    position: absolute;
    top: -4px;
    inset-inline-end: -4px;
    background: #dc3545;
    color: white;
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 600;
    min-width: 16px;
    text-align: center;
  }

  /* Desktop Panels - Modal Style for Consistency */
  .filter-panel {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 2000;
    max-width: 350px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  .share-panel-modal, .notification-panel-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    z-index: 2000;
    max-width: 400px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  /* Mobile Header & Hamburger (Hidden on Desktop) */
  .language-selector {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    font-size: 14px;
  }

  .language-selector label {
    font-weight: 500;
    color: #333;
    white-space: nowrap;
  }

  .language-selector select {
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 4px 8px;
    font-size: 14px;
    background: white;
    cursor: pointer;
    flex: 1;
    min-width: 0;
  }

  .mobile-header {
    display: none;
    position: absolute;
    top: 16px;
    inset-inline-start: 16px;
    z-index: 200;
  }

  .hamburger-btn {
    background: white;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 24px;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    color: #333;
  }

  .mobile-menu-header {
    display: none;
  }

  .close-menu-btn {
    display: none;
  }
  
  .close-panel-btn {
    position: absolute;
    top: 10px;
    inset-inline-end: 10px;
    background: #f0f0f0;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #333;
  }

  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0,0,0,0.5);
    z-index: 1500;
    backdrop-filter: blur(2px);
  }

  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 3000;
    font-family: sans-serif;
    color: #333;
    font-weight: 500;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 12px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* --- Mobile / Tablet Overrides (Max-Width 768px) --- */
  @media (max-width: 768px) {
    .map-container {
      min-height: 100vh;
      min-height: -webkit-fill-available;
    }

    /* Show Hamburger */
    .mobile-header {
      display: block;
    }

    /* Drop search bar below the hamburger / sync row */
    .search-bar-container {
      width: calc(100vw - 32px);
      left: 50%;
      transform: translateX(-50%);
      top: 70px;
    }

    /* Hide default controls, show drawer styles when open */
    .map-controls {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: white;
      z-index: 2500;
      padding: 24px;
      box-sizing: border-box;
      gap: 16px;
      overflow-y: auto;
    }

    .map-controls.mobile-open {
      display: flex;
    }

    .mobile-menu-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      margin-bottom: 20px;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    .mobile-menu-header h3 {
      margin: 0;
      font-size: 1.2rem;
      color: #333;
    }
    .close-menu-btn {
      display: block;
      background: none;
      border: none;
      font-size: 32px;
      color: #666;
      padding: 0 8px;
    }

    /* Full width buttons in menu */
    .new-map-btn, .filter-toggle-btn, .panic-btn, .share-btn-menu, .notification-btn, .offline-btn {
      width: 100% !important;
      justify-content: flex-start;
      padding: 16px;
      font-size: 16px;
      min-height: 54px;
      margin: 0;
    }

    /* Show text labels in mobile menu */
    .notification-btn {
      font-size: 16px; /* Restore text size */
      justify-content: flex-start;
    }
    .notification-btn span:first-child {
      font-size: 20px;
    }
    .notification-btn .badge {
      top: 18px;
      inset-inline-end: 16px;
    }

    /* Panel Adjustments for Mobile */
    .filter-panel, .share-panel-modal, .notification-panel-modal {
      width: 90%;
      max-width: 350px;
      padding-top: 40px;
      top: 50%;
      left: 50%;
      right: auto;
      transform: translate(-50%, -50%);
      margin: 0;
      position: fixed;
    }
  }

  /* Extra-small screens: same positioning, just ensure full width */
  @media (max-width: 480px) {
    .search-bar-container {
      width: calc(100vw - 24px);
    }
  }

  .loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.92);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e0e0e0;
    border-top-color: #4a90e2;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-text {
    margin-top: 16px;
    font-size: 15px;
    color: #666;
    font-weight: 500;
  }
</style>

<main>
  {#if !mapId}
    <div class="create-map-container">
      <CreateMap disabled={!db} on:create={handleCreate} on:joinPrivate={() => { showAccessCodeModal = true; }} />
    </div>
  {:else}
    {#if mapLoading}
      <div class="loading-overlay">
        <div class="loading-spinner"></div>
        <p class="loading-text">{$_('loading.map')}</p>
      </div>
    {/if}
    <div class="map-container">
      <SyncStatus {db} />
      
      <div class="search-bar-container">
        <LocationSearch on:select={(e) => {
          if (mapInstance) {
            mapInstance.flyTo({ center: [e.detail.lng, e.detail.lat], zoom: e.detail.zoom, duration: 1500 });
          }
        }} />
      </div>

      <div class="mobile-header">
        <button class="hamburger-btn" on:click={() => toggleModal('menu')}>
          ☰
        </button>
      </div>

      <div class="map-controls" class:mobile-open={activeModal === 'menu'}>
        <div class="mobile-menu-header">
          <h3>{$_('app.menu.title')}</h3>
          <button class="close-menu-btn" on:click={closeAllModals}>×</button>
        </div>

        <button
          class="new-map-btn"
          on:click={() => {
            mapId = '';
            const url = new URL(window.location.href);
            url.searchParams.delete('map');
            window.history.pushState({}, '', url);
            closeAllModals();
          }}
          title={$_('app.menu.newMapTitle')}
        >
          ➕ {$_('app.menu.newMap')}
        </button>
        {#if mapData}
          <button
            class="share-btn-menu"
            on:click={() => toggleModal('share')}
          >
            <span>🔗</span> {$_('app.menu.shareMap')}
          </button>
        {/if}
        <button class="filter-toggle-btn" on:click={() => toggleModal('filter')}>
          <span>🔍</span>
          {$_('app.menu.filter')}
        </button>
        <button
          class="panic-btn"
          on:click={() => toggleModal('panic')}
          title={$_('app.menu.wipeDataTitle')}
        >
          🚨 {$_('app.menu.wipeData')}
        </button>
        <button
          class="notification-btn"
          on:click={() => toggleModal('notifications')}
        >
          <span>🔔</span> {$_('app.menu.notifications')}
          {#if $notifications.filter(n => !n.read).length > 0}
            <span class="badge">{$notifications.filter(n => !n.read).length}</span>
          {/if}
        </button>

        <button
          class="offline-btn"
          on:click={() => toggleModal('offline')}
        >
          <span>📥</span> {$_('offline.saveArea')}
        </button>

        <div class="language-selector">
          <label for="locale-select">🌐 {$_('language.selector')}</label>
          <select id="locale-select" bind:value={$locale}>
            {#each SUPPORTED_LOCALES as loc}
              <option value={loc.code}>{loc.name}</option>
            {/each}
          </select>
        </div>
      </div>

      {#if activeModal === 'encryption'}
        <div class="encryption-panel">
          <button class="close-panel-btn" on:click={closeAllModals}>×</button>
          <EncryptionSetup
            mapId={mapId}
            db={db}
            encryptionSalt={mapData?.encryption_salt || null}
          />
        </div>
      {/if}

      {#if activeModal === 'filter'}
        <div class="filter-panel">
          <button class="close-panel-btn" on:click={closeAllModals}>×</button>
          <PinFilter
            bind:selectedTypes={selectedPinTypes}
            {availableTags}
            bind:selectedTags={selectedTags}
            on:filterChange={(e) => {
              selectedPinTypes = e.detail.types;
              if (e.detail.tags !== undefined) selectedTags = e.detail.tags;
            }}
          />
        </div>
      {/if}
      
      {#if activeModal === 'share' && mapData}
        <div class="share-panel-modal">
          <button class="close-panel-btn" on:click={closeAllModals}>×</button>
          <ShareMap
            mapId={mapId}
            mapSlug={mapData.slug}
            accessToken={mapData.access_token}
            accessCode={mapData.access_code}
            isPrivate={mapData.is_private === true || mapData.is_private === 'true'}
            isEncrypted={!!mapData.encryption_salt}
            open={true}
          />
        </div>
      {/if}
      
      {#if activeModal === 'notifications'}
        <div class="notification-panel-modal">
          <button class="close-panel-btn" on:click={closeAllModals}>×</button>
          <NotificationBell open={true} />
        </div>
      {/if}
      
      {#if activeModal === 'offline'}
        <div class="share-panel-modal">
          <SaveAreaOffline
            open={true}
            map={mapInstance}
            on:close={closeAllModals}
          />
        </div>
      {/if}

      <!-- Shared Backdrop for any modal -->
      {#if activeModal && activeModal !== 'menu'}
        <div class="modal-backdrop" on:click={closeAllModals}></div>
      {/if}

      <MapView
        style={mapStyle}
        center={[0, 0]}
        zoom={2}
        on:load={handleMapLoad}
      />
      
      {#if mapInstance}
        <PinLayer
          map={mapInstance}
          mapId={mapId}
          filterTypes={selectedPinTypes}
          filterTags={selectedTags}
        />
      {/if}

      {#if showQuickPin && pinLocation}
        <QuickPin
          lat={pinLocation.lat}
          lng={pinLocation.lng}
          open={showQuickPin}
          on:create={handleQuickPinCreate}
          on:cancel={handlePinCancel}
          on:advanced={() => {
            showQuickPin = false;
            showCreatePin = true;
          }}
        />
      {/if}

      {#if showCreatePin && pinLocation}
        <CreatePin
          lat={pinLocation.lat}
          lng={pinLocation.lng}
          open={showCreatePin}
          mode={editMode ? 'edit' : 'create'}
          pinId={editPinId}
          initialData={editPinData}
          existingTags={availableTags}
          on:create={handlePinCreate}
          on:update={handlePinUpdate}
          on:cancel={handlePinCancel}
        />
      {/if}

    </div>
  {/if}

  <!-- PanicWipe should be available regardless of map state -->
  <PanicWipe
    {db}
    open={activeModal === 'panic'}
    on:wiped={() => {
      // PanicWipe component handles reload, just close modal locally if needed
      closeAllModals();
    }}
    on:cancel={closeAllModals}
  />
  
  {#if isMapLoading}
    <div class="loading-overlay">
      <div class="spinner"></div>
      <p>{$_('app.loading.syncingMap')}</p>
    </div>
  {/if}

  <ConfirmModal
    open={showAlertModal}
    title={$_('common.confirm')}
    message={alertMessage}
    confirmLabel={$_('common.close')}
    variant="warning"
    on:confirm={() => showAlertModal = false}
    on:cancel={() => showAlertModal = false}
  />

  {#if showPassphraseModal}
    <div class="modal-overlay" on:click={() => { showPassphraseModal = false; }}>
      <div class="modal-content" on:click|stopPropagation>
        <h3>{$_('encryption.unlockButton')}</h3>
        <p style="font-size: 0.9rem; color: #666; margin-bottom: 1rem;">
          {$_('encryption.needsPassphrase')}
        </p>
        <input
          type="password"
          bind:value={passphraseInput}
          placeholder={$_('encryption.enterPassphrase')}
          on:keydown={(e) => { if (e.key === 'Enter') handlePassphraseUnlock(); }}
          style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 16px; box-sizing: border-box; margin-bottom: 8px;"
        />
        {#if passphraseError}
          <p style="color: #dc3545; font-size: 0.85rem; margin: 0 0 8px 0;">{passphraseError}</p>
        {/if}
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button
            class="btn-cancel"
            on:click={() => { showPassphraseModal = false; }}
          >{$_('common.cancel')}</button>
          <button
            class="btn-confirm"
            on:click={handlePassphraseUnlock}
            disabled={!passphraseInput}
          >{$_('encryption.unlockButton')}</button>
        </div>
      </div>
    </div>
  {/if}

  <AccessCodeModal
    open={showAccessCodeModal}
    {mapId}
    on:submit={handleAccessCodeSubmit}
    on:cancel={() => {
      showAccessCodeModal = false;
      if (mapId) {
        mapId = '';
        const url = new URL(window.location.href);
        url.searchParams.delete('map');
        window.history.replaceState({}, '', url);
      }
    }}
  />
</main>