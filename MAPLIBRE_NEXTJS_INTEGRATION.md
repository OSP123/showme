# MapLibre GL Integration Guide for Next.js

This guide explains how to integrate MapLibre GL (the mapping library used in this Svelte project) into a Next.js application.

## Overview

MapLibre GL is an open-source fork of Mapbox GL JS that renders interactive vector maps using WebGL. It requires client-side rendering since it uses browser APIs like WebGL and DOM manipulation.

## Installation

```bash
npm install maplibre-gl
# or
yarn add maplibre-gl
# or
pnpm add maplibre-gl
```

For TypeScript support:

```bash
npm install -D @types/maplibre-gl
```

## Next.js Configuration

### 1. Import CSS

MapLibre GL requires its CSS to be imported. In Next.js, you can do this in your `_app.tsx` or `_app.js`:

```typescript
// app/_app.tsx or pages/_app.tsx
import 'maplibre-gl/dist/maplibre-gl.css';
import type { AppProps } from 'next/app';

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
```

Or if using the App Router (Next.js 13+):

```typescript
// app/layout.tsx
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Map App',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### 2. Client-Side Component

Since MapLibre GL requires browser APIs, you must create a client component. Use dynamic imports with `ssr: false` or mark the component with `'use client'`.

**Option A: Using 'use client' directive (App Router)**

```typescript
// components/MapView.tsx
'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { type Map as GLMap } from 'maplibre-gl';

interface MapViewProps {
  style: any;
  center?: [number, number];
  zoom?: number;
  onLoad?: (map: GLMap) => void;
}

export default function MapView({ 
  style, 
  center = [0, 0], 
  zoom = 2,
  onLoad 
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<GLMap | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style,
      center,
      zoom,
    });

    map.current.on('load', () => {
      console.log('MapLibre map loaded successfully');
      if (onLoad && map.current) {
        onLoad(map.current);
      }
    });

    map.current.on('error', (e) => {
      console.error('MapLibre error:', e);
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Only run once on mount

  return (
    <div 
      ref={mapContainer} 
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '400px' 
      }} 
    />
  );
}
```

**Option B: Using dynamic import (Pages Router or App Router)**

```typescript
// components/MapView.tsx (same as above, but without 'use client')
// Then in your page:

import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
});
```

## Map Style Configuration

Here's the OpenStreetMap raster style configuration used in the original project:

```typescript
// lib/mapStyles.ts
export const osmStyle = {
  id: 'OSM Raster',
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: [
        'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
        'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
      ],
      minzoom: 0,
      maxzoom: 19,
      attribution:
        '© <a href="https://openstreetmap.org" target="_blank" rel="noopener">OSM contributors</a>'
    }
  },
  layers: [
    { 
      id: 'osm', 
      type: 'raster', 
      source: 'osm', 
      layout: { visibility: 'visible' } 
    }
  ]
};
```

## Example Usage

### App Router Example

```typescript
// app/page.tsx
'use client';

import { useState, useEffect } from 'react';
import MapView from '@/components/MapView';
import { osmStyle } from '@/lib/mapStyles';
import type { Map as GLMap } from 'maplibre-gl';

export default function HomePage() {
  const [mapInstance, setMapInstance] = useState<GLMap | null>(null);

  const handleMapLoad = (map: GLMap) => {
    setMapInstance(map);
    
    // Example: Add click handler
    map.on('click', ({ lngLat }) => {
      console.log('Map clicked at:', lngLat);
      // Add your pin/marker logic here
    });
  };

  return (
    <main style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <div style={{ width: '100%', height: '100%' }}>
        <MapView
          style={osmStyle}
          center={[0, 0]}
          zoom={2}
          onLoad={handleMapLoad}
        />
      </div>
    </main>
  );
}
```

### Pages Router Example

```typescript
// pages/index.tsx
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { osmStyle } from '@/lib/mapStyles';
import type { Map as GLMap } from 'maplibre-gl';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
});

