import React, { useState } from 'react';
import type { UserProfile, AppMode } from '../../types/map.ts';
import { PROFILE_CONFIGS } from '../../config/mapConfig.ts';

interface LegendProps {
  profile: UserProfile;
  totalBlocks: number | null;
  mode?: AppMode;
}

export const Legend: React.FC<LegendProps> = ({ profile, totalBlocks, mode = 'block' }) => {
  // Track user manual toggle per mode; default: expanded in Block mode, collapsed in Path mode
  const [userOverride, setUserOverride] = useState<{ mode: AppMode; isExpanded: boolean } | null>(null);
  const isExpanded =
    userOverride && userOverride.mode === mode
      ? userOverride.isExpanded
      : mode === 'block';

  const conf = PROFILE_CONFIGS[profile];

  const handleToggle = () => {
    setUserOverride({ mode, isExpanded: !isExpanded });
  };

  return (
    <aside
      className="legend-panel bottom-right"
      aria-label={`${conf.label} Gradient Legend`}
    >
      <div className="legend-header">
        <div className="legend-title-wrap">
          <span
            className="legend-dot"
            style={{ backgroundColor: conf.accentColor }}
            aria-hidden="true"
          />
          <h2 className="legend-title">{conf.label} Density</h2>
        </div>
        <button
          type="button"
          onClick={handleToggle}
          className="legend-toggle-btn"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse legend' : 'Expand legend'}
        >
          {isExpanded ? 'Hide' : 'Show'}
        </button>
      </div>

      {isExpanded && (
        <div className="legend-body">
          <p className="legend-tagline">{conf.tagline}</p>

          {/* Subheading: Density Gradient */}
          <div className="legend-subheading">Density Gradient</div>

          {/* Color Gradient Swatch Ramp */}
          <div className="legend-ramp-bar" role="img" aria-label="Density gradient scale">
            {conf.gradient.map((step) => (
              <div
                key={step.tier}
                className="ramp-step"
                style={{ backgroundColor: step.color }}
                title={`Tier ${step.tier}: ${step.label} (${step.range} ${conf.densityUnit})`}
              />
            ))}
          </div>

          {/* Gradient Scale Labels */}
          <div className="legend-scale-labels" aria-hidden="true">
            <span className="scale-label min">None (0)</span>
            <span className="scale-label mid">Moderate</span>
            <span className="scale-label max">High</span>
          </div>

          {/* Detailed Step Breakdown */}
          <div className="legend-tier-list">
            {conf.gradient.map((step) => (
              <div key={step.tier} className="tier-row">
                <span
                  className="tier-swatch"
                  style={{ backgroundColor: step.color }}
                  aria-hidden="true"
                />
                <span className="tier-name">{step.label}</span>
                <span className="tier-range">
                  {step.range} {conf.densityUnit}
                </span>
              </div>
            ))}
          </div>

          {/* Profile Feature Markers & Linework */}
          {conf.markerLegend && conf.markerLegend.length > 0 && (
            <div className="legend-features-section">
              <div className="legend-subheading">Mapped Markers & Linework</div>
              <div className="legend-feature-list" role="list">
                {conf.markerLegend.map((item) => (
                  <div key={item.id} className="feature-row" role="listitem">
                    <div className="feature-symbol-col" aria-hidden="true">
                      {item.type === 'point' && (
                        <span
                          className="feature-point-dot"
                          style={{
                            backgroundColor: item.color,
                            boxShadow: `0 0 6px ${item.color}88`,
                          }}
                        />
                      )}
                      {item.type === 'line' && (
                        <span
                          className="feature-solid-line"
                          style={{ backgroundColor: item.color }}
                        />
                      )}
                      {item.type === 'dashed-line' && (
                        <span
                          className="feature-dashed-line"
                          style={{ borderColor: item.color }}
                        />
                      )}
                    </div>
                    <div className="feature-info-col">
                      <div className="feature-title-row">
                        <span className="feature-label">{item.label}</span>
                        {item.count !== undefined && (
                          <span className="feature-count-badge">
                            {item.count}
                          </span>
                        )}
                      </div>
                      {item.note && (
                        <span className="feature-note">{item.note}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Coverage Summary Stats */}
          <div className="legend-stats">
            <span className="stats-highlight">
              {conf.mappedBlocksCount.toLocaleString()} of{' '}
              {totalBlocks !== null ? totalBlocks.toLocaleString() : '4,433'}{' '}
              blocks
            </span>{' '}
            contain mapped features for this profile.
          </div>

          {/* Data Disclaimer */}
          <p className="legend-disclaimer">
            Gradient denotes density of mapped OpenStreetMap features. Missing
            data does not imply an area is inaccessible or unsafe.
          </p>
        </div>
      )}
    </aside>
  );
};
