# MapMyCity — Phase 0 Data Audit

Date of audit: 2026-10-24
Source of truth: files actually read from `public/data/`. Every count below was computed by parsing the GeoJSON, not assumed.

## 0. Context-file note

The brief referred to `MAPMYCITY_PROJECT_CONTEXT.md`. No file with that name exists at the
repository root or anywhere in the tree. A file named `references/MAPMYCITY_PROJECT_CONTEXT.md`
(383 lines) exists and was read in full; it is assumed to be the intended context document.
All findings below follow that document's rules (inspect, do not assume; no fabricated data).

## 1. Project and app state

| Item | Finding |
| --- | --- |
| Git | On `main`, tracking `origin/main`. Tree was **clean** at audit start (`nothing to commit`). Commits: `2d87aae` → `698b218` → `9725783` (merge). |
| Stack | Vite 8.3.5 + React 19.3.1 + TypeScript (~6.0.3) + `@vitejs/plugin-react` 6.1.2. |
| `maplibre-gl` | Installed. `node_modules/maplibre-gl` = **6.15.0**. It is declared in `package.json` dependencies. |
| Entry points | `index.html` → `src/main.tsx` → `src/App.tsx`. |
| Existing UI | `src/App.tsx` is the **stock Vite + React template** (counter, template links). No MapLibre map exists yet, no custom app code. |
| Vite config | `vite.config.ts` = template default (react plugin only). No aliases, no proxy, no base path. |
| Dev server | **Starts successfully.** `npm run dev -- --port 5199` → Vite ready in 287 ms, `GET /` returns HTTP 200 with the expected `index.html`. Verified live during audit. |
| Skills | `.agents/skills/` contains exactly the four intended skills (`frontend-design`, `maplibre-cartography`, `maplibre-source-wiring`, `maplibre-tile-sources`). `skills-lock.json` lists the same four with hashes. Intact; nothing reinstalled. |
| Screenshot | `references/screenshots/blockprint.png` present (2.1 MB). Treated as visual inspiration only, per brief. |

No source files were modified during this audit. All analysis scripts were written to `/tmp/opencode/`, not into the project.

## 2. Dataset inventory

All 9 files listed in the brief's inventory are present in `public/data/`. A 10th file,
`chandigarh_shops.geojson` (marked optional), is **absent** — it was not downloaded, per the
"do not substitute without asking" constraint. Seven of the nine are fresh **overpass-turbo**
exports dated **2026-10-24** (today), licensed **ODbL** (OpenStreetMap). The sector file carries a
different provenance (see below).

| File | Bytes | Features | Geometry | Export timestamp |
| --- | ---: | ---: | --- | --- |
| `chandigarh_osm.geojson` | 18,736,652 | 26,270 | Polygon 14,412 · LineString 11,858 | 2026-10-24T00:14Z |
| `chandigarh_accessibility.geojson` | 4,234,067 | 6,253 | LineString 6,214 · Polygon 39 | 2026-10-24T00:20Z |
| `chandigarh_pedestrian.geojson` | 688,014 | 779 | LineString 775 · Polygon 4 | 2026-10-24T02:12Z |
| `chandigarh_sector.geojson` | 49,741 | 63 | Polygon 63 | n/a (not OSM; see below) |
| `chandigarh_hospitals.geojson` | 39,291 | 67 | Point 67 | 2026-10-24T01:55Z |
| `chandigarh_cycleways.geojson` | 9,375 | 12 | LineString 12 | 2026-10-24T02:16Z |
| `chandigarh_24shops.geojson` | 1,346 | 3 | Point 3 | 2026-10-24T01:57Z |
| `chandigarh_police.geojson` | 3,319 | 8 | Point 8 | 2026-10-24T03:24Z |
| `chandigarh_bicyclepark.geojson` | 1,557 | 4 | Point 4 | 2026-10-24T01:59Z |
| `chandigarh_blocks.geojson` (derived Phase 2) | 3,761,832 | 4,433 | Polygon 4,433 | 2026-10-24T06:00Z |
| `chandigarh_wheelchair_points.geojson` (derived Phase 3) | 3,692 | 8 | Point 8 | 2026-10-24T07:30Z |

**Coordinate assumptions.** Every file is GeoJSON, so coordinates are WGS84 (EPSG:4326),
**[longitude, latitude]** order (GeoJSON `x,y`, not lat-lon). All lon/lat values fall in the
plausible Chandigarh range (lon 76.686–76.852, lat 30.657–30.797). **No out-of-range, malformed,
null, or degenerate geometries were found** in any file (0 null geometries, 0 out-of-range
coordinates, 0 LineStrings with <2 positions, 0 polygon rings with <4 positions). The sector file
additionally declares `urn:ogc:def:crs:OGC:1.3:CRS84` (equivalent to WGS84 lon-lat).

## 3. Coverage and bbox (computed from all coordinates)

