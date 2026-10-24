import React from 'react';

interface HeaderProps {
  buildingCount: number | null;
  blockCount: number | null;
  isLoading: boolean;
  onResetView: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  buildingCount,
  blockCount,
  isLoading,
  onResetView,
}) => {
  return (
    <header className="hud-panel top-left" aria-label="Map Overview">
      <div className="brand-group">
        <h1 className="brand-title">MapMyCity</h1>
        <span className="phase-pill">Phase 3: Feature Markers</span>
      </div>

      <p className="hud-description">
        3D urban context with interactive profile-specific markers, infrastructure linework, and block density.
      </p>

      <div className="hud-meta">
        <div className="status-indicator">
          <span
            className={`status-dot ${isLoading ? 'pulsing' : 'active'}`}
            aria-hidden="true"
          />
          <span className="status-text">
            {isLoading
              ? 'Loading city blocks & buildings...'
              : blockCount !== null
                ? `${blockCount.toLocaleString()} blocks · ${buildingCount !== null ? buildingCount.toLocaleString() : '14,407'} buildings`
                : 'Urban blocks ready'}
          </span>
        </div>

        <button
          type="button"
          onClick={onResetView}
          className="hud-action-btn"
          title="Reset camera to Chandigarh city view"
          aria-label="Reset camera view"
        >
          Reset Camera
        </button>
      </div>
    </header>
  );
};
