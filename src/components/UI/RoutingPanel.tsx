import React from 'react';
import type {
  UserProfile,
  RouteEndpoint,
  RouteResult,
  RoutingPreset,
} from '../../types/map.ts';
import { PROFILE_CONFIGS } from '../../config/mapConfig.ts';
import { ROUTING_PRESETS } from '../../services/routing/presets.ts';

interface RoutingPanelProps {
  profile: UserProfile;
  startPoint: RouteEndpoint | null;
  destPoint: RouteEndpoint | null;
  pickingMode: 'start' | 'dest' | null;
  onSetPickingMode: (mode: 'start' | 'dest' | null) => void;
  onClearStart: () => void;
  onClearDest: () => void;
  onClearAll: () => void;
  onReverseEndpoints: () => void;
  onSelectPreset: (preset: RoutingPreset, target: 'start' | 'dest') => void;
  routeResult: RouteResult | null;
  isCalculating: boolean;
  snapNotice?: string | null;
}

export const RoutingPanel: React.FC<RoutingPanelProps> = ({
  profile,
  startPoint,
  destPoint,
  pickingMode,
  onSetPickingMode,
  onClearStart,
  onClearDest,
  onClearAll,
  onReverseEndpoints,
  onSelectPreset,
  routeResult,
  isCalculating,
  snapNotice,
}) => {
  const conf = PROFILE_CONFIGS[profile];

  const formatDistance = (meters: number): string => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const formatDuration = (minutes: number): string => {
    if (minutes <= 0) return '0 min';
    if (minutes < 1) return '< 1 min';
    if (minutes >= 60) {
      const hrs = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
    }
    return `${Math.round(minutes)} min`;
  };

  const speedDescriptions: Record<UserProfile, string> = {
    wheelchair: '3.6 km/h (~1.0 m/s manual wheelchair / accessible walk pace)',
    bicycle: '15.0 km/h (~4.17 m/s urban cycling cruising pace)',
    night: '4.5 km/h (~1.25 m/s nighttime pedestrian walking pace)',
  };

  const profileGuidance: Record<UserProfile, string> = {
    wheelchair:
      'Prefers designated pedestrian footways & ramps. Known stairs are avoided as severe barriers. Unknown accessibility is unrated.',
    bicycle:
      'Prefers dedicated cycleways & corridor cycle tracks. Enforces one-way flow; untagged arterial roads are penalized.',
    night:
      'Follows walkable street network with modest preference for verified lit ways and proximity to 24/7 hospitals, police & stores.',
  };

  return (
    <aside
      className="routing-hud-panel"
      aria-label="Path Mode Route Controls and Summary"
    >
      <div className="routing-panel-header">
        <div className="routing-title-wrap">
          <span
            className="routing-pulse-indicator"
            style={{ backgroundColor: conf.accentColor }}
            aria-hidden="true"
          />
          <h2 className="routing-title">Path Routing</h2>
          <span
            className="routing-profile-badge"
            style={{
              backgroundColor: `${conf.accentColor}25`,
              color: conf.accentColor,
              borderColor: `${conf.accentColor}55`,
            }}
          >
            {conf.label}
          </span>
        </div>
        <p className="routing-guidance-text">{profileGuidance[profile]}</p>
      </div>

      {/* Endpoint Selectors */}
      <div className="endpoint-controls-group">
        {/* Start Point */}
        <div
          className={`endpoint-card ${pickingMode === 'start' ? 'active-picking' : ''}`}
        >
          <div className="endpoint-icon-col">
            <span className="endpoint-pin start" aria-hidden="true">
              A
            </span>
          </div>
          <div className="endpoint-info-col">
            <span className="endpoint-label">Start Point</span>
            <span className="endpoint-value">
              {startPoint
                ? startPoint.name ||
                  `${startPoint.coordinates[0].toFixed(4)}, ${startPoint.coordinates[1].toFixed(4)}`
                : 'Not selected'}
            </span>
            {startPoint?.snapDistanceMeters !== undefined && (
              <span className="endpoint-snap-meta">
                Snapped to road ({Math.round(startPoint.snapDistanceMeters)}m)
              </span>
            )}
          </div>
          <div className="endpoint-actions-col">
            <button
              type="button"
              className={`endpoint-pick-btn ${pickingMode === 'start' ? 'active' : ''}`}
              onClick={() =>
                onSetPickingMode(pickingMode === 'start' ? null : 'start')
              }
              title="Click on the map to set Start point"
            >
              {pickingMode === 'start' ? 'Click Map…' : 'Set'}
            </button>
            {startPoint && (
              <button
                type="button"
                className="endpoint-clear-btn"
                onClick={onClearStart}
                title="Clear start point"
                aria-label="Clear start point"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Reverse and swap button */}
        <div className="endpoint-divider-row">
          <div className="endpoint-divider-line" aria-hidden="true" />
          <button
            type="button"
            className="endpoint-swap-btn"
            onClick={onReverseEndpoints}
            disabled={!startPoint && !destPoint}
            title="Swap start and destination"
            aria-label="Swap start and destination"
          >
            ⇅
          </button>
          <div className="endpoint-divider-line" aria-hidden="true" />
        </div>

        {/* Destination Point */}
        <div
          className={`endpoint-card ${pickingMode === 'dest' ? 'active-picking' : ''}`}
        >
          <div className="endpoint-icon-col">
            <span className="endpoint-pin dest" aria-hidden="true">
              B
            </span>
          </div>
          <div className="endpoint-info-col">
            <span className="endpoint-label">Destination</span>
            <span className="endpoint-value">
              {destPoint
                ? destPoint.name ||
                  `${destPoint.coordinates[0].toFixed(4)}, ${destPoint.coordinates[1].toFixed(4)}`
                : 'Not selected'}
            </span>
            {destPoint?.snapDistanceMeters !== undefined && (
              <span className="endpoint-snap-meta">
                Snapped to road ({Math.round(destPoint.snapDistanceMeters)}m)
              </span>
            )}
          </div>
          <div className="endpoint-actions-col">
            <button
              type="button"
              className={`endpoint-pick-btn ${pickingMode === 'dest' ? 'active' : ''}`}
              onClick={() =>
                onSetPickingMode(pickingMode === 'dest' ? null : 'dest')
              }
              title="Click on the map to set Destination"
            >
              {pickingMode === 'dest' ? 'Click Map…' : 'Set'}
            </button>
            {destPoint && (
              <button
                type="button"
                className="endpoint-clear-btn"
                onClick={onClearDest}
                title="Clear destination"
                aria-label="Clear destination"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Snap Notice Alert */}
      {snapNotice && <div className="routing-notice-box">{snapNotice}</div>}

      {/* Presets Quick Picker */}
      <div className="presets-section">
        <div className="presets-header">
          <span className="presets-title">Quick Landmarks</span>
          <span className="presets-hint">Tap to set as Dest</span>
        </div>
        <div className="preset-chips-scroll" role="list">
          {ROUTING_PRESETS.map((preset) => {
            const isAffinity = preset.profileAffinity === profile;
            return (
              <button
                key={preset.id}
                type="button"
                className={`preset-chip ${isAffinity ? 'affinity' : ''}`}
                onClick={() => {
                  if (!startPoint) {
                    onSelectPreset(preset, 'start');
                  } else {
                    onSelectPreset(preset, 'dest');
                  }
                }}
                title={`${preset.name} (${preset.sector}): ${preset.description}`}
              >
                <span className="preset-name">{preset.name}</span>
                <span className="preset-sector">{preset.sector}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Route Calculation State / Result */}
      {isCalculating && (
        <div className="routing-status-loading">
          <span className="status-dot pulsing" aria-hidden="true" />
          <span>Calculating profile-optimal route…</span>
        </div>
      )}

      {routeResult && routeResult.success && (
        <div className="route-result-card">
          <div className="route-result-header">
            <span className="route-badge-calculated">Route Calculated</span>
            <button
              type="button"
              className="route-reset-btn"
              onClick={onClearAll}
              title="Clear current route and calculate another"
            >
              New Route
            </button>
          </div>

          <div className="route-metrics-row">
            <div className="route-metric-item">
              <span className="metric-label">Network Distance</span>
              <span className="metric-val">
                {formatDistance(routeResult.distanceMeters)}
              </span>
            </div>
            <div className="route-metric-item">
              <span className="metric-label">Est. Travel Time</span>
              <span
                className="metric-val"
                style={{ color: conf.accentColor }}
              >
                {formatDuration(routeResult.durationMinutes)}
              </span>
            </div>
          </div>

          <div className="speed-assumption-footnote">
            Based on documented {conf.label.toLowerCase()} speed assumption:{' '}
            <strong>{speedDescriptions[profile]}</strong>.
          </div>

          {/* Segment Infrastructure Breakdown */}
          {Object.keys(routeResult.segmentBreakdown).length > 0 && (
            <div className="route-breakdown-section">
              <div className="breakdown-title">Network Segment Breakdown:</div>
              <div className="breakdown-tags-list">
                {Object.entries(routeResult.segmentBreakdown).map(
                  ([k, dist]) => {
                    if (dist < 10) return null;
                    let displayKey = k.replace(/_/g, ' ');
                    if (k === 'footway') displayKey = 'Pedestrian Footway';
                    if (k === 'path') displayKey = 'Multi-use Path';
                    if (k === 'cycleway') displayKey = 'Dedicated Cycleway';
                    if (k === 'corridor_cycle_tracks')
                      displayKey = 'Segregated Cycle Tracks';
                    if (k === 'residential') displayKey = 'Residential Street';
                    if (k === 'living_street') displayKey = 'Living Street (Pedestrian Priority)';
                    if (k === 'service') displayKey = 'Service / Access Lane';
                    if (k === 'secondary') displayKey = 'Secondary Arterial';
                    if (k === 'secondary_link') displayKey = 'Secondary Arterial Link';
                    if (k === 'tertiary') displayKey = 'Tertiary Collector';
                    if (k === 'tertiary_link') displayKey = 'Tertiary Collector Link';
                    if (k === 'primary') displayKey = 'Primary Highway';
                    if (k === 'trunk') displayKey = 'Trunk Highway';
                    if (k === 'steps') displayKey = '⚠️ Stairs / Steps (Physical Barrier)';
                    if (k === 'near_24h_services')
                      displayKey = 'Within 150m of 24/7 Services';

                    return (
                      <div key={k} className="breakdown-tag-row">
                        <span className="breakdown-tag-name">{displayKey}</span>
                        <span className="breakdown-tag-dist">
                          {formatDistance(dist)} (
                          {Math.round(
                            (dist / routeResult.distanceMeters) * 100
                          )}
                          %)
                        </span>
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* Wheelchair Barrier Warning if Stairs Present */}
          {profile === 'wheelchair' &&
            routeResult.segmentBreakdown['steps'] !== undefined &&
            routeResult.segmentBreakdown['steps'] > 0 && (
              <div className="wheelchair-barrier-warning" role="alert">
                <span className="warning-icon" aria-hidden="true">⚠️</span>
                <span>
                  <strong>Stairs Alert:</strong> This route includes mapped steps/stairs ({formatDistance(routeResult.segmentBreakdown['steps'])}). Manual wheelchairs may require assistance.
                </span>
              </div>
            )}

          {/* Honest Profile Disclaimers */}
          <div className="route-disclaimer">
            {profile === 'wheelchair' && (
              <p>
                <strong>Methodology & Limitations:</strong> Route follows
                connected OpenStreetMap geometry. Sidewalk connectivity and curb
                cuts are sparsely recorded in Chandigarh; unknown accessibility
                is treated as unrated, not guaranteed barrier-free.
              </p>
            )}
            {profile === 'bicycle' && (
              <p>
                <strong>Methodology & Limitations:</strong> Dedicated cycleways
                and roadside cycle tracks are prioritized where mapped.
                Untagged arterial roads are penalized to encourage safer
                cycling corridors.
              </p>
            )}
            {profile === 'night' && (
              <p>
                <strong>Methodology & Limitations:</strong> Route navigates the
                street network with modest preference for verified street
                lighting and corridors near 24/7 emergency services. Proximity
                does not prove safety.
              </p>
            )}
          </div>
        </div>
      )}

      {/* No Connected Route Error Alert */}
      {routeResult && !routeResult.success && (
        <div className="route-error-card" role="alert">
          <div className="route-error-header">
            <span className="error-icon" aria-hidden="true">
              ⚠️
            </span>
            <span className="error-title">No Connected Route Found</span>
          </div>
          <p className="error-body">{routeResult.errorReason}</p>
          <div className="error-actions">
            <button
              type="button"
              className="route-reset-btn"
              onClick={onClearAll}
            >
              Pick Different Endpoints
            </button>
          </div>
        </div>
      )}

      {/* Empty / Prompt State */}
      {!routeResult && !isCalculating && (!startPoint || !destPoint) && (
        <div className="routing-prompt-hint">
          {!startPoint && !destPoint && (
            <p>
              Click anywhere on the map or tap a preset above to set the{' '}
              <strong>Start Point (A)</strong>.
            </p>
          )}
          {startPoint && !destPoint && (
            <p>
              Now click on the map or choose a preset to set the{' '}
              <strong>Destination (B)</strong>.
            </p>
          )}
        </div>
      )}
    </aside>
  );
};
