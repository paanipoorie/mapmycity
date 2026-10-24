import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl';
import type { UserProfile, ProfileMeta } from '../types/map.ts';

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

export const BUILDINGS_GEOJSON_DATA_URL = '/data/chandigarh_osm.geojson';
export const BLOCKS_GEOJSON_DATA_URL = '/data/chandigarh_blocks.geojson';

export const BUILDINGS_SOURCE_ID = 'chandigarh-osm';
export const BUILDINGS_LAYER_ID = 'chandigarh-buildings-3d';

export const BLOCKS_SOURCE_ID = 'chandigarh-blocks';
export const BLOCKS_FILL_LAYER_ID = 'chandigarh-blocks-fill';
export const BLOCKS_LINE_LAYER_ID = 'chandigarh-blocks-outline';

/**
 * Profile-specific cartographic configurations.
 * Formulated with restrained dark tones inspired by Blockprint.
 */
export const PROFILE_CONFIGS: Record<UserProfile, ProfileMeta> = {
  wheelchair: {
    id: 'wheelchair',
    label: 'Wheelchair',
    shortLabel: 'Mobility',
    tagline: 'Pedestrian walkways & accessibility',
    accentColor: '#00c49f',
    outlineColor: 'rgba(0, 196, 159, 0.45)',
    densityUnit: 'features / km²',
    mappedBlocksCount: 354,
    dataDescription:
      'Density of mapped footways, sidewalks, ramps, and explicitly recorded wheelchair accessibility tags in OpenStreetMap.',
    gradient: [
      { tier: 0, label: 'None', range: '0', color: 'rgba(20, 26, 38, 0.45)' },
      { tier: 1, label: 'Low', range: '< 5', color: '#114b5f' },
      { tier: 2, label: 'Moderate', range: '5 – 25', color: '#028090' },
      { tier: 3, label: 'High', range: '25 – 50', color: '#00a896' },
      { tier: 4, label: 'Very High', range: '> 50', color: '#02c39a' },
    ],
  },
  bicycle: {
    id: 'bicycle',
    label: 'Bicycle',
    shortLabel: 'Cycling',
    tagline: 'Cycle tracks & bicycle parking',
    accentColor: '#f59e0b',
    outlineColor: 'rgba(245, 158, 11, 0.45)',
    densityUnit: 'score / km²',
    mappedBlocksCount: 569,
    dataDescription:
      'Density of dedicated cycleways, segregated cycle tracks along corridors, and verified bicycle parking.',
    gradient: [
      { tier: 0, label: 'None', range: '0', color: 'rgba(20, 26, 38, 0.45)' },
      { tier: 1, label: 'Low', range: '< 10', color: '#5e3a09' },
      { tier: 2, label: 'Moderate', range: '10 – 30', color: '#b46b14' },
      { tier: 3, label: 'High', range: '30 – 80', color: '#e68e19' },
      { tier: 4, label: 'Very High', range: '> 80', color: '#fbbf24' },
    ],
  },
  night: {
    id: 'night',
    label: 'Night',
    shortLabel: 'Nighttime',
    tagline: 'Emergency & 24/7 services',
    accentColor: '#a855f7',
    outlineColor: 'rgba(168, 85, 247, 0.45)',
    densityUnit: 'services / km²',
    mappedBlocksCount: 61,
    dataDescription:
      'Density of verified 24/7 convenience stores, police stations, and hospital emergency facilities.',
    gradient: [
      { tier: 0, label: 'None', range: '0', color: 'rgba(20, 26, 38, 0.45)' },
      { tier: 1, label: 'Low', range: '< 20', color: '#3c1b63' },
      { tier: 2, label: 'Moderate', range: '20 – 50', color: '#63339f' },
      { tier: 3, label: 'High', range: '50 – 100', color: '#8e4ec6' },
      { tier: 4, label: 'Very High', range: '> 100', color: '#c084fc' },
    ],
  },
};

/**
 * Returns the MapLibre expression for block fill color based on active profile tier.
 */
export function getBlockFillColorExpression(profile: UserProfile): ExpressionSpecification {
  const conf = PROFILE_CONFIGS[profile];
  const tierProp = `${profile}_tier`;
  return [
    'match',
    ['get', tierProp],
    0,
    conf.gradient[0].color,
    1,
    conf.gradient[1].color,
    2,
    conf.gradient[2].color,
    3,
    conf.gradient[3].color,
    4,
    conf.gradient[4].color,
    conf.gradient[0].color,
  ];
}

/**
 * Returns the MapLibre expression for block fill opacity based on active profile tier.
 */
export function getBlockFillOpacityExpression(profile: UserProfile): ExpressionSpecification {
  const tierProp = `${profile}_tier`;
  return [
    'case',
    ['==', ['get', tierProp], 0],
    0.35,
    0.78,
  ];
}

/**
 * Returns the MapLibre expression for block outline stroke color.
 */
export function getBlockLineColorExpression(profile: UserProfile): ExpressionSpecification {
  const conf = PROFILE_CONFIGS[profile];
  const tierProp = `${profile}_tier`;
  return [
    'case',
    ['==', ['get', tierProp], 0],
    'rgba(40, 52, 70, 0.35)',
    conf.outlineColor,
  ];
}
