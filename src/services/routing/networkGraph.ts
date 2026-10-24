/**
 * Network Graph construction and spatial snapping for Chandigarh road/pedestrian linework.
 */

export interface NetworkNode {
  key: string;
  coords: [number, number];
}

export interface NetworkEdge {
  id: number;
  fromKey: string;
  toKey: string;
  p1: [number, number];
  p2: [number, number];
  distMeters: number;
  props: Record<string, unknown>;
  isForward: boolean;
  nearNightService: boolean;
}

export interface SnappedPoint {
  coordinates: [number, number];
  distanceMeters: number;
  edge: NetworkEdge;
  t: number; // parameter along p1 -> p2 [0, 1]
}

/**
 * Geometric tolerance constants:
 * - NODE_SNAP_DEG: ~1.1 cm (1e-7 deg) matching OSM shared vertices.
 * - MAX_SNAP_DISTANCE_METERS: 250 meters maximum allowed snap from user click to mapped road.
 * - SPATIAL_GRID_CELL_DEG: 0.005 deg (~500m) for sub-millisecond edge lookups.
 * - NIGHT_SERVICE_PROXIMITY_METERS: 150 meters for modest night service proximity bonus.
 */
export const NODE_SNAP_DEG = 1e-7;
export const MAX_SNAP_DISTANCE_METERS = 250;
export const SPATIAL_GRID_CELL_DEG = 0.005;
export const NIGHT_SERVICE_PROXIMITY_METERS = 150;

