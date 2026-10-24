import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Map,
  NavigationControl,
  ScaleControl,
  AttributionControl,
  Popup,
  Marker,
  setWorkerUrl,
  type ErrorEvent,
  type MapLayerMouseEvent,
  type GeoJSONSource,
  LngLatBounds,
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
  PEDESTRIAN_GEOJSON_DATA_URL,
  PEDESTRIAN_SOURCE_ID,
  WHEELCHAIR_POINTS_GEOJSON_DATA_URL,
  WHEELCHAIR_POINTS_SOURCE_ID,
  CYCLEWAYS_GEOJSON_DATA_URL,
  CYCLEWAYS_SOURCE_ID,
  BICYCLE_PARKING_GEOJSON_DATA_URL,
  BICYCLE_PARKING_SOURCE_ID,
  HOSPITALS_GEOJSON_DATA_URL,
  HOSPITALS_SOURCE_ID,
  POLICE_GEOJSON_DATA_URL,
  POLICE_SOURCE_ID,
  SHOPS24_GEOJSON_DATA_URL,
  SHOPS24_SOURCE_ID,
  ROUTE_SOURCE_ID,
  ROUTE_CASING_LAYER_ID,
  ROUTE_LINE_LAYER_ID,
  WHEELCHAIR_PATHS_LAYER_ID,
  WHEELCHAIR_STEPS_LAYER_ID,
  WHEELCHAIR_POINTS_LAYER_ID,
  BICYCLE_CORRIDOR_TRACKS_LAYER_ID,
  BICYCLE_DEDICATED_LAYER_ID,
  BICYCLE_PARKING_LAYER_ID,
  NIGHT_HOSPITALS_LAYER_ID,
  NIGHT_POLICE_LAYER_ID,
  NIGHT_24SHOPS_LAYER_ID,
  PROFILE_LAYERS,
  INTERACTIVE_FEATURE_LAYERS,
  BUILDING_HEIGHT_EXPRESSION,
  BUILDING_COLOR_EXPRESSION,
  PROFILE_CONFIGS,
  getBlockFillColorExpression,
  getBlockFillOpacityExpression,
  getBlockLineColorExpression,
} from '../../config/mapConfig.ts';
import type {
  MapError,
  AppMode,
  UserProfile,
  RouteEndpoint,
  RouteResult,
  RoutingPreset,
} from '../../types/map.ts';
import { Header } from '../UI/Header.tsx';
import { ControlBar } from '../UI/ControlBar.tsx';
import { Legend } from '../UI/Legend.tsx';
import { RoutingPanel } from '../UI/RoutingPanel.tsx';
import { ErrorNotice } from '../UI/ErrorNotice.tsx';
import { AIRecommendationModal } from '../UI/AIRecommendationModal.tsx';
import { RoutingNetwork } from '../../services/routing/networkGraph.ts';
import { calculateRoute } from '../../services/routing/dijkstraRouter.ts';

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

