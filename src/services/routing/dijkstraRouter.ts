import type { UserProfile, RouteResult } from '../../types/map.ts';
import {
  haversineMeters,
  type RoutingNetwork,
  type NetworkEdge,
  type SnappedPoint,
} from './networkGraph.ts';

/**
 * Explicit, documented travel speed assumptions for estimated travel time calculation:
 * - Wheelchair: 3.6 km/h (1.0 m/s) — standard urban manual wheelchair / accessible walk pace.
 * - Bicycle: 15.0 km/h (4.17 m/s) — standard urban cycling cruising speed.
 * - Night walk: 4.5 km/h (1.25 m/s) — standard pedestrian transit speed.
 */
export const PROFILE_SPEEDS_KMH: Record<UserProfile, number> = {
  wheelchair: 3.6,
  bicycle: 15.0,
  night: 4.5,
};

interface HeapItem {
  nodeKey: string;
  cost: number;
}

class MinHeap {
  private heap: HeapItem[] = [];

  push(item: HeapItem): void {
    this.heap.push(item);
    let i = this.heap.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.heap[i].cost < this.heap[p].cost) {
        const tmp = this.heap[i];
        this.heap[i] = this.heap[p];
        this.heap[p] = tmp;
        i = p;
      } else {
        break;
      }
    }
  }

  pop(): HeapItem | null {
    if (this.heap.length === 0) return null;
    const top = this.heap[0];
    const b = this.heap.pop();
    if (this.heap.length > 0 && b !== undefined) {
      this.heap[0] = b;
      let i = 0;
      const len = this.heap.length;
      while ((i << 1) + 1 < len) {
        const left = (i << 1) + 1;
        const right = left + 1;
        let best = left;
        if (right < len && this.heap[right].cost < this.heap[left].cost) {
          best = right;
        }
        if (this.heap[best].cost < this.heap[i].cost) {
          const tmp = this.heap[i];
          this.heap[i] = this.heap[best];
          this.heap[best] = tmp;
          i = best;
        } else {
          break;
        }
      }
    }
    return top;
  }

  get size(): number {
    return this.heap.length;
  }
}

/**
 * Calculates profile-specific edge cost using actual mapped OSM attributes.
 * Distance is the baseline edge cost in meters.
 */
export function calculateEdgeCost(
  edge: NetworkEdge,
  profile: UserProfile
): number {
  const p = edge.props;
  const hw = (p.highway as string) || '';
  let multiplier = 1.0;

  if (profile === 'wheelchair') {
    // 1. Avoid known stairs and barriers
    if (hw === 'steps') {
      // Impassable for wheelchairs unless accompanied by an explicit ramp
      if (p.ramp !== 'yes') {
        multiplier = 500.0; // severe stairs barrier penalty
      }
    } else if (hw === 'footway' || hw === 'pedestrian' || hw === 'path') {
      // 2. Prefer mapped pedestrian paths
      multiplier = 0.6; // 40% preference bonus
    } else if (hw === 'living_street') {
      multiplier = 0.85;
    } else if (
      hw === 'primary' ||
      hw === 'trunk' ||
      hw === 'primary_link' ||
      hw === 'trunk_link'
    ) {
      // High-speed vehicular arterials without sidewalks
      multiplier = 2.5;
    } else if (
      hw === 'secondary' ||
      hw === 'tertiary' ||
      hw === 'secondary_link' ||
      hw === 'tertiary_link'
    ) {
      multiplier = 1.3;
    }

    // Explicit wheelchair tags where available
    if (p.wheelchair === 'yes') multiplier *= 0.5;
    if (p.wheelchair === 'no') multiplier *= 50.0;
    // Note: unknown accessibility stays neutral (multiplier 1.0)
  } else if (profile === 'bicycle') {
    // 1. Check one-way directionality for bicycles (including roundabouts)
    if (
      (p.oneway === 'yes' || p.junction === 'roundabout') &&
      !edge.isForward &&
      p['oneway:bicycle'] !== 'no'
    ) {
      return Infinity; // forbidden to ride backwards against oneway street or roundabout
    }

    if (hw === 'steps') {
      multiplier = 50.0;
    } else if (p.bicycle === 'no') {
      multiplier = 50.0;
    } else if (hw === 'cycleway') {
      // Dedicated cycle tracks
      multiplier = 0.4; // 60% preference bonus
    } else if (
      p.cycleway ||
      p['cycleway:left'] ||
      p['cycleway:right'] ||
      p['cycleway:both']
    ) {
      // Side-of-road segregated cycle tracks
      multiplier = 0.5; // 50% preference bonus
    } else if (hw === 'residential' || hw === 'living_street') {
      multiplier = 0.95;
    } else if (
      hw === 'primary' ||
      hw === 'trunk' ||
      hw === 'primary_link' ||
      hw === 'trunk_link'
    ) {
      // Untagged major roads are not bicycle friendly
      multiplier = 2.2;
    } else if (hw === 'secondary' || hw === 'tertiary') {
      multiplier = 1.3;
    }

    if (p.bicycle === 'yes' || p.bicycle === 'designated') {
      multiplier *= 0.8;
    }
  } else if (profile === 'night') {
    // Street lighting preference
    if (p.lit === 'yes') {
      multiplier *= 0.8; // 20% preference bonus for verified lit streets
    }

    // Modest preference near verified 24/7 services (hospitals, police, 24/7 stores)
    if (edge.nearNightService) {
      multiplier *= 0.85; // 15% modest preference
    }

    if (hw === 'primary' || hw === 'trunk') {
      multiplier *= 1.3;
    }
    // Neutral baseline for all other connected streets/walkways
  }

  return edge.distMeters * multiplier;
}