| File | minLon | minLat | maxLon | maxLat |
| --- | ---: | ---: | ---: | ---: |
| osm | 76.686654 | 30.657245 | 76.851665 | 30.796631 |
| accessibility | 76.705394 | 30.667276 | 76.851665 | 30.793171 |
| pedestrian | 76.711436 | 30.684826 | 76.847778 | 30.777599 |
| sector | 76.714643 | 30.681364 | 76.849028 | 30.776973 |
| hospitals | 76.717353 | 30.677590 | 76.842968 | 30.765226 |
| cycleways | 76.778816 | 30.716759 | 76.813728 | 30.753467 |
| police | 76.716206 | 30.700846 | 76.819416 | 30.756808 |
| 24shops | 76.758515 | 30.720604 | 76.799960 | 30.736656 |
| bicyclepark | 76.745012 | 30.716141 | 76.811461 | 30.752723 |

The core city grid (sector polygons, pedestrian, cycleways, POIs) sits inside
lon 76.71–76.85, lat 30.68–30.78. The osm and accessibility files extend **beyond** the
sector boundaries (down to lat 30.657, out to lon 76.852), i.e. they include a margin of
Panchkula / Mohali / Sukhna foothills outside the mapped sector area. Any block/feature
assignment must clip or filter to the sector extent to avoid stray features.

## 4. Overlap between files (by `@id`)

Files are **not** independent — they overlap heavily by OSM element id. This matters for
de-duplication and for choosing a single routing source.

| A ∩ B | Shared ids |
| --- | ---: |
| pedestrian ⊆ osm | 779 / 779 (100%) |
| cycleways ⊆ osm | 12 / 12 (100%) |
| accessibility ⊆ osm | 6214 / 6253 (99.4%) |
| police ∩ osm | 1 / 8 |
| bicyclepark ∩ osm | 0 / 4 |
| hospitals ∩ osm | 0 / 67 |
| 24shops ∩ osm | 0 / 3 |

Interpretation: `chandigarh_osm.geojson` is a **superset** of the pedestrian, cycleway, and
almost all of the accessibility linework. The standalone POI files (hospitals, police,
bicycle parking, 24-hour shops) are **disjoint** from the osm file — they add points the osm
polygon/line extract does not contain, so they must be loaded separately.

## 5. Per-profile feature availability (the honest picture)

This is the most important table for scoping. "Tag coverage" = features carrying the relevant
tag at all.

### Wheelchair / accessibility
- **No `barrier`, `kerb`, or `tactile_paving` tag appears in ANY file.** Zero coverage.
- `wheelchair` tag: only **11 features total** across all data — accessibility 7 (`limited` 4, `yes` 2, `no` 1), osm 3 (`yes` 1, `no` 1, `limited` 1), hospitals 1 (`yes`).
- Related sparse tags: `incline` (10 in pedestrian, 10 in osm, 6 in accessibility), `handrail` (6 ped / 5 acc), `ramp` (5 ped / 5 acc, all value `no`), `steps` (30), `crossing` (6), `surface` (sparse, mostly asphalt).
- **Implication:** there is **no basis for a wheelchair accessibility score or barrier-avoidance routing.** The data cannot tell us which kerbs have drops, which crossings have tactile paving, or which ramps exist. The honest Wheelchair behavior is: show pedestrian-network features, show the 11 explicitly wheelchair-tagged locations as "known", and label everything else **unknown**. Do not compute or display an accessibility rating.

### Bicycle
- Dedicated cycleways: **12 LineStrings**, all `highway=cycleway`. Attributes present: `surface=asphalt` (3), `oneway=yes` (2), `bridge=yes` (1), `leisure=track`+`sport=cycling` (4). **Only 12 features, concentrated in lat 30.72–30.75.**
- `cycleway*` tags on roads in the osm file: `cycleway:left` (729: track 583, lane 117, shared_lane 27), `cycleway:right` (47), `cycleway:both` (34), `cycleway` (18). These are **side-of-road** cycle facilities, far more numerous than the dedicated-cycleway file.
- `bicycle` tag: osm 112 (yes 64, no 26, permissive 18), pedestrian 43 (no 19, permissive 18).
- Bicycle parking: **4 Points**, all `amenity=bicycle_parking`. No capacity/capacity:disabled/covered except one `covered=yes`.
- **Implication:** a bicycle profile can highlight the 12 dedicated ways + ~830 road-side cycleway tags. Only 11 of 24 dedicated-cycleway endpoints share exact nodes with the road network (see §7), so they are **not** all routable into the road graph.

