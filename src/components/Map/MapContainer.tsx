import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Map,
  NavigationControl,
  ScaleControl,
  AttributionControl,
  setWorkerUrl,
  type ErrorEvent,
} from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import maplibreglWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import {
  CHANDIGARH_CENTER,
  INITIAL_ZOOM,
  INITIAL_PITCH,
  INITIAL_BEARING,
  DARK_BASE_STYLE_URL,
  FALLBACK_DARK_STYLE,
  GEOJSON_DATA_URL,
  BUILDINGS_SOURCE_ID,
  BUILDINGS_LAYER_ID,
  BUILDING_HEIGHT_EXPRESSION,
  BUILDING_COLOR_EXPRESSION,
} from '../../config/mapConfig.ts';
import type { MapError } from '../../types/map.ts';
import { Header } from '../UI/Header.tsx';
import { ErrorNotice } from '../UI/ErrorNotice.tsx';

// Configure MapLibre Web Worker URL for Vite bundling
if (typeof window !== 'undefined') {
  setWorkerUrl(maplibreglWorkerUrl);
}

function isWebGLSupported(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

export const MapContainer: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [buildingCount, setBuildingCount] = useState<number | null>(null);
  const [error, setError] = useState<MapError | null>(() => {
    if (!isWebGLSupported()) {
      return {
        type: 'webgl',
        title: 'WebGL Not Supported',
        message:
          'Your browser or device does not support WebGL, which is required for 3D map extrusions.',
      };
    }
    return null;
  });
  const [retryCount, setRetryCount] = useState<number>(0);

  const resetCamera = useCallback(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo({
      center: CHANDIGARH_CENTER,
      zoom: INITIAL_ZOOM,
      pitch: INITIAL_PITCH,
      bearing: INITIAL_BEARING,
      essential: true,
      duration: 1200,
    });
  }, []);

  const handleRetry = useCallback(() => {
    setError(null);
    setIsLoading(true);
    setRetryCount((prev) => prev + 1);
  }, []);

  useEffect(() => {
    if (!mapContainerRef.current || !isWebGLSupported()) return;

    // Clean up existing map instance if retrying
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    let isMounted = true;
    let map: Map | null = null;

    try {
      map = new Map({
        container: mapContainerRef.current,
        style: DARK_BASE_STYLE_URL,
        center: CHANDIGARH_CENTER,
        zoom: INITIAL_ZOOM,
        pitch: INITIAL_PITCH,
        bearing: INITIAL_BEARING,
        attributionControl: false,
        maxPitch: 85,
      });

      mapRef.current = map;

      // Add navigation controls (zoom, compass, pitch visualize)
      map.addControl(
        new NavigationControl({
          showCompass: true,
          showZoom: true,
          visualizePitch: true,
        }),
        'top-right'
      );

      // Add scale control (metric)
      map.addControl(
        new ScaleControl({
          maxWidth: 100,
          unit: 'metric',
        }),
        'bottom-left'
      );

      // Add attribution control with OSM and OpenFreeMap attribution
      map.addControl(
        new AttributionControl({
          compact: false,
          customAttribution:
            'Data: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap (ODbL)</a> | Basemap: <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>',
        }),
        'bottom-right'
      );

      // Listen for runtime map errors
      map.on('error', (e: ErrorEvent) => {
        if (!isMounted) return;

        // Distinguish fatal style / source failures from transient tile misses
        const msg = e.error?.message || '';
        const isTransientTileError =
          msg.includes('status 404') ||
          msg.includes('status 429') ||
          msg.includes('tile');

        if (!isTransientTileError && !map?.getSource(BUILDINGS_SOURCE_ID)) {
          console.error('MapLibre error:', e);
          // If external style fails, try falling back to local dark style
          if (map) {
            console.warn('Attempting fallback to local dark style...');
            map.setStyle(FALLBACK_DARK_STYLE);
          }
        }
      });

      // Once base map style is loaded, load local GeoJSON buildings
      map.on('load', async () => {
        if (!isMounted || !map) return;

        // Hide basemap's flat 2D building footprints to prevent Z-fighting with 3D extrusions
        if (map.getLayer('building')) {
          map.setLayoutProperty('building', 'visibility', 'none');
        }

        // Configure directional lighting for 3D extrusion depth
        map.setLight({
          anchor: 'viewport',
          color: '#ffffff',
          intensity: 0.45,
          position: [1.5, 210, 40],
        });

        try {
          const res = await fetch(GEOJSON_DATA_URL);
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`);
          }
          const geojsonData = await res.json();
          if (!isMounted) return;

          // Count valid building polygon features
          const count = geojsonData.features.reduce(
            (
              acc: number,
              f: {
                geometry?: { type: string };
                properties?: Record<string, unknown>;
              }
            ) => {
              if (
                f.geometry &&
                (f.geometry.type === 'Polygon' ||
                  f.geometry.type === 'MultiPolygon') &&
                f.properties &&
                'building' in f.properties
              ) {
                return acc + 1;
              }
              return acc;
            },
            0
          );
          setBuildingCount(count);

          // Add building GeoJSON source
          if (!map.getSource(BUILDINGS_SOURCE_ID)) {
            map.addSource(BUILDINGS_SOURCE_ID, {
              type: 'geojson',
              data: geojsonData,
            });
          }

          // Add 3D building extrusion layer
          if (!map.getLayer(BUILDINGS_LAYER_ID)) {
            map.addLayer({
              id: BUILDINGS_LAYER_ID,
              type: 'fill-extrusion',
              source: BUILDINGS_SOURCE_ID,
              filter: ['all', ['==', '$type', 'Polygon'], ['has', 'building']],
              paint: {
                'fill-extrusion-color': BUILDING_COLOR_EXPRESSION,
                'fill-extrusion-height': BUILDING_HEIGHT_EXPRESSION,
                'fill-extrusion-base': 0,
                'fill-extrusion-opacity': 0.88,
                'fill-extrusion-vertical-gradient': true,
              },
            });
          }

          setIsLoading(false);
        } catch (dataErr: unknown) {
          if (!isMounted) return;
          console.error('GeoJSON loading error:', dataErr);
          const message =
            dataErr instanceof Error ? dataErr.message : String(dataErr);
          setError({
            type: 'data',
            title: 'Failed to Load Chandigarh Building Data',
            message: `Could not load ${GEOJSON_DATA_URL}. Check file existence and format.`,
            details: message,
          });
          setIsLoading(false);
        }
      });
    } catch (err: unknown) {
      console.error('Map initialization failed:', err);
      const message = err instanceof Error ? err.message : String(err);
      queueMicrotask(() => {
        if (!isMounted) return;
        setError({
          type: 'style',
          title: 'Map Initialization Error',
          message: 'Could not create MapLibre map instance.',
          details: message,
        });
        setIsLoading(false);
      });
    }

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [retryCount]);

  return (
    <div className="map-view-wrapper">
      <Header
        buildingCount={buildingCount}
        isLoading={isLoading}
        onResetView={resetCamera}
      />

      {error && <ErrorNotice error={error} onRetry={handleRetry} />}

      <div
        ref={mapContainerRef}
        className="map-gl-container"
        role="region"
        aria-label="3D Base Map of Chandigarh"
      />
    </div>
  );
};
