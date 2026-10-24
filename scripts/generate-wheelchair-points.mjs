/**
 * scripts/generate-wheelchair-points.mjs
 *
 * Extracts verified wheelchair accessibility point features from:
 * - public/data/chandigarh_accessibility.geojson (explicit wheelchair tags on facilities/areas)
 * - public/data/chandigarh_hospitals.geojson (explicit wheelchair tags on hospital nodes)
 *
 * Output:
 * - public/data/chandigarh_wheelchair_points.geojson (8 verified point features)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = resolve(__dirname, '../public/data');

const acc = JSON.parse(readFileSync(resolve(DATA_DIR, 'chandigarh_accessibility.geojson'), 'utf8'));
const hosp = JSON.parse(readFileSync(resolve(DATA_DIR, 'chandigarh_hospitals.geojson'), 'utf8'));

function computeCentroid(geometry) {
  if (geometry.type === 'Point') {
    return geometry.coordinates;
  }
  let ring = [];
  if (geometry.type === 'Polygon') {
    ring = geometry.coordinates[0];
  } else if (geometry.type === 'MultiPolygon') {
    ring = geometry.coordinates[0][0];
  }
  if (!ring || ring.length === 0) return null;
  let sumX = 0;
  let sumY = 0;
  for (const pt of ring) {
    sumX += pt[0];
    sumY += pt[1];
  }
  return [Number((sumX / ring.length).toFixed(6)), Number((sumY / ring.length).toFixed(6))];
}

const features = [];
const seenIds = new Set();

// 1. Facilities from chandigarh_accessibility.geojson with wheelchair tag
for (const f of acc.features) {
  const p = f.properties || {};
  if (p.wheelchair) {
    const id = f.id || p['@id'];
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const coords = computeCentroid(f.geometry);
    if (!coords) continue;

    features.push({
      type: 'Feature',
      id,
      geometry: {
        type: 'Point',
        coordinates: coords,
      },
      properties: {
        id,
        name: p.name || 'Unnamed Facility',
        wheelchair: p.wheelchair,
        category: 'Wheelchair Accessibility',
        amenity: p.amenity || p.building || p.leisure || 'facility',
        original_geometry: f.geometry.type,
      },
    });
  }
}

// 2. Facilities from chandigarh_hospitals.geojson with wheelchair tag
for (const f of hosp.features) {
  const p = f.properties || {};
  if (p.wheelchair) {
    const id = f.id || p['@id'];
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    features.push({
      type: 'Feature',
      id,
      geometry: {
        type: 'Point',
        coordinates: [Number(f.geometry.coordinates[0].toFixed(6)), Number(f.geometry.coordinates[1].toFixed(6))],
      },
      properties: {
        id,
        name: p.name || 'Unnamed Hospital',
        wheelchair: p.wheelchair,
        category: 'Wheelchair Accessibility',
        amenity: 'hospital',
        original_geometry: 'Point',
      },
    });
  }
}

const outputGeoJSON = {
  type: 'FeatureCollection',
  name: 'chandigarh_wheelchair_points',
  features,
};

const outputPath = resolve(DATA_DIR, 'chandigarh_wheelchair_points.geojson');
writeFileSync(outputPath, JSON.stringify(outputGeoJSON, null, 2), 'utf8');

console.log(`Generated ${features.length} verified wheelchair points at ${outputPath}`);
features.forEach(f => {
  console.log(`- [${f.properties.wheelchair}] ${f.properties.name} (${f.properties.amenity}) at [${f.geometry.coordinates}]`);
});