### Night
- Hospitals: **67 Points**, all `amenity=hospital`. 65 have `name`. `emergency=yes` on only 4. `opening_hours` present on 1.
- Police: **8 Points**, all `amenity=police`. 6 have `name`. No `opening_hours`/`operator` hours on any.
- 24-hour shops: **3 Points**, all with `opening_hours=24/7` (`Nik Baker's` bakery, `24 Seven`, `24Seven` convenience). This is the dedicated 24-hour dataset — 3 features only.
- Any additional 24/7 evidence: the osm file has `opening_hours` on 8 features, of which exactly **1** is `24/7`. `lit=yes` on 126 osm / 124 accessibility / 12 pedestrian features (street-lighting tag, sparse).
- **Implication:** Night mode can show 67 hospitals + 8 police + 3 (or at most 4) 24-hour shops. That is the entire verified "night services" corpus. Do **not** infer that unlisted shops are open, and do not treat proximity to these services as a safety score.

## 6. Block generation (Phase 2 feasibility)

**Data that could be used:** road centerlines from `chandigarh_osm.geojson` (`highway=*` on
LineString). Full distribution (11,863 highway features; the 5 with Polygon geometry are
`pedestrian`/`footway`/`bus_stop` areas and are excluded from centerline work):

residential 6380 · service 2217 · secondary 959 · tertiary 731 · footway 649 · secondary_link 192 ·
trunk 133 · tertiary_link 123 · unclassified 104 · living_street 99 · path 82 · trunk_link 65 ·
track 44 · steps 30 · cycleway 12 · primary 15 · primary_link 4 · construction 5 · pedestrian 18 ·
bus_stop 1.

**Is the linework connected enough to enclose polygons?** Yes, substantially. Noding all 11,858
highway LineStrings at shared vertices + T-junctions yields **53,063 edges / 46,084 nodes in a
single connected component containing 95.7% of edges** (108 components total; only 3,011 dangles,
5.7%). A face-tracing pass over this graph produced **7,098 interior (positive-area) faces**.

**Are those faces real urban blocks?** A rendered check (`/tmp/opencode/blocks_check.png`,
overlaid on the sector grid) shows the faces **do tile the street grid** — the classic Chandigarh
sector-and-block pattern is clearly visible, with blocks subdividing sectors along the road mesh.
This confirms genuine road-bounded polygons, not an artifact. However they are **not yet
app-ready**: face areas span several orders of magnitude, and the interior faces sum to 101.9 km²
against a 62.4 km² sector total (**163%**) because large enclosing faces overlap smaller nested
ones (292 interior faces sit inside a larger interior face — the "hole" pass has not been run).

| Interior face area (km²) | Count |
| --- | ---: |
| < 0.001 (sliver) | 1,391 |
| 0.001–0.01 | 4,147 |
| 0.01–0.05 | 1,197 |
| 0.05–0.2 | 312 |
| 0.2–0.5 | 33 |
| > 0.5 (superblock) | 18 |

**Simplest feasible approach for Phase 2 (not implemented in this phase):**
1. Use osm `highway=*` LineStrings; drop `area=yes` polygons and `construction`/`bus_stop`.
2. Node at shared vertices + T-junctions (already validated above).
3. Face-trace; **discard slivers** (< ~0.005 km²) and **cap superblocks** (> ~0.5 km²) or leave them unlabeled.
4. Run the **hole/nesting pass** so enclosing faces don't double-count interior blocks (fixes the 163% overlap).
5. Clip to the sector extent to drop the out-of-city margin.
6. Validate by eye on the map before rendering, per the brief's "verify geometry" rule.
This is a client-side computation in plain JS (the audit's face-tracer already does steps 1–3 with
no external geometry library). No PMTiles/vector-tile conversion is needed — 11.8k lines is small.

**Should Chandigarh sectors be the fallback?** Yes, and they are ready as a fallback.
`chandigarh_sector.geojson` = **63 Polygons**, all rings closed, no out-of-range coords. Properties:
`Sector_nam` (unique, 63 distinct: numeric sectors 1–56 plus `26E`, `38W`, `25W`, `Manimajra`,
`Rajindra Park`, `Khuda Alisher`), `Ward_name` (21 distinct), `Zone_name` (7 distinct, `null` on
`Manimajra` and `Khuda Alisher`), `Area`. Computed area sum **62.40 km²** matches the declared
`Area` sum 62.62 km² (consistent units, ~km²). One caveat: sector 24's centroid falls inside
sector 23 — either a genuine small overlap or a concavity artifact of the centroid test; verify
visually before trusting sector-24 point-in-polygon assignment. Sectors must be **labeled
"sectors"**, never "blocks", per the brief.

**Sector provenance:** unlike the OSM files, the sector file has **no `generator`/`copyright`
header and no license**. Provenance and reuse terms are **unknown**; treat as restricted until confirmed.

## 7. Routing feasibility (Phase 4 feasibility)

Connectivity was measured by exact shared nodes (±1 cm), the honest test for "do these lines
actually join?". Results:

| Sub-network | Lines | Edges | Components | Largest comp. | Dangles |
| --- | ---: | ---: | ---: | ---: | ---: |
| All highway lines | 11,858 | 53,063 | 108 | **95.7%** of edges | 5.7% |
| Roads only (drive basis) | 11,071 | 47,309 | 37 | **98.6%** | 5.9% |
| Foot-only types (footway/path/steps/pedestrian) | 5,754 | — | 235 | **6.2%** | 9.8% |
| Dedicated cycleway file | 12 | 67 | 8 | 58.2% | 20.9% |

