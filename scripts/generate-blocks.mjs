/**
 * scripts/generate-blocks.mjs
 *
 * Reproducible data-driven generation of road-bounded urban blocks for Chandigarh
 * and spatial assignment of profile-relevant features (Wheelchair, Bicycle, Night).
 *
 * Inputs:
 * - public/data/chandigarh_osm.geojson (road linework + 24/7 venue)
 * - public/data/chandigarh_sector.geojson (official sector boundary coverage)
 * - public/data/chandigarh_accessibility.geojson (wheelchair/accessibility tags)
 * - public/data/chandigarh_pedestrian.geojson (sidewalks, footways, steps, ramps)
 * - public/data/chandigarh_cycleways.geojson (dedicated cycle tracks)
 * - public/data/chandigarh_bicyclepark.geojson (bicycle parking points)
 * - public/data/chandigarh_hospitals.geojson (hospital facilities)
 * - public/data/chandigarh_police.geojson (police stations)
 * - public/data/chandigarh_24shops.geojson (24-hour verified convenience/stores)
 *
 * Output:
 * - public/data/chandigarh_blocks.geojson
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = resolve(__dirname, '../public/data');

console.log('Loading datasets from', DATA_DIR);
const osm = JSON.parse(readFileSync(resolve(DATA_DIR, 'chandigarh_osm.geojson'), 'utf8'));
const sectors = JSON.parse(readFileSync(resolve(DATA_DIR, 'chandigarh_sector.geojson'), 'utf8'));
const acc = JSON.parse(readFileSync(resolve(DATA_DIR, 'chandigarh_accessibility.geojson'), 'utf8'));
const ped = JSON.parse(readFileSync(resolve(DATA_DIR, 'chandigarh_pedestrian.geojson'), 'utf8'));
const cyc = JSON.parse(readFileSync(resolve(DATA_DIR, 'chandigarh_cycleways.geojson'), 'utf8'));
const bpark = JSON.parse(readFileSync(resolve(DATA_DIR, 'chandigarh_bicyclepark.geojson'), 'utf8'));
const hosp = JSON.parse(readFileSync(resolve(DATA_DIR, 'chandigarh_hospitals.geojson'), 'utf8'));
const police = JSON.parse(readFileSync(resolve(DATA_DIR, 'chandigarh_police.geojson'), 'utf8'));
const shops24 = JSON.parse(readFileSync(resolve(DATA_DIR, 'chandigarh_24shops.geojson'), 'utf8'));

// -----------------------------------------------------------------------------
// Step 1: Collect road network linework and snap coordinates (~1 cm precision)
// -----------------------------------------------------------------------------
const SNAP = 1e-7;
const key = (x, y) => `${Math.round(x / SNAP)}_${Math.round(y / SNAP)}`;
const nodeCoords = new Map();

function collectLines(features, filterFn) {
  const lines = [];
  for (const f of features) {
    if (!f.geometry || f.geometry.type !== 'LineString') continue;
    if (filterFn && !filterFn(f)) continue;
    const pts = [];
    for (const c of f.geometry.coordinates) {
      const k = key(c[0], c[1]);
      if (!nodeCoords.has(k)) nodeCoords.set(k, [c[0], c[1]]);
      pts.push(k);
    }
    const clean = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      if (pts[i] !== clean[clean.length - 1]) clean.push(pts[i]);
    }
    if (clean.length >= 2) lines.push(clean);
  }
  return lines;
}

const osmLines = collectLines(osm.features, f => f.properties?.highway && f.properties?.area !== 'yes');
console.log(`[Step 1] Collected ${osmLines.length} road network lines (${nodeCoords.size} nodes).`);

// -----------------------------------------------------------------------------
// Step 2: Split edges at T-junctions
// -----------------------------------------------------------------------------
const CELL = 0.002;
const cellOf = (x, y) => `${Math.floor(x / CELL)}_${Math.floor(y / CELL)}`;
const vertexGrid = new Map();
for (const [k, [x, y]] of nodeCoords) {
  const ck = cellOf(x, y);
  if (!vertexGrid.has(ck)) vertexGrid.set(ck, []);
  vertexGrid.get(ck).push(k);
}
const coordOf = k => nodeCoords.get(k);
const EPS = 1e-7;

function splitLine(pts) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = coordOf(pts[i]), b = coordOf(pts[i + 1]);
    const minx = Math.min(a[0], b[0]) - EPS, maxx = Math.max(a[0], b[0]) + EPS;
    const miny = Math.min(a[1], b[1]) - EPS, maxy = Math.max(a[1], b[1]) + EPS;
    const c0x = Math.floor(minx / CELL), c1x = Math.floor(maxx / CELL);
    const c0y = Math.floor(miny / CELL), c1y = Math.floor(maxy / CELL);
    const cands = [];
    for (let cx = c0x; cx <= c1x; cx++) {
      for (let cy = c0y; cy <= c1y; cy++) {
        const arr = vertexGrid.get(`${cx}_${cy}`);
        if (arr) cands.push(...arr);
      }
    }
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len2 = dx * dx + dy * dy;
    const splits = [];
    for (const ck of cands) {
      if (ck === pts[i] || ck === pts[i + 1]) continue;
      const c = coordOf(ck);
      const t = ((c[0] - a[0]) * dx + (c[1] - a[1]) * dy) / len2;
      if (t <= 0 || t >= 1) continue;
      const px = a[0] + t * dx, py = a[1] + t * dy;
      const d = Math.hypot(px - c[0], py - c[1]);
      if (d <= EPS) splits.push({ t, k: ck });
    }
    splits.sort((p, q) => p.t - q.t);
    let prev = pts[i];
    for (const s of splits) {
      if (s.k !== prev) {
        out.push([prev, s.k]);
        prev = s.k;
      }
    }
    out.push([prev, pts[i + 1]]);
  }
  return out;
}

const edgeSet = new Set();
const edgesAll = [];
for (const pts of osmLines) {
  for (const [u, v] of splitLine(pts)) {
    const e = u < v ? `${u}|${v}` : `${v}|${u}`;
    if (!edgeSet.has(e)) {
      edgeSet.add(e);
      edgesAll.push([u, v]);
    }
  }
}
console.log(`[Step 2] Formed planar edge network with ${edgesAll.length} edges.`);

// -----------------------------------------------------------------------------
// Step 3: Planar graph face tracing
// -----------------------------------------------------------------------------
const adj = new Map();
const addEdge = (u, v) => {
  const a = coordOf(u), b = coordOf(v);
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  if (!adj.has(u)) adj.set(u, []);
  adj.get(u).push({ to: v, ang });
};
for (const [u, v] of edgesAll) {
  addEdge(u, v);
  addEdge(v, u);
}
for (const arr of adj.values()) arr.sort((p, q) => p.ang - q.ang);
const indexOf = new Map();
for (const [n, arr] of adj) arr.forEach((e, i) => indexOf.set(`${n}|${e.to}`, i));

const used = new Set();
const faces = [];
for (const [u, v] of edgesAll) {
  for (const [s, t] of [[u, v], [v, u]]) {
    const d = `${s}|${t}`;
    if (used.has(d)) continue;
    const ring = [s];
    let cur = s, nxt = t;
    used.add(d);
    ring.push(nxt);
    let guard = 0;
    while (nxt !== s && guard++ < 100000) {
      const arr = adj.get(nxt);
      const backIdx = indexOf.get(`${nxt}|${cur}`);
      const nextIdx = (backIdx - 1 + arr.length) % arr.length;
      const ne = arr[nextIdx];
      used.add(`${nxt}|${ne.to}`);
      cur = nxt;
      nxt = ne.to;
      if (nxt !== s) ring.push(nxt);
    }
    if (nxt === s) faces.push(ring);
  }
}

// Equirectangular projection factors at Chandigarh latitude (~30.73 N)
const lat0 = 30.73;
const KX = 111.32 * Math.cos(lat0 * Math.PI / 180);
const KY = 110.57;

const areaOf = ring => {
  let a = 0;
  for (let i = 0; i < ring.length; i++) {
    const p1 = coordOf(ring[i]), p2 = coordOf(ring[(i + 1) % ring.length]);
    a += p1[0] * KX * p2[1] * KY - p2[0] * KX * p1[1] * KY;
  }
  return a / 2; // Positive area = CCW = interior face
};

function polygonCentroid(coords) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < coords.length; i++) {
    const p1 = coords[i], p2 = coords[(i + 1) % coords.length];
    const cross = p1[0] * p2[1] - p2[0] * p1[1];
    a += cross;
    cx += (p1[0] + p2[0]) * cross;
    cy += (p1[1] + p2[1]) * cross;
  }
  a = a * 0.5;
  if (Math.abs(a) < 1e-12) {
    let sx = 0, sy = 0;
    for (const c of coords) { sx += c[0]; sy += c[1]; }
    return [sx / coords.length, sy / coords.length];
  }
  return [cx / (6 * a), cy / (6 * a)];
}

function pointInRing(pt, coords) {
  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i][0], yi = coords[i][1], xj = coords[j][0], yj = coords[j][1];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

const inner = faces.map(r => ({ ring: r, area: areaOf(r) })).filter(f => f.area > 0);
console.log(`[Step 3] Traced ${faces.length} total cycles: ${inner.length} interior faces (Phase 0 baseline).`);

// Prepare polygon objects with bounding box and verified interior test points
const faceObjs = inner.map((f, id) => {
  const coords = f.ring.map(k => coordOf(k));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of coords) {
    if (c[0] < minX) minX = c[0];
    if (c[1] < minY) minY = c[1];
    if (c[0] > maxX) maxX = c[0];
    if (c[1] > maxY) maxY = c[1];
  }
  const centroid = polygonCentroid(coords);
  let testPoint = centroid;
  if (!pointInRing(testPoint, coords)) {
    for (let i = 1; i < coords.length - 1; i++) {
      const mid = [
        (coords[0][0] + coords[i][0] + coords[i + 1][0]) / 3,
        (coords[0][1] + coords[i][1] + coords[i + 1][1]) / 3,
      ];
      if (pointInRing(mid, coords)) {
        testPoint = mid;
        break;
      }
    }
  }

  return {
    id,
    area: f.area,
    coords,
    centroid,
    testPoint,
    bbox: [minX, minY, maxX, maxY],
  };
});

// -----------------------------------------------------------------------------
// Step 4: Sector coverage & boundary clipping
// -----------------------------------------------------------------------------
const sectorFeatures = [];
for (const f of sectors.features) {
  const name = f.properties?.Sector_nam || f.properties?.name || 'Chandigarh';
  if (f.geometry.type === 'Polygon') {
    sectorFeatures.push({ name, ring: f.geometry.coordinates[0] });
  } else if (f.geometry.type === 'MultiPolygon') {
    for (const p of f.geometry.coordinates) {
      sectorFeatures.push({ name, ring: p[0] });
    }
  }
}

function findSector(pt) {
  for (const s of sectorFeatures) {
    if (pointInRing(pt, s.ring)) return s.name;
  }
  return null;
}

// -----------------------------------------------------------------------------
// Step 5: Filter nested/enclosing faces, slivers, and superblocks
// -----------------------------------------------------------------------------
faceObjs.sort((a, b) => b.area - a.area);

const BCELL = 0.01;
const blockGrid = new Map();
faceObjs.forEach((f, idx) => {
  const c0x = Math.floor(f.bbox[0] / BCELL), c1x = Math.floor(f.bbox[2] / BCELL);
  const c0y = Math.floor(f.bbox[1] / BCELL), c1y = Math.floor(f.bbox[3] / BCELL);
  for (let x = c0x; x <= c1x; x++) {
    for (let y = c0y; y <= c1y; y++) {
      const k = `${x}_${y}`;
      if (!blockGrid.has(k)) blockGrid.set(k, []);
      blockGrid.get(k).push(idx);
    }
  }
});

const containsOthers = new Set();
for (let i = 0; i < faceObjs.length; i++) {
  const A = faceObjs[i];
  const c0x = Math.floor(A.bbox[0] / BCELL), c1x = Math.floor(A.bbox[2] / BCELL);
  const c0y = Math.floor(A.bbox[1] / BCELL), c1y = Math.floor(A.bbox[3] / BCELL);
  const cands = new Set();
  for (let x = c0x; x <= c1x; x++) {
    for (let y = c0y; y <= c1y; y++) {
      const arr = blockGrid.get(`${x}_${y}`);
      if (arr) {
        for (const idx of arr) if (idx > i) cands.add(idx);
      }
    }
  }
  for (const j of cands) {
    const B = faceObjs[j];
    if (
      B.testPoint[0] >= A.bbox[0] &&
      B.testPoint[0] <= A.bbox[2] &&
      B.testPoint[1] >= A.bbox[1] &&
      B.testPoint[1] <= A.bbox[3]
    ) {
      if (pointInRing(B.testPoint, A.coords)) {
        containsOthers.add(i);
        break;
      }
    }
  }
}

const atomic = faceObjs.filter((_, idx) => !containsOthers.has(idx));
console.log(`[Step 5] Filtered ${containsOthers.size} enclosing/overlapping faces -> ${atomic.length} atomic faces.`);

const MIN_BLOCK_AREA_KM2 = 0.001; // 1,000 m² (filters tiny traffic islands / medians)
const MAX_BLOCK_AREA_KM2 = 0.5;   // 500,000 m² (filters peripheral superblocks)

const cityBlocks = [];
for (const b of atomic) {
  if (b.area >= MIN_BLOCK_AREA_KM2 && b.area <= MAX_BLOCK_AREA_KM2) {
    const secName = findSector(b.testPoint);
    if (secName) {
      b.sector = secName;
      cityBlocks.push(b);
    }
  }
}

console.log(`[Step 5] Clipped to Chandigarh sectors: ${cityBlocks.length} valid urban blocks retained.`);

// -----------------------------------------------------------------------------
// Step 6: Feature assignment by spatial indexing
// -----------------------------------------------------------------------------
const blockSpatialGrid = new Map();
const GRID_STEP = 0.005;
const gkey = (x, y) => `${Math.floor(x / GRID_STEP)}_${Math.floor(y / GRID_STEP)}`;

cityBlocks.forEach((b, bidx) => {
  const minX = b.bbox[0], minY = b.bbox[1], maxX = b.bbox[2], maxY = b.bbox[3];
  const x0 = Math.floor(minX / GRID_STEP), x1 = Math.floor(maxX / GRID_STEP);
  const y0 = Math.floor(minY / GRID_STEP), y1 = Math.floor(maxY / GRID_STEP);
  for (let x = x0; x <= x1; x++) {
    for (let y = y0; y <= y1; y++) {
      const k = `${x}_${y}`;
      if (!blockSpatialGrid.has(k)) blockSpatialGrid.set(k, []);
      blockSpatialGrid.get(k).push(bidx);
    }
  }
});

function findBlockForPoint(pt) {
  const k = gkey(pt[0], pt[1]);
  const cands = blockSpatialGrid.get(k) || [];
  for (const bidx of cands) {
    const b = cityBlocks[bidx];
    if (pt[0] >= b.bbox[0] && pt[0] <= b.bbox[2] && pt[1] >= b.bbox[1] && pt[1] <= b.bbox[3]) {
      if (pointInRing(pt, b.coords)) return bidx;
    }
  }
  return -1;
}

function distKm(p1, p2) {
  const dx = (p2[0] - p1[0]) * KX;
  const dy = (p2[1] - p1[1]) * KY;
  return Math.hypot(dx, dy);
}

function assignLineToBlocks(coords, onBlockIntersection) {
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i], p2 = coords[i + 1];
    const segLen = distKm(p1, p2);
    const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
    const bidx = findBlockForPoint(mid);
    if (bidx !== -1) {
      onBlockIntersection(bidx, segLen);
    } else {
      const b1 = findBlockForPoint(p1);
      if (b1 !== -1) onBlockIntersection(b1, segLen / 2);
      const b2 = findBlockForPoint(p2);
      if (b2 !== -1 && b2 !== b1) onBlockIntersection(b2, segLen / 2);
    }
  }
}

const blockData = cityBlocks.map((b, i) => ({
  block_id: `block_${i + 1}`,
  area_km2: +(b.area.toFixed(4)),
  sector: b.sector,
  // Night profile features
  hospitals_count: 0,
  police_count: 0,
  shops_24h_count: 0,
  night_features_count: 0,
  // Bicycle profile features
  bicycle_parking_count: 0,
  cycleway_length_km: 0,
  bicycle_features_count: 0,
  // Wheelchair profile features
  wheelchair_tags_count: 0,
  pedestrian_length_km: 0,
  wheelchair_features_count: 0,
}));

// Night features assignment:
// 1. Hospitals (chandigarh_hospitals.geojson)
hosp.features.forEach(f => {
  if (f.geometry.type === 'Point') {
    const bidx = findBlockForPoint(f.geometry.coordinates);
    if (bidx !== -1) {
      blockData[bidx].hospitals_count++;
      blockData[bidx].night_features_count++;
    }
  }
});
// 2. Police (chandigarh_police.geojson)
police.features.forEach(f => {
  if (f.geometry.type === 'Point') {
    const bidx = findBlockForPoint(f.geometry.coordinates);
    if (bidx !== -1) {
      blockData[bidx].police_count++;
      blockData[bidx].night_features_count++;
    }
  }
});
// 3. 24-hour shops (chandigarh_24shops.geojson)
shops24.features.forEach(f => {
  if (f.geometry.type === 'Point') {
    const bidx = findBlockForPoint(f.geometry.coordinates);
    if (bidx !== -1) {
      blockData[bidx].shops_24h_count++;
      blockData[bidx].night_features_count++;
    }
  }
});
// 4. Verified 24/7 restaurant in OSM (Churi House)
for (const f of osm.features) {
  if (f.properties?.opening_hours === '24/7' && f.geometry.type === 'Polygon') {
    const pt = f.geometry.coordinates[0][0];
    const bidx = findBlockForPoint(pt);
    if (bidx !== -1) {
      blockData[bidx].shops_24h_count++;
      blockData[bidx].night_features_count++;
    }
  }
}

// Bicycle features assignment:
// 1. Bicycle parking points (chandigarh_bicyclepark.geojson)
bpark.features.forEach(f => {
  if (f.geometry.type === 'Point') {
    const bidx = findBlockForPoint(f.geometry.coordinates);
    if (bidx !== -1) {
      blockData[bidx].bicycle_parking_count++;
      blockData[bidx].bicycle_features_count++;
    }
  }
});
// 2. Dedicated cycleways (chandigarh_cycleways.geojson)
cyc.features.forEach(f => {
  if (f.geometry.type === 'LineString') {
    assignLineToBlocks(f.geometry.coordinates, (bidx, len) => {
      blockData[bidx].cycleway_length_km += len;
      blockData[bidx].bicycle_features_count += len;
    });
  }
});
// 3. Roads with cycleway tags (chandigarh_osm.geojson)
osm.features.forEach(f => {
  const p = f.properties || {};
  if (p.highway === 'cycleway' || p['cycleway:left'] || p['cycleway:right'] || p['cycleway:both']) {
    if (f.geometry.type === 'LineString') {
      assignLineToBlocks(f.geometry.coordinates, (bidx, len) => {
        blockData[bidx].cycleway_length_km += len;
        blockData[bidx].bicycle_features_count += len;
      });
    }
  }
});

// Wheelchair features assignment:
// 1. Explicit accessibility tags & ramps (chandigarh_accessibility.geojson)
acc.features.forEach(f => {
  const p = f.properties || {};
  if (p.wheelchair || p.ramp) {
    let pt = null;
    if (f.geometry.type === 'Point') pt = f.geometry.coordinates;
    else if (f.geometry.type === 'Polygon') pt = f.geometry.coordinates[0][0];
    else if (f.geometry.type === 'MultiPolygon') pt = f.geometry.coordinates[0][0][0];
    if (pt) {
      const bidx = findBlockForPoint(pt);
      if (bidx !== -1) {
        blockData[bidx].wheelchair_tags_count++;
        blockData[bidx].wheelchair_features_count++;
      }
    }
  }
});
// 2. Pedestrian footways, sidewalks & ramps (chandigarh_pedestrian.geojson)
ped.features.forEach(f => {
  if (f.geometry.type === 'LineString') {
    assignLineToBlocks(f.geometry.coordinates, (bidx, len) => {
      blockData[bidx].pedestrian_length_km += len;
      blockData[bidx].wheelchair_features_count += len;
    });
  }
});

// -----------------------------------------------------------------------------
// Step 7: Calculate density measure per profile
// -----------------------------------------------------------------------------
// Formulas:
// - Night Density = night_features_count / area_km2 (emergency & 24h services per km²)
// - Bicycle Density = (cycleway_length_km + bicycle_parking_count) / area_km2 (infrastructure score per km²)
// - Wheelchair Density = (pedestrian_length_km + wheelchair_tags_count) / area_km2 (mapped walkway & accessibility features per km²)
blockData.forEach(d => {
  d.cycleway_length_km = +(d.cycleway_length_km.toFixed(3));
  d.pedestrian_length_km = +(d.pedestrian_length_km.toFixed(3));

  const nightDensity = d.night_features_count / d.area_km2;
  const bicycleDensity = (d.cycleway_length_km + d.bicycle_parking_count) / d.area_km2;
  const wheelchairDensity = (d.pedestrian_length_km + d.wheelchair_tags_count) / d.area_km2;

  d.night_density = +(nightDensity.toFixed(2));
  d.bicycle_density = +(bicycleDensity.toFixed(2));
  d.wheelchair_density = +(wheelchairDensity.toFixed(2));

  // Tiers (0 = None mapped, 1 = Low, 2 = Moderate, 3 = High, 4 = Very High)
  // Calibrated against empirical percentile distributions:
  d.night_tier = nightDensity === 0 ? 0 : nightDensity < 20 ? 1 : nightDensity < 50 ? 2 : nightDensity < 100 ? 3 : 4;
  d.bicycle_tier = bicycleDensity === 0 ? 0 : bicycleDensity < 10 ? 1 : bicycleDensity < 30 ? 2 : bicycleDensity < 80 ? 3 : 4;
  d.wheelchair_tier = wheelchairDensity === 0 ? 0 : wheelchairDensity < 5 ? 1 : wheelchairDensity < 25 ? 2 : wheelchairDensity < 50 ? 3 : 4;
});

// -----------------------------------------------------------------------------
// Step 8: Build GeoJSON FeatureCollection
// -----------------------------------------------------------------------------
const outGeoJSON = {
  type: 'FeatureCollection',
  metadata: {
    title: 'MapMyCity — Chandigarh Road-Bounded Urban Blocks',
    description: 'Empirically derived urban blocks filtered and spatially indexed with profile feature densities.',
    generated_at: new Date().toISOString(),
    total_blocks: cityBlocks.length,
    min_area_km2: MIN_BLOCK_AREA_KM2,
    max_area_km2: MAX_BLOCK_AREA_KM2,
    crs: 'EPSG:4326',
  },
  features: cityBlocks.map((b, i) => {
    // GeoJSON polygon ring must be closed (first coord === last coord)
    const ringCoords = b.coords.concat([b.coords[0]]);
    return {
      type: 'Feature',
      id: i + 1,
      properties: blockData[i],
      geometry: {
        type: 'Polygon',
        coordinates: [ringCoords],
      },
    };
  }),
};

const OUT_PATH = resolve(DATA_DIR, 'chandigarh_blocks.geojson');
writeFileSync(OUT_PATH, JSON.stringify(outGeoJSON));
console.log(`[Step 8] Successfully wrote ${cityBlocks.length} blocks to ${OUT_PATH}.`);

// Summary report
console.log('\n============================================================');
console.log('SUMMARY OF PHASE 2 BLOCK GENERATION & PROFILE GRADIENTS');
console.log('============================================================');
console.log(`- Interior faces before filtering: ${inner.length}`);
console.log(`- Enclosing / nested faces removed: ${containsOthers.size}`);
console.log(`- Valid urban blocks within Chandigarh sectors: ${cityBlocks.length}`);
console.log(`- Blocks with Night features: ${blockData.filter(d => d.night_features_count > 0).length}`);
console.log(`- Blocks with Bicycle features: ${blockData.filter(d => d.bicycle_density > 0).length}`);
console.log(`- Blocks with Wheelchair features: ${blockData.filter(d => d.wheelchair_density > 0).length}`);
console.log('============================================================\n');