function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createFeaturePopupHtml(
  layerId: string,
  p: Record<string, unknown>,
  coords: [number, number],
  mode: AppMode
): string {
  let badgeText = 'Feature';
  let badgeBg = '#4b5563';
  let title = p.name ? escapeHtml(p.name) : '';
  const rows: Array<{ key: string; val: string }> = [];
  let note = '';

  switch (layerId) {
    case WHEELCHAIR_POINTS_LAYER_ID: {
      const wc = String(p.wheelchair || 'unspecified');
      if (wc === 'yes') {
        badgeText = 'Wheelchair: Accessible';
        badgeBg = '#10b981';
      } else if (wc === 'limited') {
        badgeText = 'Wheelchair: Limited Access';
        badgeBg = '#f59e0b';
      } else {
        badgeText = 'Wheelchair: Inaccessible';
        badgeBg = '#ef4444';
      }
      if (!title) title = 'Accessibility Facility';
      rows.push({ key: 'Status', val: `wheelchair: ${escapeHtml(wc)}` });
      if (p.amenity) rows.push({ key: 'Facility', val: escapeHtml(p.amenity) });
      note = 'Verified explicit OSM wheelchair tag';
      break;
    }
    case WHEELCHAIR_STEPS_LAYER_ID: {
      badgeText = 'Steps / Stairs';
      badgeBg = '#f43f5e';
      if (!title) title = 'Pedestrian Steps';
      rows.push({
        key: 'Barrier',
        val: 'Stairs (impassable barrier for wheelchairs)',
      });
      rows.push({
        key: 'Ramp',
        val: p.ramp === 'no' ? 'Confirmed: No Ramp' : 'Unrecorded in OSM',
      });
      if (p.handrail) rows.push({ key: 'Handrail', val: escapeHtml(p.handrail) });
      if (p.incline) rows.push({ key: 'Incline', val: escapeHtml(p.incline) });
      note = 'chandigarh_pedestrian.geojson (avoided in Wheelchair Path mode)';
      break;
    }
    case BICYCLE_PARKING_LAYER_ID: {
      badgeText = 'Bicycle Parking';
      badgeBg = '#f59e0b';
      if (!title)
        title = p.operator
          ? escapeHtml(p.operator)
          : 'Bicycle Parking Facility';
      rows.push({ key: 'Type', val: 'amenity: bicycle_parking' });
      rows.push({
        key: 'Covered',
        val: p.covered === 'yes' ? 'Covered (Yes)' : 'Not specified',
      });
      if (p.operator) rows.push({ key: 'Operator', val: escapeHtml(p.operator) });
      note = 'chandigarh_bicyclepark.geojson';
      break;
    }
    case BICYCLE_DEDICATED_LAYER_ID: {
      badgeText = 'Dedicated Cycleway';
      badgeBg = '#fbbf24';
      if (!title) title = 'Segregated Cycle Track';
      rows.push({ key: 'Type', val: 'highway: cycleway' });
      if (p.surface) rows.push({ key: 'Surface', val: escapeHtml(p.surface) });
      if (p.oneway) rows.push({ key: 'One-Way', val: escapeHtml(p.oneway) });
      if (p.sport) rows.push({ key: 'Sport', val: escapeHtml(p.sport) });
      note = 'chandigarh_cycleways.geojson (preferred in Bicycle routing)';
      break;
    }
    case NIGHT_HOSPITALS_LAYER_ID: {
      badgeText = 'Hospital & Medical';
      badgeBg = '#ef4444';
      if (!title) title = 'Hospital (Unnamed in OSM)';
      rows.push({
        key: 'Emergency',
        val:
          p.emergency === 'yes'
            ? '24/7 Emergency Service (Yes)'
            : 'Unspecified in OSM',
      });
      if (p.wheelchair)
        rows.push({ key: 'Wheelchair', val: escapeHtml(p.wheelchair) });
      note = 'chandigarh_hospitals.geojson (24/7 service waypoint)';
      break;
    }
    case NIGHT_POLICE_LAYER_ID: {
      badgeText = 'Police Station';
      badgeBg = '#3b82f6';
      if (!title) title = 'Police Station (Unnamed in OSM)';
      rows.push({ key: 'Facility', val: 'amenity: police' });
      note = 'chandigarh_police.geojson (24/7 service waypoint)';
      break;
    }
    case NIGHT_24SHOPS_LAYER_ID: {
      badgeText = 'Verified 24/7 Store';
      badgeBg = '#a855f7';
      if (!title) title = '24-Hour Convenience Store';
      rows.push({ key: 'Hours', val: 'opening_hours: 24/7 (Verified)' });
      if (p.shop) rows.push({ key: 'Shop Type', val: escapeHtml(p.shop) });
      note = 'chandigarh_24shops.geojson (strictly verified 24/7 hours)';
      break;
    }
  }

  const rowsHtml = rows
    .map(
      (r) => `<div class="popup-prop-item">
        <span class="popup-prop-key">${r.key}:</span>
        <span class="popup-prop-val">${r.val}</span>
      </div>`
    )
    .join('');

  const coordStr = `${coords[0]},${coords[1]}`;
  const routingActionsHtml =
    mode === 'path'
      ? `<div class="popup-route-actions">
          <button type="button" class="popup-btn-route start" data-coords="${coordStr}" data-name="${title}">
            Set as Start (A)
          </button>
          <button type="button" class="popup-btn-route dest" data-coords="${coordStr}" data-name="${title}">
            Set as Dest (B)
          </button>
        </div>`
      : '';

  return `
    <div class="popup-card">
      <span class="popup-badge" style="background-color: ${badgeBg}; color: #ffffff;">${badgeText}</span>
      <h3 class="popup-title">${title}</h3>
      <div class="popup-prop-list">
        ${rowsHtml}
      </div>
      ${note ? `<div class="popup-note">${note}</div>` : ''}
      ${routingActionsHtml}
    </div>
  `;
}

