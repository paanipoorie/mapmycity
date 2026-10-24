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
  BUILDINGS_GEOJSON_DATA_URL,
  BLOCKS_GEOJSON_DATA_URL,
  BUILDINGS_SOURCE_ID,
  BUILDINGS_LAYER_ID,
  BLOCKS_SOURCE_ID,
  BLOCKS_FILL_LAYER_ID,
  BLOCKS_LINE_LAYER_ID,
  BUILDING_HEIGHT_EXPRESSION,
  BUILDING_COLOR_EXPRESSION,
  getBlockFillColorExpression,
  getBlockFillOpacityExpression,
  getBlockLineColorExpression,
} from '../../config/mapConfig.ts';
import type { MapError, AppMode, UserProfile } from '../../types/map.ts';
import { Header } from '../UI/Header.tsx';
import { ControlBar } from '../UI/ControlBar.tsx';
import { Legend } from '../UI/Legend.tsx';
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
  const [blockCount, setBlockCount] = useState<number | null>(null);

  // App mode and user profile state
  const [mode, setMode] = useState<AppMode>('block');
  const [activeProfile, setActiveProfile] = useState<UserProfile>('bicycle');
  const profileRef = useRef<UserProfile>(activeProfile);

  useEffect(() => {
    profileRef.current = activeProfile;
  }, [activeProfile]);

  const [error, setError] = useState<MapError | null>(() => {
    if (!isWebGLSupported()) {
      return {
        type: 'webgl',
        title: 'WebGL Not Supported',
        message:
          'Your browser or device does not support WebGL, which is required for 3D map extrusions and vector block rendering.',
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

  // Update map layer paint properties when active profile changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    if (map.getLayer(BLOCKS_FILL_LAYER_ID)) {
      map.setPaintProperty(
        BLOCKS_FILL_LAYER_ID,
        'fill-color',
        getBlockFillColorExpression(activeProfile)
      );
      map.setPaintProperty(
        BLOCKS_FILL_LAYER_ID,
        'fill-opacity',
        getBlockFillOpacityExpression(activeProfile)
      );
    }

    if (map.getLayer(BLOCKS_LINE_LAYER_ID)) {
      map.setPaintProperty(
        BLOCKS_LINE_LAYER_ID,
        'line-color',
        getBlockLineColorExpression(activeProfile)
      );
    }
  }, [activeProfile]);

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

        const msg = e.error?.message || '';
        const isTransientTileError =
          msg.includes('status 404') ||
          msg.includes('status 429') ||
          msg.includes('tile');

        if (!isTransientTileError && !map?.getSource(BUILDINGS_SOURCE_ID)) {
          console.error('MapLibre error:', e);
          if (map) {
            console.warn('Attempting fallback to local dark style...');
            map.setStyle(FALLBACK_DARK_STYLE);
          }
        }
      });

      // Once base map style is loaded, load GeoJSON blocks & buildings
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
          // Fetch blocks and 3D buildings concurrently
          const [blocksRes, buildingsRes] = await Promise.all([
            fetch(BLOCKS_GEOJSON_DATA_URL),
            fetch(BUILDINGS_GEOJSON_DATA_URL),
          ]);

          if (!blocksRes.ok) {
            throw new Error(`Failed to load blocks: HTTP ${blocksRes.status}`);
          }
          if (!buildingsRes.ok) {
            throw new Error(`Failed to load buildings: HTTP ${buildingsRes.status}`);
          }

          const [blocksData, buildingsData] = await Promise.all([
            blocksRes.json(),
            buildingsRes.json(),
          ]);

          if (!isMounted) return;

          setBlockCount(blocksData.features.length);

          // Count valid building polygon features
          const bCount = buildingsData.features.reduce(
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
          setBuildingCount(bCount);

          // Find first symbol layer to insert custom data below street labels
          const firstSymbolId = map
            .getStyle()
            .layers?.find((l) => l.type === 'symbol')?.id;

          // 1. Add Blocks Source & Layers (ground plane)
          if (!map.getSource(BLOCKS_SOURCE_ID)) {
            map.addSource(BLOCKS_SOURCE_ID, {
              type: 'geojson',
              data: blocksData,
            });
          }

          if (!map.getLayer(BLOCKS_FILL_LAYER_ID)) {
            map.addLayer(
              {
                id: BLOCKS_FILL_LAYER_ID,
                type: 'fill',
                source: BLOCKS_SOURCE_ID,
                paint: {
                  'fill-color': getBlockFillColorExpression(profileRef.current),
                  'fill-opacity': getBlockFillOpacityExpression(profileRef.current),
                },
              },
              firstSymbolId
            );
          }

          if (!map.getLayer(BLOCKS_LINE_LAYER_ID)) {
            map.addLayer(
              {
                id: BLOCKS_LINE_LAYER_ID,
                type: 'line',
                source: BLOCKS_SOURCE_ID,
                paint: {
                  'line-color': getBlockLineColorExpression(profileRef.current),
                  'line-width': 0.85,
                  'line-opacity': 0.65,
                },
              },
              firstSymbolId
            );
          }

          // 2. Add 3D Building Extrusion Source & Layer (elevated plane)
          if (!map.getSource(BUILDINGS_SOURCE_ID)) {
            map.addSource(BUILDINGS_SOURCE_ID, {
              type: 'geojson',
              data: buildingsData,
            });
          }

          if (!map.getLayer(BUILDINGS_LAYER_ID)) {
            map.addLayer(
              {
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
              },
              firstSymbolId
            );
          }

          setIsLoading(false);
        } catch (dataErr: unknown) {
          if (!isMounted) return;
          console.error('Data loading error:', dataErr);
          const message =
            dataErr instanceof Error ? dataErr.message : String(dataErr);
          setError({
            type: 'data',
            title: 'Failed to Load Chandigarh Map Layers',
            message: 'Could not load GeoJSON block or building geometries.',
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
        blockCount={blockCount}
        isLoading={isLoading}
        onResetView={resetCamera}
      />

      <ControlBar
        mode={mode}
        onModeChange={setMode}
        profile={activeProfile}
        onProfileChange={setActiveProfile}
      />

      <Legend profile={activeProfile} totalBlocks={blockCount} />

      {error && <ErrorNotice error={error} onRetry={handleRetry} />}

      <div
        ref={mapContainerRef}
        className="map-gl-container"
        role="region"
        aria-label="3D Base Map of Chandigarh with Urban Block Gradients"
      />
    </div>
  );
};