export function haversineMeters(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function coordKey(lon: number, lat: number): string {
  return `${Math.round(lon / NODE_SNAP_DEG)}_${Math.round(lat / NODE_SNAP_DEG)}`;
}

export class RoutingNetwork {
  nodes: Map<string, [number, number]> = new Map();
  adjacency: Map<string, NetworkEdge[]> = new Map();
  allEdges: NetworkEdge[] = [];
  spatialGrid: Map<string, number[]> = new Map();
  isReady: boolean = false;

  constructor() {}

  /**
   * Initializes the network graph from GeoJSON line features and optional night service points.
   */
  build(
    lineFeatures: Array<{
      geometry?: { type: string; coordinates: unknown };
      properties?: Record<string, unknown>;
    }>,
    nightPoints: Array<[number, number]> = []
  ): void {
    this.nodes.clear();
    this.adjacency.clear();
    this.allEdges = [];
    this.spatialGrid.clear();

    // 1. Build night points spatial grid for proximity queries
    const nightGrid = new Map<string, Array<[number, number]>>();
    for (const pt of nightPoints) {
      const ck = `${Math.floor(pt[0] / SPATIAL_GRID_CELL_DEG)}_${Math.floor(
        pt[1] / SPATIAL_GRID_CELL_DEG
      )}`;
      if (!nightGrid.has(ck)) nightGrid.set(ck, []);
      nightGrid.get(ck)!.push(pt);
    }

    const isNearNight = (lon: number, lat: number): boolean => {
      const cx = Math.floor(lon / SPATIAL_GRID_CELL_DEG);
      const cy = Math.floor(lat / SPATIAL_GRID_CELL_DEG);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const pts = nightGrid.get(`${cx + dx}_${cy + dy}`);
          if (pts) {
            for (const p of pts) {
              if (
                haversineMeters(lon, lat, p[0], p[1]) <=
                NIGHT_SERVICE_PROXIMITY_METERS
              ) {
                return true;
              }
            }
          }
        }
      }
      return false;
    };

    // 2. Ingest line features
    let edgeSeq = 0;
    for (const f of lineFeatures) {
      if (!f.geometry || f.geometry.type !== 'LineString') continue;
      const coords = f.geometry.coordinates as [number, number][];
      if (!Array.isArray(coords) || coords.length < 2) continue;

      const props = f.properties || {};
      const hw = props.highway as string | undefined;

      // Exclude strictly unpassable / non-road features
      if (!hw) continue;
      if (hw === 'construction') continue;
      if (props.access === 'no' || props.access === 'military') continue;

      for (let i = 0; i < coords.length - 1; i++) {
        const p1 = coords[i];
        const p2 = coords[i + 1];
        const k1 = coordKey(p1[0], p1[1]);
        const k2 = coordKey(p2[0], p2[1]);
        if (k1 === k2) continue;

        if (!this.nodes.has(k1)) this.nodes.set(k1, p1);
        if (!this.nodes.has(k2)) this.nodes.set(k2, p2);

        const dist = haversineMeters(p1[0], p1[1], p2[0], p2[1]);
        const midLon = (p1[0] + p2[0]) / 2;
        const midLat = (p1[1] + p2[1]) / 2;
        const nearNight = isNearNight(midLon, midLat);

        const forwardEdge: NetworkEdge = {
          id: edgeSeq++,
          fromKey: k1,
          toKey: k2,
          p1,
          p2,
          distMeters: dist,
          props,
          isForward: true,
          nearNightService: nearNight,
        };

        const reverseEdge: NetworkEdge = {
          id: edgeSeq++,
          fromKey: k2,
          toKey: k1,
          p1: p2,
          p2: p1,
          distMeters: dist,
          props,
          isForward: false,
          nearNightService: nearNight,
        };

        // Adjacency
        if (!this.adjacency.has(k1)) this.adjacency.set(k1, []);
        this.adjacency.get(k1)!.push(forwardEdge);

        if (!this.adjacency.has(k2)) this.adjacency.set(k2, []);
        this.adjacency.get(k2)!.push(reverseEdge);

        // Store unique undirected segment for spatial grid snapping
        const segmentIndex = this.allEdges.length;
        this.allEdges.push(forwardEdge);

        // Populate spatial index
        const minx = Math.min(p1[0], p2[0]);
        const maxx = Math.max(p1[0], p2[0]);
        const miny = Math.min(p1[1], p2[1]);
        const maxy = Math.max(p1[1], p2[1]);
        const c0x = Math.floor(minx / SPATIAL_GRID_CELL_DEG);
        const c1x = Math.floor(maxx / SPATIAL_GRID_CELL_DEG);
        const c0y = Math.floor(miny / SPATIAL_GRID_CELL_DEG);
        const c1y = Math.floor(maxy / SPATIAL_GRID_CELL_DEG);

        for (let cx = c0x; cx <= c1x; cx++) {
          for (let cy = c0y; cy <= c1y; cy++) {
            const ck = `${cx}_${cy}`;
            if (!this.spatialGrid.has(ck)) this.spatialGrid.set(ck, []);
            this.spatialGrid.get(ck)!.push(segmentIndex);
          }
        }
      }
    }

    this.isReady = true;
  }

  /**
   * Snaps a query coordinate [lon, lat] to the nearest suitable road network segment.
   * Returns null if no segment exists within maxDistanceMeters.
   */
  snapPoint(
    lon: number,
    lat: number,
    maxDistanceMeters: number = MAX_SNAP_DISTANCE_METERS
  ): SnappedPoint | null {
    if (!this.isReady || this.allEdges.length === 0) return null;

    const cx = Math.floor(lon / SPATIAL_GRID_CELL_DEG);
    const cy = Math.floor(lat / SPATIAL_GRID_CELL_DEG);
    let bestEdge: NetworkEdge | null = null;
    let bestPoint: [number, number] | null = null;
    let bestDist = Infinity;
    let bestT = 0;

    const checked = new Set<number>();

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const list = this.spatialGrid.get(`${cx + dx}_${cy + dy}`);
        if (!list) continue;
        for (const idx of list) {
          if (checked.has(idx)) continue;
          checked.add(idx);

          const edge = this.allEdges[idx];
          const vLon = edge.p2[0] - edge.p1[0];
          const vLat = edge.p2[1] - edge.p1[1];
          const len2 = vLon * vLon + vLat * vLat;
          let t = 0;
          if (len2 > 0) {
            t = Math.max(
              0,
              Math.min(
                1,
                ((lon - edge.p1[0]) * vLon + (lat - edge.p1[1]) * vLat) / len2
              )
            );
          }
          const projLon = edge.p1[0] + t * vLon;
          const projLat = edge.p1[1] + t * vLat;
          const dist = haversineMeters(lon, lat, projLon, projLat);

          if (dist < bestDist) {
            bestDist = dist;
            bestPoint = [projLon, projLat];
            bestEdge = edge;
            bestT = t;
          }
        }
      }
    }

    if (bestDist <= maxDistanceMeters && bestEdge && bestPoint) {
      return {
        coordinates: bestPoint,
        distanceMeters: bestDist,
        edge: bestEdge,
        t: bestT,
      };
    }

    return null;
  }
}
