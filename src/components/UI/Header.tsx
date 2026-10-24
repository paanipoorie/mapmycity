import React from 'react';

interface HeaderProps {
  buildingCount: number | null;
  isLoading: boolean;
  onResetView: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  buildingCount,
  isLoading,
  onResetView,
}) => {
  return (
    <header className="hud-panel top-left" aria-label="Map Overview">
      <div className="brand-group">
        <h1 className="brand-title">MapMyCity</h1>
        <span className="phase-pill">Chandigarh 3D</span>
      </div>

      <p className="hud-description">
        Interactive 3D building extrusions derived from OpenStreetMap geometry.
      </p>

      <div className="hud-meta">
        <div className="status-indicator">
          <span
            className={`status-dot ${isLoading ? 'pulsing' : 'active'}`}
            aria-hidden="true"
          />
          <span className="status-text">
            {isLoading
              ? 'Loading building geometry...'
              : buildingCount !== null
                ? `${buildingCount.toLocaleString()} buildings rendered`
                : '3D buildings ready'}
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