export const MapContainer: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const popupRef = useRef<Popup | null>(null);
  const networkRef = useRef<RoutingNetwork>(new RoutingNetwork());

  // Map markers for Path Mode Start (A) and Destination (B)
  const startMarkerRef = useRef<Marker | null>(null);
  const destMarkerRef = useRef<Marker | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [buildingCount, setBuildingCount] = useState<number | null>(null);
  const [blockCount, setBlockCount] = useState<number | null>(null);

  // App mode and user profile state
  const [mode, setMode] = useState<AppMode>('block');
  const [activeProfile, setActiveProfile] = useState<UserProfile>('bicycle');
  const profileRef = useRef<UserProfile>(activeProfile);
  const modeRef = useRef<AppMode>(mode);

  // Routing state
  const [startPoint, setStartPoint] = useState<RouteEndpoint | null>(null);
  const [destPoint, setDestPoint] = useState<RouteEndpoint | null>(null);
  const [pickingMode, setPickingMode] = useState<'start' | 'dest' | null>(null);
  const pickingModeRef = useRef<'start' | 'dest' | null>(pickingMode);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [snapNotice, setSnapNotice] = useState<string | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  useEffect(() => {
    profileRef.current = activeProfile;
  }, [activeProfile]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    pickingModeRef.current = pickingMode;
  }, [pickingMode]);

  const handleModeChange = useCallback((newMode: AppMode) => {
    setMode(newMode);
    if (newMode === 'block') {
      setPickingMode(null);
    }
  }, []);

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

  // Update Route GeoJSON Source on map
  const renderRouteOnMap = useCallback(
    (coords: [number, number][], profile: UserProfile) => {
      const map = mapRef.current;
      if (!map) return;

      const source = map.getSource(ROUTE_SOURCE_ID) as GeoJSONSource | undefined;
      if (source) {
        if (coords.length >= 2) {
          source.setData({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: coords,
            },
            properties: { profile },
          });
        } else {
          source.setData({
            type: 'FeatureCollection',
            features: [],
          });
        }
      }

      // Update route line color
      if (map.getLayer(ROUTE_LINE_LAYER_ID)) {
        map.setPaintProperty(
          ROUTE_LINE_LAYER_ID,
          'line-color',
          PROFILE_CONFIGS[profile].accentColor
        );
      }
    },
    []
  );

  // Core route calculation trigger
  const triggerRouting = useCallback(
    (
      start: RouteEndpoint,
      dest: RouteEndpoint,
      profile: UserProfile,
      shouldFitBounds = false
    ) => {
      const network = networkRef.current;
      if (!network.isReady) return;

      setIsCalculating(true);
      setSnapNotice(null);

      // Snap start point
      const startSnap = network.snapPoint(
        start.coordinates[0],
        start.coordinates[1]
      );
      if (!startSnap) {
        setSnapNotice(
          'Start point could not be snapped to the mapped network (> 250m from roads).'
        );
        setIsCalculating(false);
        setRouteResult({
          success: false,
          coordinates: [],
          distanceMeters: 0,
          durationMinutes: 0,
          speedKmh: 0,
          profile,
          segmentBreakdown: {},
          startSnapped: start.coordinates,
          destSnapped: dest.coordinates,
          errorReason:
            'Start point is too far from any mapped street or path in Chandigarh (> 250m tolerance).',
        });
        renderRouteOnMap([], profile);
        return;
      }

      // Snap dest point
      const destSnap = network.snapPoint(
        dest.coordinates[0],
        dest.coordinates[1]
      );
      if (!destSnap) {
        setSnapNotice(
          'Destination could not be snapped to the mapped network (> 250m from roads).'
        );
        setIsCalculating(false);
        setRouteResult({
          success: false,
          coordinates: [],
          distanceMeters: 0,
          durationMinutes: 0,
          speedKmh: 0,
          profile,
          segmentBreakdown: {},
          startSnapped: startSnap.coordinates,
          destSnapped: dest.coordinates,
          errorReason:
            'Destination point is too far from any mapped street or path in Chandigarh (> 250m tolerance).',
        });
        renderRouteOnMap([], profile);
        return;
      }

      // Run Dijkstra router
      const result = calculateRoute(network, startSnap, destSnap, profile);
      setRouteResult(result);
      setIsCalculating(false);

      if (result.success && result.coordinates.length >= 2) {
        renderRouteOnMap(result.coordinates, profile);

        // Optionally zoom to route extent
        if (shouldFitBounds && mapRef.current) {
          const bounds = new LngLatBounds();
          for (const c of result.coordinates) {
            bounds.extend(c);
          }
          mapRef.current.fitBounds(bounds, {
            padding: { top: 100, bottom: 100, left: 400, right: 100 },
            maxZoom: 16,
            duration: 900,
          });
        }
      } else {
        renderRouteOnMap([], profile);
      }
    },
    [renderRouteOnMap]
  );

  // Recalculate route when endpoints or active profile changes
  useEffect(() => {
    if (mode === 'path' && startPoint && destPoint) {
      triggerRouting(startPoint, destPoint, activeProfile, false);
    }
  }, [activeProfile, startPoint, destPoint, mode, triggerRouting]);

  // Update MapLibre markers when startPoint or destPoint changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (mode === 'path') {
      // Start Marker
      if (startPoint && startMarkerRef.current) {
        const coords = startPoint.snappedPoint || startPoint.coordinates;
        startMarkerRef.current.setLngLat(coords).addTo(map);
      } else if (startMarkerRef.current) {
        startMarkerRef.current.remove();
      }

      // Dest Marker
      if (destPoint && destMarkerRef.current) {
        const coords = destPoint.snappedPoint || destPoint.coordinates;
        destMarkerRef.current.setLngLat(coords).addTo(map);
      } else if (destMarkerRef.current) {
        destMarkerRef.current.remove();
      }
    } else {
      if (startMarkerRef.current) startMarkerRef.current.remove();
      if (destMarkerRef.current) destMarkerRef.current.remove();
    }
  }, [startPoint, destPoint, mode]);

  // Helper to synchronize map layer paint styles and visibility to profile and mode
  const syncProfileLayers = useCallback((profile: UserProfile, currentMode: AppMode) => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Close open popup on profile switch
    if (popupRef.current) {
      popupRef.current.remove();
    }

    // 2. Update block fill colors & opacity
    if (map.getLayer(BLOCKS_FILL_LAYER_ID)) {
      map.setPaintProperty(
        BLOCKS_FILL_LAYER_ID,
        'fill-color',
        getBlockFillColorExpression(profile)
      );
      map.setPaintProperty(
        BLOCKS_FILL_LAYER_ID,
        'fill-opacity',
        getBlockFillOpacityExpression(profile, currentMode)
      );
    }

    // 3. Update block outline colors
    if (map.getLayer(BLOCKS_LINE_LAYER_ID)) {
      map.setPaintProperty(
        BLOCKS_LINE_LAYER_ID,
        'line-color',
        getBlockLineColorExpression(profile)
      );
    }

    // 4. Update route line color
    if (map.getLayer(ROUTE_LINE_LAYER_ID)) {
      map.setPaintProperty(
        ROUTE_LINE_LAYER_ID,
        'line-color',
        PROFILE_CONFIGS[profile].accentColor
      );
    }

    // 5. Toggle profile-specific line and marker layers
    const allProfiles: UserProfile[] = ['wheelchair', 'bicycle', 'night'];
    for (const p of allProfiles) {
      const isVisible = p === profile ? 'visible' : 'none';
      const layers = PROFILE_LAYERS[p] || [];
      for (const layerId of layers) {
        if (map.getLayer(layerId)) {
          map.setLayoutProperty(layerId, 'visibility', isVisible);
        }
      }
    }
  }, []);

  // Mode change effect: Subdue blocks and adjust visibility in Path Mode
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Close any open popup on mode change
    if (popupRef.current) {
      popupRef.current.remove();
    }

    // 2. Adjust block fill opacity for Path vs Block mode
    if (map.getLayer(BLOCKS_FILL_LAYER_ID)) {
      map.setPaintProperty(
        BLOCKS_FILL_LAYER_ID,
        'fill-opacity',
        getBlockFillOpacityExpression(activeProfile, mode)
      );
    }

    // 3. Toggle route line visibility
    const routeVisibility = mode === 'path' ? 'visible' : 'none';
    if (map.getLayer(ROUTE_LINE_LAYER_ID)) {
      map.setLayoutProperty(ROUTE_LINE_LAYER_ID, 'visibility', routeVisibility);
    }
    if (map.getLayer(ROUTE_CASING_LAYER_ID)) {
      map.setLayoutProperty(
        ROUTE_CASING_LAYER_ID,
        'visibility',
        routeVisibility
      );
    }

    // 4. Update cursor
    if (mode === 'path') {
      map.getCanvas().style.cursor = pickingMode ? 'crosshair' : '';
    } else {
      map.getCanvas().style.cursor = '';
    }
  }, [mode, activeProfile, pickingMode]);

  // Active Profile change effect: update layers and markers
  useEffect(() => {
    syncProfileLayers(activeProfile, modeRef.current);
  }, [activeProfile, syncProfileLayers]);

  // Main MapLibre Initialization Effect
  useEffect(() => {
    if (!mapContainerRef.current || !isWebGLSupported()) return;

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
      if (typeof window !== 'undefined') {
        (window as unknown as { _map?: Map })._map = map;
      }

      // Add navigation controls
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

      // Add attribution control
      map.addControl(
        new AttributionControl({
          compact: false,
          customAttribution:
            'Data: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap (ODbL)</a> | Basemap: <a href="https://openfreemap.org" target="_blank" rel="noopener noreferrer">OpenFreeMap</a>',
        }),
        'bottom-right'
      );

      // Create DOM Marker elements for Start and Destination
      const startMarkerEl = document.createElement('div');
      startMarkerEl.className = 'route-map-pin start';
      startMarkerEl.innerHTML = '<span class="pin-letter">A</span>';
      startMarkerRef.current = new Marker({
        element: startMarkerEl,
        anchor: 'center',
      });

      const destMarkerEl = document.createElement('div');
      destMarkerEl.className = 'route-map-pin dest';
      destMarkerEl.innerHTML = '<span class="pin-letter">B</span>';
      destMarkerRef.current = new Marker({
        element: destMarkerEl,
        anchor: 'center',
      });

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

      // Once style is loaded, fetch datasets and build graph
      map.on('load', async () => {
        if (!isMounted || !map) return;

        // Hide basemap's flat 2D building footprints
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
          // Fetch blocks, buildings, and profile feature datasets concurrently
          const [
            blocksRes,
            buildingsRes,
            pedestrianRes,
            wheelchairPointsRes,
            cyclewaysRes,
            bicycleParkRes,
            hospitalsRes,
            policeRes,
            shops24Res,
          ] = await Promise.all([
            fetch(BLOCKS_GEOJSON_DATA_URL),
            fetch(BUILDINGS_GEOJSON_DATA_URL),
            fetch(PEDESTRIAN_GEOJSON_DATA_URL),
            fetch(WHEELCHAIR_POINTS_GEOJSON_DATA_URL),
            fetch(CYCLEWAYS_GEOJSON_DATA_URL),
            fetch(BICYCLE_PARKING_GEOJSON_DATA_URL),
            fetch(HOSPITALS_GEOJSON_DATA_URL),
            fetch(POLICE_GEOJSON_DATA_URL),
            fetch(SHOPS24_GEOJSON_DATA_URL),
          ]);

          if (!blocksRes.ok)
            throw new Error(`Failed to load blocks: HTTP ${blocksRes.status}`);
          if (!buildingsRes.ok)
            throw new Error(
              `Failed to load buildings: HTTP ${buildingsRes.status}`
            );
          if (!pedestrianRes.ok)
            throw new Error(
              `Failed to load pedestrian data: HTTP ${pedestrianRes.status}`
            );
          if (!wheelchairPointsRes.ok)
            throw new Error(
              `Failed to load wheelchair points: HTTP ${wheelchairPointsRes.status}`
            );
          if (!cyclewaysRes.ok)
            throw new Error(
              `Failed to load cycleways: HTTP ${cyclewaysRes.status}`
            );
          if (!bicycleParkRes.ok)
            throw new Error(
              `Failed to load bicycle parking: HTTP ${bicycleParkRes.status}`
            );
          if (!hospitalsRes.ok)
            throw new Error(
              `Failed to load hospitals: HTTP ${hospitalsRes.status}`
            );
          if (!policeRes.ok)
            throw new Error(`Failed to load police: HTTP ${policeRes.status}`);
          if (!shops24Res.ok)
            throw new Error(
              `Failed to load 24h shops: HTTP ${shops24Res.status}`
            );

          const [
            blocksData,
            buildingsData,
            pedestrianData,
            wheelchairPointsData,
            cyclewaysData,
            bicycleParkData,
            hospitalsData,
            policeData,
            shops24Data,
          ] = await Promise.all([
            blocksRes.json(),
            buildingsRes.json(),
            pedestrianRes.json(),
            wheelchairPointsRes.json(),
            cyclewaysRes.json(),
            bicycleParkRes.json(),
            hospitalsRes.json(),
            policeRes.json(),
            shops24Res.json(),
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

          // Build routing network graph from loaded line features
          const nightPoints: Array<[number, number]> = [];
          for (const f of [
            ...hospitalsData.features,
            ...policeData.features,
            ...shops24Data.features,
          ]) {
            if (f.geometry?.type === 'Point' && Array.isArray(f.geometry.coordinates)) {
              nightPoints.push(f.geometry.coordinates as [number, number]);
            }
          }
          networkRef.current.build(buildingsData.features, nightPoints);

          // Find first symbol layer to insert ground/line layers below street labels
          const firstSymbolId = map
            .getStyle()
            .layers?.find((l) => l.type === 'symbol')?.id;

          // -------------------------------------------------------------
          // 1. Ground Sources & Layers (Blocks)
          // -------------------------------------------------------------
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
                  'fill-opacity': getBlockFillOpacityExpression(
                    profileRef.current,
                    modeRef.current
                  ),
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

          // -------------------------------------------------------------
          // 2. Line Infrastructure Sources & Layers
          // -------------------------------------------------------------
          // Pedestrian Source
          if (!map.getSource(PEDESTRIAN_SOURCE_ID)) {
            map.addSource(PEDESTRIAN_SOURCE_ID, {
              type: 'geojson',
              data: pedestrianData,
            });
          }

          // Cycleways Source
          if (!map.getSource(CYCLEWAYS_SOURCE_ID)) {
            map.addSource(CYCLEWAYS_SOURCE_ID, {
              type: 'geojson',
              data: cyclewaysData,
            });
          }

          // Wheelchair Walkways Line Layer
          if (!map.getLayer(WHEELCHAIR_PATHS_LAYER_ID)) {
            map.addLayer(
              {
                id: WHEELCHAIR_PATHS_LAYER_ID,
                type: 'line',
                source: PEDESTRIAN_SOURCE_ID,
                filter: [
                  'all',
                  ['==', ['geometry-type'], 'LineString'],
                  ['!=', ['get', 'highway'], 'steps'],
                ],
                layout: {
                  visibility:
                    profileRef.current === 'wheelchair' ? 'visible' : 'none',
                  'line-join': 'round',
                  'line-cap': 'round',
                },
                paint: {
                  'line-color': '#00c49f',
                  'line-width': 1.8,
                  'line-opacity': 0.65,
                },
              },
              firstSymbolId
            );
          }

          // Wheelchair Steps Line Layer (Warning / Barrier)
          if (!map.getLayer(WHEELCHAIR_STEPS_LAYER_ID)) {
            map.addLayer(
              {
                id: WHEELCHAIR_STEPS_LAYER_ID,
                type: 'line',
                source: PEDESTRIAN_SOURCE_ID,
                filter: [
                  'all',
                  ['==', ['geometry-type'], 'LineString'],
                  ['==', ['get', 'highway'], 'steps'],
                ],
                layout: {
                  visibility:
                    profileRef.current === 'wheelchair' ? 'visible' : 'none',
                  'line-join': 'round',
                  'line-cap': 'butt',
                },
                paint: {
                  'line-color': '#f43f5e',
                  'line-width': 2.8,
                  'line-dasharray': [2, 2],
                  'line-opacity': 0.95,
                },
              },
              firstSymbolId
            );
          }

          // -------------------------------------------------------------
          // 3. 3D Building Extrusion Source & Layer
          // -------------------------------------------------------------
          if (!map.getSource(BUILDINGS_SOURCE_ID)) {
            map.addSource(BUILDINGS_SOURCE_ID, {
              type: 'geojson',
              data: buildingsData,
            });
          }

          // Bicycle Corridor Tracks Line Layer
          if (!map.getLayer(BICYCLE_CORRIDOR_TRACKS_LAYER_ID)) {
            map.addLayer(
              {
                id: BICYCLE_CORRIDOR_TRACKS_LAYER_ID,
                type: 'line',
                source: BUILDINGS_SOURCE_ID,
                filter: [
                  'all',
                  ['==', ['geometry-type'], 'LineString'],
                  [
                    'any',
                    ['has', 'cycleway:left'],
                    ['has', 'cycleway:right'],
                    ['has', 'cycleway:both'],
                    ['has', 'cycleway'],
                  ],
                  ['!=', ['get', 'highway'], 'cycleway'],
                ],
                layout: {
                  visibility:
                    profileRef.current === 'bicycle' ? 'visible' : 'none',
                  'line-join': 'round',
                  'line-cap': 'round',
                },
                paint: {
                  'line-color': '#f59e0b',
                  'line-width': 2.0,
                  'line-opacity': 0.8,
                },
              },
              firstSymbolId
            );
          }

          // Bicycle Dedicated Cycleways Line Layer
          if (!map.getLayer(BICYCLE_DEDICATED_LAYER_ID)) {
            map.addLayer(
              {
                id: BICYCLE_DEDICATED_LAYER_ID,
                type: 'line',
                source: CYCLEWAYS_SOURCE_ID,
                layout: {
                  visibility:
                    profileRef.current === 'bicycle' ? 'visible' : 'none',
                  'line-join': 'round',
                  'line-cap': 'round',
                },
                paint: {
                  'line-color': '#fbbf24',
                  'line-width': 3.2,
                  'line-opacity': 0.95,
                },
              },
              firstSymbolId
            );
          }

          // 3D Buildings
          if (!map.getLayer(BUILDINGS_LAYER_ID)) {
            map.addLayer(
              {
                id: BUILDINGS_LAYER_ID,
                type: 'fill-extrusion',
                source: BUILDINGS_SOURCE_ID,
                filter: [
                  'all',
                  ['==', ['geometry-type'], 'Polygon'],
                  ['has', 'building'],
                ],
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

          // -------------------------------------------------------------
          // 4. Phase 4 Calculated Route Layers (placed above buildings)
          // -------------------------------------------------------------
          if (!map.getSource(ROUTE_SOURCE_ID)) {
            map.addSource(ROUTE_SOURCE_ID, {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: [],
              },
            });
          }

          // Route glow / casing layer
          if (!map.getLayer(ROUTE_CASING_LAYER_ID)) {
            map.addLayer(
              {
                id: ROUTE_CASING_LAYER_ID,
                type: 'line',
                source: ROUTE_SOURCE_ID,
                layout: {
                  visibility: modeRef.current === 'path' ? 'visible' : 'none',
                  'line-join': 'round',
                  'line-cap': 'round',
                },
                paint: {
                  'line-color': '#020617',
                  'line-width': 8.5,
                  'line-opacity': 0.8,
                  'line-blur': 1.0,
                },
              },
              firstSymbolId
            );
          }

          // Main Route line layer
          if (!map.getLayer(ROUTE_LINE_LAYER_ID)) {
            map.addLayer(
              {
                id: ROUTE_LINE_LAYER_ID,
                type: 'line',
                source: ROUTE_SOURCE_ID,
                layout: {
                  visibility: modeRef.current === 'path' ? 'visible' : 'none',
                  'line-join': 'round',
                  'line-cap': 'round',
                },
                paint: {
                  'line-color':
                    PROFILE_CONFIGS[profileRef.current].accentColor,
                  'line-width': 4.5,
                  'line-opacity': 0.95,
                },
              },
              firstSymbolId
            );
          }

          // -------------------------------------------------------------
          // 5. Point Marker Sources & Layers (rendered above 3D extrusions)
          // -------------------------------------------------------------
          // Wheelchair Accessibility Points
          if (!map.getSource(WHEELCHAIR_POINTS_SOURCE_ID)) {
            map.addSource(WHEELCHAIR_POINTS_SOURCE_ID, {
              type: 'geojson',
              data: wheelchairPointsData,
            });
          }

          if (!map.getLayer(WHEELCHAIR_POINTS_LAYER_ID)) {
            map.addLayer({
              id: WHEELCHAIR_POINTS_LAYER_ID,
              type: 'circle',
              source: WHEELCHAIR_POINTS_SOURCE_ID,
              layout: {
                visibility:
                  profileRef.current === 'wheelchair' ? 'visible' : 'none',
              },
              paint: {
                'circle-radius': 7.5,
                'circle-color': [
                  'match',
                  ['get', 'wheelchair'],
                  'yes',
                  '#10b981',
                  'limited',
                  '#f59e0b',
                  'no',
                  '#ef4444',
                  '#6b7280',
                ],
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2.0,
                'circle-pitch-alignment': 'viewport',
              },
            });
          }

          // Bicycle Parking Points
          if (!map.getSource(BICYCLE_PARKING_SOURCE_ID)) {
            map.addSource(BICYCLE_PARKING_SOURCE_ID, {
              type: 'geojson',
              data: bicycleParkData,
            });
          }

          if (!map.getLayer(BICYCLE_PARKING_LAYER_ID)) {
            map.addLayer({
              id: BICYCLE_PARKING_LAYER_ID,
              type: 'circle',
              source: BICYCLE_PARKING_SOURCE_ID,
              layout: {
                visibility:
                  profileRef.current === 'bicycle' ? 'visible' : 'none',
              },
              paint: {
                'circle-radius': 8.0,
                'circle-color': '#f59e0b',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2.2,
                'circle-pitch-alignment': 'viewport',
              },
            });
          }

          // Hospitals Points
          if (!map.getSource(HOSPITALS_SOURCE_ID)) {
            map.addSource(HOSPITALS_SOURCE_ID, {
              type: 'geojson',
              data: hospitalsData,
            });
          }

          if (!map.getLayer(NIGHT_HOSPITALS_LAYER_ID)) {
            map.addLayer({
              id: NIGHT_HOSPITALS_LAYER_ID,
              type: 'circle',
              source: HOSPITALS_SOURCE_ID,
              layout: {
                visibility: profileRef.current === 'night' ? 'visible' : 'none',
              },
              paint: {
                'circle-radius': 6.5,
                'circle-color': '#ef4444',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 1.8,
                'circle-pitch-alignment': 'viewport',
              },
            });
          }

          // Police Points
          if (!map.getSource(POLICE_SOURCE_ID)) {
            map.addSource(POLICE_SOURCE_ID, {
              type: 'geojson',
              data: policeData,
            });
          }

          if (!map.getLayer(NIGHT_POLICE_LAYER_ID)) {
            map.addLayer({
              id: NIGHT_POLICE_LAYER_ID,
              type: 'circle',
              source: POLICE_SOURCE_ID,
              layout: {
                visibility: profileRef.current === 'night' ? 'visible' : 'none',
              },
              paint: {
                'circle-radius': 7.0,
                'circle-color': '#3b82f6',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2.0,
                'circle-pitch-alignment': 'viewport',
              },
            });
          }

          // Verified 24h Shops Points
          if (!map.getSource(SHOPS24_SOURCE_ID)) {
            map.addSource(SHOPS24_SOURCE_ID, {
              type: 'geojson',
              data: shops24Data,
            });
          }

          if (!map.getLayer(NIGHT_24SHOPS_LAYER_ID)) {
            map.addLayer({
              id: NIGHT_24SHOPS_LAYER_ID,
              type: 'circle',
              source: SHOPS24_SOURCE_ID,
              layout: {
                visibility: profileRef.current === 'night' ? 'visible' : 'none',
              },
              paint: {
                'circle-radius': 8.5,
                'circle-color': '#c084fc',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2.5,
                'circle-pitch-alignment': 'viewport',
              },
            });
          }

          // -------------------------------------------------------------
          // 6. Interactive Popups & Hover Cursor Handlers
          // -------------------------------------------------------------
          const popup = new Popup({
            closeButton: true,
            closeOnClick: true,
            className: 'mapmycity-popup',
            offset: 8,
            maxWidth: '300px',
          });
          popupRef.current = popup;

          for (const layerId of INTERACTIVE_FEATURE_LAYERS) {
            map.on('click', layerId, (e: MapLayerMouseEvent) => {
              const f = e.features?.[0];
              if (!f || !f.properties) return;
              const coords: [number, number] =
                f.geometry.type === 'Point' &&
                Array.isArray((f.geometry as { coordinates?: unknown }).coordinates)
                  ? (f.geometry as { coordinates: [number, number] }).coordinates
                  : [e.lngLat.lng, e.lngLat.lat];

              const html = createFeaturePopupHtml(
                layerId,
                f.properties as Record<string, unknown>,
                coords,
                modeRef.current
              );
              popup.setLngLat(coords).setHTML(html).addTo(map!);
            });

            map.on('mouseenter', layerId, () => {
              if (map) map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', layerId, () => {
              if (map) {
                map.getCanvas().style.cursor =
                  modeRef.current === 'path' && pickingModeRef.current ? 'crosshair' : '';
              }
            });
          }

          // -------------------------------------------------------------
          // 7. General Map Click Handler (for Path Mode start/dest selection)
          // -------------------------------------------------------------
          map.on('click', (e: MapLayerMouseEvent) => {
            if (modeRef.current !== 'path') return;

            // If click originated on a feature that opens a popup, let popup handle it
            const clickedFeatures = map!.queryRenderedFeatures(e.point, {
              layers: INTERACTIVE_FEATURE_LAYERS.filter((l) => map!.getLayer(l)),
            });
            if (clickedFeatures.length > 0) return;

            const clickLon = e.lngLat.lng;
            const clickLat = e.lngLat.lat;

            const network = networkRef.current;
            if (!network.isReady) return;

            const snap = network.snapPoint(clickLon, clickLat);
            if (!snap) {
              setSnapNotice(
                'Selected point is too far (> 250m) from any mapped street. Click closer to a road.'
              );
              return;
            }
            setSnapNotice(null);

            const activePick = pickingModeRef.current;

            setStartPoint((prevStart) => {
              setDestPoint((prevDest) => {
                // Determine whether to set start or destination
                if (activePick === 'start' || !prevStart) {
                  setPickingMode(prevDest ? null : 'dest');
                  return prevDest;
                } else if (activePick === 'dest' || (prevStart && !prevDest)) {
                  setPickingMode(null);
                  return {
                    coordinates: [clickLon, clickLat],
                    snappedPoint: snap.coordinates,
                    snapDistanceMeters: snap.distanceMeters,
                  };
                } else {
                  // Both already set: update destination
                  return {
                    coordinates: [clickLon, clickLat],
                    snappedPoint: snap.coordinates,
                    snapDistanceMeters: snap.distanceMeters,
                  };
                }
              });

              if (activePick === 'start' || !prevStart) {
                return {
                  coordinates: [clickLon, clickLat],
                  snappedPoint: snap.coordinates,
                  snapDistanceMeters: snap.distanceMeters,
                };
              }
              return prevStart;
            });
          });

          // Sync initial layer visibility and paint properties to current profile/mode
          syncProfileLayers(profileRef.current, modeRef.current);

          setIsLoading(false);
        } catch (dataErr: unknown) {
          if (!isMounted) return;
          console.error('Data loading error:', dataErr);
          const message =
            dataErr instanceof Error ? dataErr.message : String(dataErr);
          setError({
            type: 'data',
            title: 'Failed to Load Chandigarh Map Layers',
            message:
              'Could not load GeoJSON block, building, or profile feature geometries.',
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
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
      if (startMarkerRef.current) {
        startMarkerRef.current.remove();
        startMarkerRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.remove();
        destMarkerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [retryCount, syncProfileLayers]);

  // Global listener for popup "Set Start / Set Dest" action clicks
  useEffect(() => {
    const handlePopupAction = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !target.classList.contains('popup-btn-route')) return;

      const coordsStr = target.getAttribute('data-coords');
      const nameStr = target.getAttribute('data-name') || undefined;
      if (!coordsStr) return;

      const [lon, lat] = coordsStr.split(',').map(Number);
      if (isNaN(lon) || isNaN(lat)) return;

      const snap = networkRef.current.snapPoint(lon, lat);

      if (target.classList.contains('start')) {
        setStartPoint({
          coordinates: [lon, lat],
          name: nameStr,
          snappedPoint: snap ? snap.coordinates : [lon, lat],
          snapDistanceMeters: snap ? snap.distanceMeters : 0,
        });
      } else if (target.classList.contains('dest')) {
        setDestPoint({
          coordinates: [lon, lat],
          name: nameStr,
          snappedPoint: snap ? snap.coordinates : [lon, lat],
          snapDistanceMeters: snap ? snap.distanceMeters : 0,
        });
      }

      if (popupRef.current) {
        popupRef.current.remove();
      }
    };

    document.addEventListener('click', handlePopupAction);
    return () => {
      document.removeEventListener('click', handlePopupAction);
    };
  }, []);

  // Endpoint handler callbacks
  const handleClearStart = useCallback(() => {
    setStartPoint(null);
    setRouteResult(null);
    renderRouteOnMap([], activeProfile);
  }, [activeProfile, renderRouteOnMap]);

  const handleClearDest = useCallback(() => {
    setDestPoint(null);
    setRouteResult(null);
    renderRouteOnMap([], activeProfile);
  }, [activeProfile, renderRouteOnMap]);

  const handleClearAll = useCallback(() => {
    setStartPoint(null);
    setDestPoint(null);
    setRouteResult(null);
    setSnapNotice(null);
    setPickingMode(null);
    renderRouteOnMap([], activeProfile);
  }, [activeProfile, renderRouteOnMap]);

  const handleReverseEndpoints = useCallback(() => {
    const tempStart = startPoint;
    setStartPoint(destPoint);
    setDestPoint(tempStart);
  }, [startPoint, destPoint]);

  const handleSelectPreset = useCallback(
    (preset: RoutingPreset, target: 'start' | 'dest') => {
      const snap = networkRef.current.snapPoint(
        preset.coordinates[0],
        preset.coordinates[1]
      );
      const ep: RouteEndpoint = {
        coordinates: preset.coordinates,
        name: preset.name,
        snappedPoint: snap ? snap.coordinates : preset.coordinates,
        snapDistanceMeters: snap ? snap.distanceMeters : 0,
      };

      if (target === 'start') {
        setStartPoint(ep);
      } else {
        setDestPoint(ep);
      }
    },
    []
  );

  return (
    <div className={`map-view-wrapper mode-${mode}`}>
      <Header
        buildingCount={buildingCount}
        blockCount={blockCount}
        isLoading={isLoading}
        mode={mode}
        onResetView={resetCamera}
      />

      <ControlBar
        mode={mode}
        onModeChange={handleModeChange}
        profile={activeProfile}
        onProfileChange={setActiveProfile}
        onOpenRecommendation={() => setIsAiModalOpen(true)}
      />

      {/* Antigravity AI Recommendation Modal */}
      <AIRecommendationModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        activeProfile={activeProfile}
        activeMode={mode}
        destPoint={destPoint}
        onApplyProfile={(p) => setActiveProfile(p)}
        onSelectDestination={(ep) => {
          const snap = networkRef.current.snapPoint(ep.coordinates[0], ep.coordinates[1]);
          setDestPoint({
            coordinates: ep.coordinates,
            name: ep.name,
            snappedPoint: snap ? snap.coordinates : ep.coordinates,
            snapDistanceMeters: snap ? snap.distanceMeters : 0,
          });
        }}
        onSwitchToPathMode={() => setMode('path')}
      />

      {/* Profile Density & Markers Legend */}
      <Legend profile={activeProfile} totalBlocks={blockCount} mode={mode} />

      {/* Path Mode Routing Panel */}
      {mode === 'path' && (
        <RoutingPanel
          profile={activeProfile}
          startPoint={startPoint}
          destPoint={destPoint}
          pickingMode={pickingMode}
          onSetPickingMode={setPickingMode}
          onClearStart={handleClearStart}
          onClearDest={handleClearDest}
          onClearAll={handleClearAll}
          onReverseEndpoints={handleReverseEndpoints}
          onSelectPreset={handleSelectPreset}
          routeResult={routeResult}
          isCalculating={isCalculating}
          snapNotice={snapNotice}
        />
      )}

      {error && <ErrorNotice error={error} onRetry={handleRetry} />}

      <div
        ref={mapContainerRef}
        className="map-gl-container"
        role="region"
        aria-label="3D Base Map of Chandigarh with Urban Block Gradients, Feature Markers, and Network Routing"
      />
    </div>
  );
};