**Interpretation.**
- The **road network is highly connected** — a Dijkstra/A* graph over roads will route almost
  anywhere in the city. This is the viable routing substrate.
- **Pedestrian centerlines do NOT join the road graph.** Only **304 of 1,550** pedestrian-filename
  endpoints (20%) touch a road node, and only 315 of 1,574 osm walk-only endpoints. Sidewalk
  centerlines are drawn parallel to and offset from road centerlines without shared intersection
  nodes, so they form **235 separate fragments**. Foot-only routing on the pedestrian file alone
  is therefore **not connected** and must not be presented as a connected walk network.
- The 12 dedicated cycleways are only **58% in one component**; 11 of 24 endpoints touch the road
  graph, so part of the cycleway set is disconnected.

**Consequence for profiles (honest limitations):**
- **Wheelchair routing** would need to route on the road/sidewalk network, but sidewalks are
  disconnected fragments (above) and there is **no kerb/barrier/tactile data** (§5). A connected
  wheelchair-accessible graph **cannot** be built from this data. Phase 4 should route on the road
  graph and state plainly that accessibility conditions are unknown except for the 11 tagged spots.
- **Bicycle routing** can use the road graph (98.6% connected) with a preference/bonus for the
  ~830 `cycleway*`-tagged segments and the 12 dedicated ways, but must not claim cycle continuity
  where the dedicated ways are fragmented.
- **Night routing** has no time-of-day road attributes beyond `lit` (126 features) and cannot infer
  safety; it can only display service locations.

**Attributes actually present that support routing decisions:** `oneway` (osm 1,868), `access`
(1,279: private 1070, permissive 177), `motor_vehicle` (32), `bicycle` (112), `surface` (6,207),
`maxspeed` (13), `junction=roundabout` (374), `bridge`/`tunnel`/`layer` (for grade separation),
`steps` (30), `incline` (10). **Attributes absent everywhere:** `kerb`, `tactile_paving`,
`barrier`, `wheelchair` (near-zero), any elevation/gradient (`ele` is present on **0** features in
**all 9 files**).

## 8. Gradient / elevation

**No elevation data exists.** The `ele` tag is present on **0 of 26,270** osm features and **0**
features in every other file. There is no DEM/contour/raster dataset in the repo. Therefore **no
gradient or slope computation is possible** from current data. Any "gradient" feature would have to
be labeled unknown or sourced from an external DEM (a decision that requires asking first). This is
a hard gap for any elevation-based routing or visualization.

## 9. Data-quality problems (verified)

1. **Accessibility dataset is a misnomer.** `chandigarh_accessibility.geojson` is 99.4% a copy of
   osm *road/foot linework* by id. It contains almost no actual accessibility semantics (11
   wheelchair tags total, no kerb/barrier/tactile). Do not treat the filename as a promise.
2. **Near-total absence of accessibility semantics** (§5) — the Wheelchair profile's core data is missing.
3. **No elevation** anywhere (§8).
4. **Very thin Night corpus** — 3 verified 24-hour shops; 1 more 24/7 tag in the whole osm file.
5. **Disconnected sidewalks** (§7) — pedestrian linework will not form a routable connected graph as-is.
6. **Heavy file duplication** (§4) — osm/pedestrian/cycleways/accessibility share features; loading
   them all as independent layers would double- and triple-count features unless de-duplicated by `@id`.
7. **Out-of-city margin** in osm/accessibility extends past the sector extent (§3).
8. **Sector provenance/license unknown**; one suspected sector-23/24 overlap (§6).
9. `Zone_name` is `null` on 2 sectors (Manimajra, Khuda Alisher) — minor, but breaks any
   zone-based grouping that assumes non-null.
10. Hospital addresses leak neighboring states (`addr:state` = Puducherry, Haryana, Punjab on a few
    features) — a handful of hospitals sit near/outside the city edge.

No files were modified. No datasets were downloaded or substituted.

## 10. Bottom line for later phases

- **Blocks:** genuinely derivable from osm road centerlines (7,098 real faces, visually confirmed
  tiling the grid); needs sliver/nesting/crop cleanup in Phase 2. Sectors are a valid, ready fallback.
- **Gradients:** impossible with current data (no elevation). Must be declared out of scope or an
  external DEM must be requested.
- **Routing:** roads are 98.6% connected and can support graph routing. Sidewalks and dedicated
  cycleways are fragmented and cannot support a connected profile network on their own. Wheelchair
  accessibility routing is not supported by the data at all — unknown, not unsafe/accessible.

## 11. Phase 1 Implementation & Verification Record (Completed 2026-10-24)