export default function HomePage() {
  const [mapInstance, setMapInstance] = useState<GLMap | null>(null);

  const handleMapLoad = (map: GLMap) => {
    setMapInstance(map);
    
    map.on('click', ({ lngLat }) => {
      console.log('Map clicked at:', lngLat);
    });
  };

  return (
    <main style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
      <div style={{ width: '100%', height: '100%' }}>
        <MapView
          style={osmStyle}
          center={[0, 0]}
          zoom={2}
          onLoad={handleMapLoad}
        />
      </div>
    </main>
  );
}
```

## Adding Markers/Pins

To add markers to the map:

```typescript
// components/Marker.tsx
'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { type Map as GLMap } from 'maplibre-gl';

interface MarkerProps {
  map: GLMap;
  lng: number;
  lat: number;
  color?: string;
}

export default function Marker({ map, lng, lat, color = '#FF0000' }: MarkerProps) {
  const markerRef = useRef<maplibregl.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create a DOM element for the marker
    const el = document.createElement('div');
    el.style.width = '20px';
    el.style.height = '20px';
    el.style.borderRadius = '50%';
    el.style.backgroundColor = color;
    el.style.border = '2px solid white';
    el.style.cursor = 'pointer';

    // Create marker
    markerRef.current = new maplibregl.Marker(el)
      .setLngLat([lng, lat])
      .addTo(map);

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
      }
    };
  }, [map, lng, lat, color]);

  return null;
}
```

## Advanced: Custom Layers

To add custom layers (like the PinLayer in the original project):

```typescript
// components/PinLayer.tsx
'use client';

import { useEffect } from 'react';
import type { Map as GLMap } from 'maplibre-gl';

interface Pin {
  id: string;
  lat: number;
  lng: number;
}

interface PinLayerProps {
  map: GLMap | null;
  pins: Pin[];
}

export default function PinLayer({ map, pins }: PinLayerProps) {
  useEffect(() => {
    if (!map) return;

    // Add source
    if (!map.getSource('pins')) {
      map.addSource('pins', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: pins.map(pin => ({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [pin.lng, pin.lat],
            },
            properties: { id: pin.id },
          })),
        },
      });
    } else {
      // Update existing source
      const source = map.getSource('pins') as maplibregl.GeoJSONSource;
      source.setData({
        type: 'FeatureCollection',
        features: pins.map(pin => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [pin.lng, pin.lat],
          },
          properties: { id: pin.id },
        })),
      });
    }

    // Add layer if it doesn't exist
    if (!map.getLayer('pins-layer')) {
      map.addLayer({
        id: 'pins-layer',
        type: 'circle',
        source: 'pins',
        paint: {
          'circle-radius': 8,
          'circle-color': '#FF0000',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });
    }
  }, [map, pins]);

  return null;
}
```

## Styling

Add global styles for the map container:

```css
/* styles/globals.css or app/globals.css */
.map-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
}
```

## TypeScript Types

Make sure you have the types installed:

```bash
npm install -D @types/maplibre-gl
```

Then you can import types:

```typescript
import type { Map as GLMap, MapMouseEvent } from 'maplibre-gl';
```

## Common Issues and Solutions

### 1. Map not rendering / blank screen
- Ensure CSS is imported (`maplibre-gl/dist/maplibre-gl.css`)
- Check that the container has explicit width and height
- Verify the component is client-side only (use `'use client'` or dynamic import with `ssr: false`)

### 2. Hydration errors
- Always use dynamic imports with `ssr: false` or `'use client'` directive
- Don't render the map during SSR

### 3. Map tiles not loading
- Check CORS settings if using custom tile sources
- Verify the style configuration is correct
- Check browser console for network errors

### 4. TypeScript errors
- Ensure `@types/maplibre-gl` is installed
- Check that you're importing types correctly: `import type { Map } from 'maplibre-gl'`

## Next.js 13+ App Router Considerations

- Always use `'use client'` directive for components that use MapLibre GL
- Import CSS in `app/layout.tsx`
- Use `useEffect` for map initialization (runs only on client)
- Consider using React Server Components for non-map parts of your page

## Next.js 12 Pages Router Considerations

- Use `dynamic` import with `ssr: false` for the map component
- Import CSS in `pages/_app.tsx`
- Use `useEffect` for map initialization

## Additional Resources

- [MapLibre GL JS Documentation](https://maplibre.org/maplibre-gl-js-docs/api/)
- [MapLibre GL Examples](https://maplibre.org/maplibre-gl-js-docs/example/)
- [Next.js Dynamic Imports](https://nextjs.org/docs/advanced-features/dynamic-import)

