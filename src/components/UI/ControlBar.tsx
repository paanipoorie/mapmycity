import React from 'react';
import type { AppMode, UserProfile } from '../../types/map.ts';
import { PROFILE_CONFIGS } from '../../config/mapConfig.ts';

interface ControlBarProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  profile: UserProfile;
  onProfileChange: (profile: UserProfile) => void;
  onOpenRecommendation?: () => void;
}

export const ControlBar: React.FC<ControlBarProps> = ({
  mode,
  onModeChange,
  profile,
  onProfileChange,
  onOpenRecommendation,
}) => {
  const profiles: UserProfile[] = ['wheelchair', 'bicycle', 'night'];

  return (
    <nav className="control-bar-panel" aria-label="Map Mode and Profile Controls">
      {/* Mode Selector */}
      <div className="control-section">
        <span className="control-section-label">Mode</span>
        <div className="segmented-control" role="tablist" aria-label="Map Mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'block'}
            className={`control-tab-btn ${mode === 'block' ? 'active' : ''}`}
            onClick={() => onModeChange('block')}
            title="Block mode: urban blocks colored by feature density gradient"
          >
            <span className="tab-indicator-dot" aria-hidden="true" />
            Block
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === 'path'}
            className={`control-tab-btn ${mode === 'path' ? 'active' : ''}`}
            onClick={() => onModeChange('path')}
            title="Path mode: network routing with profile-specific preferences"
          >
            <span className="tab-indicator-dot" aria-hidden="true" />
            Path
          </button>
        </div>
      </div>

      <div className="control-divider" aria-hidden="true" />

      {/* Profile Selector */}
      <div className="control-section">
        <span className="control-section-label">Profile</span>
        <div className="segmented-control" role="tablist" aria-label="User Profile">
          {profiles.map((p) => {
            const conf = PROFILE_CONFIGS[p];
            const isActive = profile === p;
            return (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`control-tab-btn profile-btn ${p} ${isActive ? 'active' : ''}`}
                onClick={() => onProfileChange(p)}
                style={
                  isActive
                    ? ({
                        '--profile-accent': conf.accentColor,
                        '--profile-border': conf.outlineColor,
                      } as React.CSSProperties)
                    : undefined
                }
              >
                <span className="profile-label">{conf.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="control-divider" aria-hidden="true" />

      {/* Antigravity AI Recommendation Button */}
      <button
        type="button"
        className="ai-recommendation-trigger-btn"
        onClick={onOpenRecommendation}
        title="Antigravity AI Travel Recommendation"
        aria-label="Antigravity AI Travel Recommendation"
      >
        <span className="ai-sparkle-anim" aria-hidden="true">✨</span>
        <span className="ai-btn-text">AI Advice</span>
      </button>
    </nav>
  );
};