- **Milestone status:** Complete. Commit `ccb5382` ("Phase 1: interactive 3D Chandigarh base map with building extrusions").
- **Map Viewport:** Centered on Chandigarh at longitude `76.78`, latitude `30.735`, initial zoom `13.5`, pitch `52°`, bearing `-17.5°`.
- **Basemap Selection & Watermark Resolution:**
  - Evaluated CARTO Dark Matter raster tiles (`rastertiles/dark_all`). Live browser rendering revealed that CARTO now stamps an intrusive "API KEY REQUIRED carto.com/basemaps/apikey" watermark diagonally across all tiles without a paid token.
  - Replaced with **OpenFreeMap Dark** vector style (`https://tiles.openfreemap.org/styles/dark`). Verified completely watermark-free, requires no API key, and provides sharp vector roads, sector numbers, water boundaries, and place labels.
  - A fallback dark canvas (`#0b0d13`) and error-catching listeners were implemented to guarantee local building geometry renders even during complete network loss.
  - Basemap's default flat 2D `building` fill layer is suppressed (`visibility: none`) to eliminate Z-fighting with our 3D extrusion geometry.
- **3D Building Extrusions:**
  - Loaded `public/data/chandigarh_osm.geojson` (18.7 MB, 26,270 features).
  - Filtered to all 14,407 building polygons (`filter: ['all', ['==', '$type', 'Polygon'], ['has', 'building']]`).
  - Height expression:
    1. Checks explicit `height` (> 0). (Verified 0 features currently).
    2. Checks `building:levels` (> 0) and multiplies by 3.0 m/floor (725 features).
    3. Conservative fallback: **6.0 meters** (~2 storeys, Chandigarh's predominant low-rise sector typology) for the remaining 13,682 buildings. Missing height is strictly not treated as zero.
  - Shading: Linear height-color interpolation (`#222d3d` to `#536d93`) paired with directional viewport lighting (`anchor: 'viewport'`, `intensity: 0.45`, `position: [1.5, 210, 40]`).
- **MapLibre Web Worker Bundling:**
  - Configured worker URL explicitly via `import maplibreglWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'` and `setWorkerUrl(maplibreglWorkerUrl)` to resolve Vite dev/prod worker bundling.
- **Controls & Attribution:**
  - NavigationControl (zoom, compass, pitch visualization) at top-right.
  - Metric ScaleControl at bottom-left.
  - AttributionControl at bottom-right: `Data: OpenStreetMap (ODbL) | Basemap: OpenFreeMap | OpenFreeMap © OpenMapTiles Data from OpenStreetMap`.
  - Floating HUD panel at top-left with live status indicator ("14,407 buildings rendered") and interactive "Reset Camera" view action.
- **Browser Verification:**
  - Executed via Playwright on `http://localhost:5199/`.
  - 0 console errors, 0 network failures. Verified camera animation and zoom controls.
  - TypeScript build (`tsc -b && vite build`) and ESLint (`eslint .`) clean with 0 warnings/errors.

## 12. Phase 2 Implementation & Verification Record (Completed 2026-10-24)

- **Milestone status:** Complete. Commit `161b804` ("Phase 2: block generation, profile feature assignment, and density gradients").
- **Urban Block Generation Pipeline:**
  - Script: `scripts/generate-blocks.mjs` (registered as `npm run generate-blocks` in `package.json`). Fully reproducible and deterministic.
  - Planar graph constructed from 11,858 OpenStreetMap highway lines (46,084 snapped nodes at ~1 cm precision, 53,063 split edges).
  - Traced directed cycles yielding **7,098 interior faces** (Phase 0 initial baseline).
- **Block Filtering & Geometric Validation:**
  - **Nesting / Enclosure Filtering:** Identified and removed 72 large enclosing/outer faces that encircled smaller sub-faces using verified interior test points. This resolved the Phase 0 163% area overlap and yielded 7,026 atomic faces.
  - **Sliver Removal:** Filtered faces with area < 0.001 km² (1,000 m²), eliminating roundabout centers, median strips, and junction slivers.
  - **Superblock Removal:** Filtered peripheral faces with area > 0.5 km² (500,000 m²).
  - **Boundary Clipping:** Clipped to official Chandigarh sector coverage (`chandigarh_sector.geojson`), ensuring all retained blocks have verified interior coordinates within Chandigarh administrative sectors.
  - **Polygons After Filtering:** Exactly **4,433 valid, non-overlapping urban blocks** (total area 48.55 km², covering 77.8% of the sector area; remainder comprises wide road boulevards, medians, and major right-of-ways).
  - **Validation checks:** 0 unclosed rings, 0 coordinate anomalies, 0 duplicate geometries, and **0 residual nesting** among the 4,433 filtered blocks.
- **Feature Assignment to Blocks:**
  - Spatial assignment performed via spatial hash grid (`findBlockForPoint` via ray casting point-in-polygon; line segment midpoint and endpoint length-weighted assignment).
  - **Wheelchair Profile:** 354 blocks with mapped features. Mapped pedestrian footways/sidewalks (755 lines from `chandigarh_pedestrian.geojson`) + explicit wheelchair accessibility tags/ramps (from `chandigarh_accessibility.geojson`).
  - **Bicycle Profile:** 569 blocks with mapped features. Dedicated cycleways (12 lines from `chandigarh_cycleways.geojson` + 807 cycle-track road segments from `chandigarh_osm.geojson`) + 4 verified bicycle parking points (`chandigarh_bicyclepark.geojson`).
  - **Night Profile:** 61 blocks with mapped features. 67 hospitals (`chandigarh_hospitals.geojson`) + 8 police stations (`chandigarh_police.geojson`) + 4 verified 24/7 convenience stores (`chandigarh_24shops.geojson` + OSM 24/7 commercial feature).
- **Density Measures & Empirical Calibration:**
  - Density formulas per unit area (km²):
    - `night_density = night_features_count / area_km2` (services/km²)
    - `bicycle_density = (cycleway_length_km + bicycle_parking_count) / area_km2` (score/km²)
    - `wheelchair_density = (pedestrian_length_km + wheelchair_tags_count) / area_km2` (features/km²)
  - Calibrated 5-tier classification mapped to distinct chromatic gradients inspired by Blockprint:
    - **Wheelchair (Teal/Emerald):** Tier 0 (0), Tier 1 (<5), Tier 2 (5–25), Tier 3 (25–50), Tier 4 (>50 features/km²).
    - **Bicycle (Bronze/Amber/Gold):** Tier 0 (0), Tier 1 (<10), Tier 2 (10–30), Tier 3 (30–80), Tier 4 (>80 score/km²).
    - **Night (Violet/Lilac):** Tier 0 (0), Tier 1 (<20), Tier 2 (20–50), Tier 3 (50–100), Tier 4 (>100 services/km²).
  - Prominent UI disclaimer: Gradient represents mapped feature density in OpenStreetMap, not overall safety, quality, or accessibility.
- **UI & Interaction:**
  - Added Mode Selector: Block (active) vs Path (disabled, marked "Phase 4").
  - Added Profile Selector: Wheelchair, Bicycle, Night controls that instantly update MapLibre layer paint properties (`fill-color`, `fill-opacity`, `line-color`) on `chandigarh-blocks-fill` and `chandigarh-blocks-outline`.
  - Added Dynamic Legend: Profile-specific gradient swatch bar, tier range values, units, feature count summary, and data disclaimer.
  - Preserved 3D building extrusions (`chandigarh-buildings-3d`), camera settings, dark basemap, metric scale, nav controls, attribution, error handling, and Reset Camera button.
- **Browser & Quality Verification:**
  - Lint: `npm run lint` clean (0 errors, 0 warnings).
  - Build: `npm run build` clean (TypeScript + Vite production bundle).
  - Browser tests: Verified via Playwright at `http://127.0.0.1:5199/` with 0 console errors and 0 network failures. Profile transitions (Wheelchair, Bicycle, Night), gradient update, and Reset Camera verified.
- **Known Limitations:**
  - OSM Data Sparsity: Only 4 bicycle parking points and 4 verified 24/7 stores exist in the mapped data for the entire city. The gradient strictly reflects mapped presence in OpenStreetMap, not real-world safety or completeness.
  - Path Mode: Intentionally disabled per Phase 2 scope; network graph routing is slated for Phase 4.

## 12. Phase 3 Implementation & Verification Record (Completed 2026-10-24)

- **Milestone status:** Complete. Commit `b484dab` ("Phase 3: profile-specific feature markers, infrastructure linework, and interactive popups").
- **Derived Datasets & Extraction Tooling:**
  - Script: `scripts/generate-wheelchair-points.mjs` (registered as `npm run generate-wheelchair-points` in `package.json`).
  - Generated: `public/data/chandigarh_wheelchair_points.geojson` containing exactly the 8 verified wheelchair point features in Chandigarh (7 facility centroids from `chandigarh_accessibility.geojson` + 1 hospital point from `chandigarh_hospitals.geojson`).
- **Wheelchair Profile Markers & Infrastructure:**
  - **Pedestrian Walkways Line Layer (`wheelchair-paths-line`):** 745 line features (footways, paths, pedestrian areas) from `chandigarh_pedestrian.geojson`, styled in muted teal (`#00c49f`, width 1.8px, opacity 0.65). Mapped as generic walkways with honest note that accessibility is unrecorded in OSM.
  - **Steps / Stairs Barrier Layer (`wheelchair-steps-line`):** 30 line features with `highway=steps` from `chandigarh_pedestrian.geojson`, styled in warning coral/rose (`#f43f5e`, width 2.8px, dashed `[2, 2]`, opacity 0.95). 5 confirmed with `ramp: no`.
  - **Explicit Wheelchair Accessibility Markers (`wheelchair-markers-circle`):** 8 verified locations with explicit OSM `wheelchair` tags:
    - 3 Accessible (`wheelchair: yes`): Advanced Pediatric Center, St. Peter's School, Santokh Hospital (emerald `#10b981`, radius 7.5px, white stroke).
    - 4 Limited Access (`wheelchair: limited`): Guru Nanak Public School, Rose Garden, JW Marriott Chandigarh, Government Model High School (amber `#f59e0b`, radius 7.5px, white stroke).
    - 1 Inaccessible (`wheelchair: no`): Haryana Govt. Employee Houses - Type 4 (red `#ef4444`, radius 7.5px, white stroke).
- **Bicycle Profile Markers & Infrastructure:**
  - **Dedicated Cycleways Line Layer (`bicycle-dedicated-line`):** 12 line features from `chandigarh_cycleways.geojson` (`highway=cycleway`), styled in bright gold (`#fbbf24`, width 3.2px, opacity 0.95).
  - **Corridor Cycle Tracks & Lanes (`bicycle-corridor-tracks-line`):** 784 line segments filtered from already-loaded `chandigarh-osm` source matching `cycleway:left`, `cycleway:right`, `cycleway:both`, or `cycleway`, styled in amber (`#f59e0b`, width 2.0px, opacity 0.8).
  - **Bicycle Parking Points (`bicycle-parking-circle`):** 4 verified parking locations from `chandigarh_bicyclepark.geojson` (`amenity=bicycle_parking`), styled in amber (`#f59e0b`, radius 8.0px, white stroke 2.2px).
- **Night Profile Markers:**
  - **Hospitals & Medical Centers (`night-hospitals-circle`):** 67 point features from `chandigarh_hospitals.geojson` (`amenity=hospital`), styled in ruby red (`#ef4444`, radius 6.5px, white stroke 1.8px). 4 explicitly tagged `emergency: yes`.
  - **Police Stations (`night-police-circle`):** 8 point features from `chandigarh_police.geojson` (`amenity=police`), styled in police blue (`#3b82f6`, radius 7.0px, white stroke 2.0px).
  - **Verified 24-Hour Stores (`night-24shops-circle`):** 3 verified point features from `chandigarh_24shops.geojson` with explicit `opening_hours: 24/7` (Nik Baker's, 24 Seven, 24Seven), styled in neon lilac (`#c084fc`, radius 8.5px, white stroke 2.5px). No generic shops are marked as 24-hour.
- **Layer Architecture & Occlusion Management:**
  - Ground plane: Block fills and outlines below 3D buildings.
  - Infrastructure lines (pedestrian paths, steps, cycleways): Inserted before `BUILDINGS_LAYER_ID` so buildings extrude cleanly around streets.
  - 3D Buildings: Extruded using documented baseline (`building:levels × 3m`, 6m fallback).
  - Thematic Markers (circles): Positioned above 3D extrusions with `circle-pitch-alignment: 'viewport'`, ensuring markers remain visible, facing the camera, and clickable without building occlusion.
- **Interactivity & Popups:**
  - Built custom dark-themed MapLibre popups (`.mapmycity-popup`) with category badges, feature names, key-value attributes, and source dataset provenance.
  - Hover cursor shifts to `pointer` over interactive markers and infrastructure.
  - Popups dismiss cleanly when switching profiles or clicking away.
- **Dynamic Legend:**
  - Synchronized with active profile to display both the density gradient ramp and the active profile's mapped markers and linework with exact counts, colors, and honest descriptions.
- **Browser & Quality Verification:**
  - Lint: `npm run lint` clean (0 errors, 0 warnings).
  - Build: `npm run build` clean (TypeScript + Vite production bundle).
  - Browser testing: Verified via Playwright at `http://127.0.0.1:5199/`:
    - Wheelchair profile: 745 walkways, 30 steps (5 confirmed ramp: no), 8 explicit wheelchair status points (3 yes, 4 limited, 1 no). Popups verified.
    - Bicycle profile: 12 dedicated cycleways, 784 corridor cycle tracks, 4 bicycle parking points. Popups verified.
    - Night profile: 67 hospitals, 8 police stations, 3 verified 24/7 stores. Popups verified.
    - Layer visibility switching: Instantaneous toggle between profiles; hidden layers are set to `none`.
    - 0 console errors, 0 failed network requests.
    - Saved screenshots in `references/screenshots/`: `phase3_wheelchair.png`, `phase3_bicycle.png`, `phase3_night.png`, `phase3_popup.png`.




## 13. Phase 4 Implementation & Verification Record (Completed 2026-10-24)

- **Milestone status:** Complete.
- **Path Mode Activation:**
  - Enabled the Path mode tab control in `ControlBar.tsx`.
  - Switching between Block and Path modes preserves the active profile and map state without resetting or breaking.
  - In Path mode: Block fills are subdued (`fill-opacity: 0.15` / `0.05`), allowing the street network and calculated routes to dominate while maintaining 3D buildings and block outlines for spatial orientation.
  - In Block mode: All Phase 1–3 behaviors, 4,433 urban blocks, 5-tier density gradients, markers, 3D buildings, popups, and legends remain fully functional.
- **Network Graph Construction & Snapping:**
  - Constructed network graph directly from the 11,858 OpenStreetMap highway lines in `chandigarh_osm.geojson` (which verified 100% inclusion of `chandigarh_pedestrian.geojson` and `chandigarh_cycleways.geojson`).
  - Graph metrics: 45,975 connected vertices and 105,876 directed edges in memory built in ~150 ms without blocking the UI.
  - Snap tolerance: 1e-7 degrees (~1.1 cm) exact OSM vertex coincidence.
  - Max click snap tolerance: 250 meters. Spatial hash grid (0.005° cells) allows sub-millisecond edge projection.
  - Prohibited edges: `highway=construction`, `access=no`, and `access=military` strictly excluded.
- **Routing Engine & Profile Cost Optimization:**
  - Algorithm: In-browser Dijkstra with binary MinHeap priority queue (execution time ~20–45 ms).
  - Virtual endpoint injection: Snaps Start (A) and Destination (B) to edge projections, injecting temporary nodes and routing seamlessly along exact street centerlines.
  - Documented Speed Assumptions:
    - Wheelchair: 3.6 km/h (~1.0 m/s manual wheelchair / accessible walk pace).
    - Bicycle: 15.0 km/h (~4.17 m/s urban cycling cruising pace).
    - Night walk: 4.5 km/h (~1.25 m/s pedestrian transit pace).
  - Cost Formulas:
    - Base cost: Edge length in meters via Haversine formula.
    - Wheelchair:
      - `highway=steps`: 500x penalty (impassable stairs barrier).
      - `highway in [footway, pedestrian, path]`: 0.6x multiplier (40% preference bonus).
      - `highway=living_street`: 0.85x multiplier.
      - Arterial highways without sidewalks (`primary`, `trunk`): 2.5x avoidance penalty.
      - `wheelchair=yes`: 0.5x bonus; `wheelchair=no`: 50x penalty.
      - Unknown accessibility is treated as unrated (neutral 1.0x).
      - Bidirectional routing across all ways (ignores vehicular oneway).
    - Bicycle:
      - One-way enforcement: Riding backwards on `oneway=yes` is forbidden (`cost = Infinity`) unless `oneway:bicycle=no`.
      - Dedicated cycleways (`highway=cycleway`): 0.4x multiplier (60% preference bonus).
      - Segregated roadside cycle tracks (`cycleway:left/right/both`): 0.5x multiplier (50% bonus).
      - `bicycle=no`: 50x penalty; `highway=steps`: 50x penalty.
      - Untagged arterial highways without cycle tracks (`primary`, `trunk`): 2.2x avoidance penalty.
      - Living street / residential: 0.95x multiplier.
    - Night:
      - Walkable/road network substrate.
      - Verified street lighting (`lit=yes`): 0.8x multiplier (20% bonus).
      - Near verified 24/7 service (within 150m of hospital, police, or 24/7 store): 0.85x multiplier (15% modest bonus).
      - Arterial highways: 1.3x avoidance penalty.
      - UI explicitly clarifies: Proximity to 24/7 services and lighting does not prove safety.
- **UI & Routing Controls:**
  - Floating `RoutingPanel` on top-left:
    - Interactive endpoint selectors for Start (A) and Destination (B).
    - Quick landmark presets (Sector 17 Plaza, Rose Garden, GMSH Hospital, PGIMER, Sukhna Lake, Sector 35, etc.).
    - Map click selection with snapping distance display.
    - Swap endpoints (reverse route) and New Route reset buttons.
    - Route metrics: Distance calculated strictly from network LineString geometry; travel time based on explicit speed assumption.
    - Highway segment breakdown percentages.
    - Graceful error messaging for disconnected networks or clicks > 250m from roads (no straight-line fake routes).
  - Feature Popups: Added "Set as Start (A)" and "Set as Dest (B)" buttons to all feature popups in Path mode.
  - Map Markers: Custom glowing circular pins for Start (emerald "A") and Destination (rose "B").
  - Route Line: Glowing dark casing (8.5px) + profile-colored route line (4.5px).
- **Verification & Testing:**
  - Production build: `tsc -b && vite build` clean.
  - Linting: `eslint .` clean (0 errors, 0 warnings).
  - Browser verification with Playwright on live dev server:
    - Block & Path mode toggling verified.
    - Preset and click-based routing verified.
    - Differentiated routing geometry verified across Wheelchair, Bicycle, and Night profiles.
    - Reset, reverse, and out-of-tolerance handling verified.
    - 0 console errors, 0 failed network requests.
    - Saved screenshots in `references/screenshots/`: `phase4_block_bicycle.png`, `phase4_path_bicycle.png`, `phase4_path_wheelchair.png`, `phase4_path_night.png`, `phase4_map_click_route.png`.
