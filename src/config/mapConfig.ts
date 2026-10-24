import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl';

/**
 * Geographic center for Chandigarh, India.
 * Longitude ~76.78, Latitude ~30.735
 */
export const CHANDIGARH_CENTER: [number, number] = [76.78, 30.735];
export const INITIAL_ZOOM = 13.5;
export const INITIAL_PITCH = 52;
export const INITIAL_BEARING = -17.5;

/**
 * Building extrusion height parameters.
 * - Standard floor-to-floor height: 3.0 meters.
 * - Fallback default height: 6.0 meters (~2 storeys).
 *   This is a conservative, documented baseline reflecting Chandigarh's
 *   predominantly low-rise residential and commercial sector fabric,
 *   preventing missing height data from being treated as 0 or flattening buildings.
 */
export const METERS_PER_LEVEL = 3;
export const DEFAULT_BUILDING_HEIGHT = 6;

/**
 * MapLibre expression calculating building height:
 * 1. Checks explicit 'height' property (> 0).
 * 2. If absent or invalid, checks 'building:levels' (> 0) and multiplies by METERS_PER_LEVEL (3m).
 * 3. If both are absent or <= 0, falls back to conservative DEFAULT_BUILDING_HEIGHT (6m).
 */
export const BUILDING_HEIGHT_EXPRESSION: ExpressionSpecification = [
  'case',
  ['>', ['to-number', ['get', 'height'], 0], 0],
  ['to-number', ['get', 'height'], DEFAULT_BUILDING_HEIGHT],
  ['>', ['to-number', ['get', 'building:levels'], 0], 0],
  ['*', ['to-number', ['get', 'building:levels'], 2], METERS_PER_LEVEL],
  DEFAULT_BUILDING_HEIGHT,
];

/**
 * Architectural color scale based on building height.
 * Subtly distinguishes taller civic/commercial structures from 1-2 storey buildings
 * while maintaining a dark, restrained palette inspired by Blockprint.
 */
export const BUILDING_COLOR_EXPRESSION: ExpressionSpecification = [
  'interpolate',
  ['linear'],
  BUILDING_HEIGHT_EXPRESSION,
  3,
  '#222d3d',
  6,
  '#2d3c52',
  12,
  '#3d506d',
  21,
  '#536d93',
];

/**
 * MapLibre base style definition.
 * Uses OpenFreeMap Dark vector style (free, open-source basemap without API key or watermark requirements).
 * Source: https://openfreemap.org
 */
export const DARK_BASE_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark';

/**
 * Fallback dark data-only style if external network is unavailable.
 */
export const FALLBACK_DARK_STYLE: StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {},
  layers: [
    {
      id: 'dark-background',
      type: 'background',
      paint: {
        'background-color': '#0b0d13',
      },
    },
  ],
  light: {
    anchor: 'viewport',
    color: '#ffffff',
    intensity: 0.45,
    position: [1.5, 210, 40],
  },
};

export const GEOJSON_DATA_URL = '/data/chandigarh_osm.geojson';
export const BUILDINGS_SOURCE_ID = 'chandigarh-osm';
export const BUILDINGS_LAYER_ID = 'chandigarh-buildings-3d';
