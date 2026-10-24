export interface MapError {
  type: 'webgl' | 'style' | 'data';
  title: string;
  message: string;
  details?: string;
}

export type MapLoadingStatus = 'idle' | 'loading' | 'ready' | 'error';

export type AppMode = 'block' | 'path';

export type UserProfile = 'wheelchair' | 'bicycle' | 'night';

export interface GradientStep {
  tier: number;
  label: string;
  range: string;
  color: string;
}

export interface MarkerLegendItem {
  id: string;
  label: string;
  count?: number;
  color: string;
  type: 'point' | 'line' | 'dashed-line';
  note?: string;
}

export interface ProfileMeta {
  id: UserProfile;
  label: string;
  shortLabel: string;
  tagline: string;
  accentColor: string;
  outlineColor: string;
  densityUnit: string;
  mappedBlocksCount: number;
  gradient: GradientStep[];
  markerLegend: MarkerLegendItem[];
  dataDescription: string;
}

export interface RouteEndpoint {
  coordinates: [number, number];
  name?: string;
  snappedPoint?: [number, number];
  snapDistanceMeters?: number;
}

export interface RouteResult {
  success: boolean;
  coordinates: [number, number][];
  distanceMeters: number;
  durationMinutes: number;
  speedKmh: number;
  profile: UserProfile;
  segmentBreakdown: Record<string, number>;
  startSnapped: [number, number];
  destSnapped: [number, number];
  errorReason?: string;
}

export interface RoutingPreset {
  id: string;
  name: string;
  sector: string;
  coordinates: [number, number];
  profileAffinity?: UserProfile;
  description: string;
}
