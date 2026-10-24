import React, { useState } from 'react';
import type { UserProfile } from '../../types/map.ts';
import { PROFILE_CONFIGS } from '../../config/mapConfig.ts';

interface LegendProps {
  profile: UserProfile;
  totalBlocks: number | null;
}

export const Legend: React.FC<LegendProps> = ({ profile, totalBlocks }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const conf = PROFILE_CONFIGS[profile];

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
          onClick={() => setIsExpanded((prev) => !prev)}
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