interface StepBacktrack {
  fromNode: string;
  edge: NetworkEdge;
  edgeCoordinates: [number, number][];
}

/**
 * Calculates a route between startSnap and destSnap using Dijkstra's algorithm.
 */
export function calculateRoute(
  network: RoutingNetwork,
  startSnap: SnappedPoint,
  destSnap: SnappedPoint,
  profile: UserProfile
): RouteResult {
  const START_KEY = '__START__';
  const DEST_KEY = '__DEST__';

  const speedKmh = PROFILE_SPEEDS_KMH[profile];
  const pStart = startSnap.coordinates;
  const pDest = destSnap.coordinates;
  const directDist = haversineMeters(
    pStart[0],
    pStart[1],
    pDest[0],
    pDest[1]
  );

  // Case 0A: Identical start and destination coordinates (< 1 cm apart)
  if (directDist < 0.01) {
    return {
      success: true,
      coordinates: [pStart, pDest],
      distanceMeters: 0,
      durationMinutes: 0,
      speedKmh,
      profile,
      segmentBreakdown: {},
      startSnapped: pStart,
      destSnapped: pDest,
    };
  }

  // Case 0B: Start and Destination snap to the EXACT same edge segment
  if (startSnap.edge.id === destSnap.edge.id) {
    // Verify one-way for bicycle
    let isValidDirect = true;
    if (profile === 'bicycle') {
      const p = startSnap.edge.props;
      if (
        (p.oneway === 'yes' || p.junction === 'roundabout') &&
        p['oneway:bicycle'] !== 'no'
      ) {
        // If one-way, must travel in forward direction (startSnap.t <= destSnap.t)
        if (startSnap.t > destSnap.t) {
          isValidDirect = false;
        }
      }
    }

    if (isValidDirect) {
      const hw = (startSnap.edge.props.highway as string) || 'residential';
      return {
        success: true,
        coordinates: [pStart, pDest],
        distanceMeters: directDist,
        durationMinutes: (directDist / 1000 / speedKmh) * 60,
        speedKmh,
        profile,
        segmentBreakdown: { [hw]: directDist },
        startSnapped: pStart,
        destSnapped: pDest,
      };
    }
  }

  // Virtual graph expansion around snapped endpoints
  const adj = new Map<string, NetworkEdge[]>();

  // Helper to fetch neighbors
  const getNeighbors = (nodeKey: string): NetworkEdge[] => {
    if (adj.has(nodeKey)) return adj.get(nodeKey)!;
    return network.adjacency.get(nodeKey) || [];
  };

  // Connect __START__ to its edge's endpoints
  const sEdge = startSnap.edge;
  const sCoord = startSnap.coordinates;
  const dStartToFrom = haversineMeters(
    sCoord[0],
    sCoord[1],
    sEdge.p1[0],
    sEdge.p1[1]
  );
  const dStartToTo = haversineMeters(
    sCoord[0],
    sCoord[1],
    sEdge.p2[0],
    sEdge.p2[1]
  );

  const startEdges: NetworkEdge[] = [
    {
      id: -1,
      fromKey: START_KEY,
      toKey: sEdge.fromKey,
      p1: sCoord,
      p2: sEdge.p1,
      distMeters: dStartToFrom,
      props: sEdge.props,
      isForward: !sEdge.isForward,
      nearNightService: sEdge.nearNightService,
    },
    {
      id: -2,
      fromKey: START_KEY,
      toKey: sEdge.toKey,
      p1: sCoord,
      p2: sEdge.p2,
      distMeters: dStartToTo,
      props: sEdge.props,
      isForward: sEdge.isForward,
      nearNightService: sEdge.nearNightService,
    },
  ];
  adj.set(START_KEY, startEdges);

  // Connect dest edge's endpoints to __DEST__
  const dEdge = destSnap.edge;
  const dCoord = destSnap.coordinates;
  const dFromToDest = haversineMeters(
    dEdge.p1[0],
    dEdge.p1[1],
    dCoord[0],
    dCoord[1]
  );
  const dToToDest = haversineMeters(
    dEdge.p2[0],
    dEdge.p2[1],
    dCoord[0],
    dCoord[1]
  );

  const edgeFromToDest: NetworkEdge = {
    id: -3,
    fromKey: dEdge.fromKey,
    toKey: DEST_KEY,
    p1: dEdge.p1,
    p2: dCoord,
    distMeters: dFromToDest,
    props: dEdge.props,
    isForward: dEdge.isForward,
    nearNightService: dEdge.nearNightService,
  };

  const edgeToToDest: NetworkEdge = {
    id: -4,
    fromKey: dEdge.toKey,
    toKey: DEST_KEY,
    p1: dEdge.p2,
    p2: dCoord,
    distMeters: dToToDest,
    props: dEdge.props,
    isForward: !dEdge.isForward,
    nearNightService: dEdge.nearNightService,
  };

  const dFromNeighbors = [
    ...(network.adjacency.get(dEdge.fromKey) || []),
    edgeFromToDest,
  ];
  const dToNeighbors = [
    ...(network.adjacency.get(dEdge.toKey) || []),
    edgeToToDest,
  ];
  adj.set(dEdge.fromKey, dFromNeighbors);
  adj.set(dEdge.toKey, dToNeighbors);

  // Run Dijkstra
  const dist = new Map<string, number>();
  const prev = new Map<string, StepBacktrack>();
  const pq = new MinHeap();

  dist.set(START_KEY, 0);
  pq.push({ nodeKey: START_KEY, cost: 0 });

  let found = false;

  while (pq.size > 0) {
    const current = pq.pop();
    if (!current) break;
    const { nodeKey, cost } = current;

    if (nodeKey === DEST_KEY) {
      found = true;
      break;
    }

    if (cost > (dist.get(nodeKey) ?? Infinity)) continue;

    const neighbors = getNeighbors(nodeKey);
    for (const edge of neighbors) {
      const edgeCost = calculateEdgeCost(edge, profile);
      if (edgeCost === Infinity || isNaN(edgeCost)) continue;

      const nextCost = cost + edgeCost;
      if (!dist.has(edge.toKey) || nextCost < dist.get(edge.toKey)!) {
        dist.set(edge.toKey, nextCost);
        prev.set(edge.toKey, {
          fromNode: nodeKey,
          edge,
          edgeCoordinates: [edge.p1, edge.p2],
        });
        pq.push({ nodeKey: edge.toKey, cost: nextCost });
      }
    }
  }

  if (!found || !dist.has(DEST_KEY)) {
    return {
      success: false,
      coordinates: [],
      distanceMeters: 0,
      durationMinutes: 0,
      speedKmh,
      profile,
      segmentBreakdown: {},
      startSnapped: sCoord,
      destSnapped: dCoord,
      errorReason:
        'No connected path found between endpoints for the selected profile. The endpoints belong to disconnected network components or are blocked by profile constraints (such as stairs or one-way restrictions).',
    };
  }

  // Reconstruct route geometry and segment statistics
  const pathCoords: [number, number][] = [];
  let curr = DEST_KEY;
  let totalDistanceMeters = 0;
  const breakdown: Record<string, number> = {};

  while (curr !== START_KEY) {
    const step = prev.get(curr);
    if (!step) break;

    totalDistanceMeters += step.edge.distMeters;

    const hw = (step.edge.props.highway as string) || 'other';
    breakdown[hw] = (breakdown[hw] || 0) + step.edge.distMeters;

    // Track cycle tracks explicitly if present
    if (
      step.edge.props['cycleway:left'] ||
      step.edge.props['cycleway:right'] ||
      step.edge.props['cycleway:both'] ||
      step.edge.props.cycleway
    ) {
      breakdown['corridor_cycle_tracks'] =
        (breakdown['corridor_cycle_tracks'] || 0) + step.edge.distMeters;
    }

    if (step.edge.nearNightService) {
      breakdown['near_24h_services'] =
        (breakdown['near_24h_services'] || 0) + step.edge.distMeters;
    }

    // Collect coordinates in reverse
    if (pathCoords.length === 0) {
      pathCoords.push(step.edge.p2);
    }
    pathCoords.push(step.edge.p1);

    curr = step.fromNode;
  }

  // Reverse to get start -> dest order
  pathCoords.reverse();

  // Deduplicate consecutive identical coordinates
  const cleanCoords: [number, number][] = [pathCoords[0]];
  for (let i = 1; i < pathCoords.length; i++) {
    const prevPt = cleanCoords[cleanCoords.length - 1];
    const currPt = pathCoords[i];
    if (
      Math.abs(currPt[0] - prevPt[0]) > 1e-8 ||
      Math.abs(currPt[1] - prevPt[1]) > 1e-8
    ) {
      cleanCoords.push(currPt);
    }
  }

  const durationMinutes = (totalDistanceMeters / 1000 / speedKmh) * 60;

  return {
    success: true,
    coordinates: cleanCoords,
    distanceMeters: totalDistanceMeters,
    durationMinutes,
    speedKmh,
    profile,
    segmentBreakdown: breakdown,
    startSnapped: sCoord,
    destSnapped: dCoord,
  };
}
