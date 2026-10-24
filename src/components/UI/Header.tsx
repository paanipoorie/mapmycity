import React from 'react';
import type { AppMode } from '../../types/map.ts';

interface HeaderProps {
  buildingCount: number | null;
  blockCount: number | null;
  isLoading: boolean;
  mode: AppMode;
  onResetView: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  buildingCount,
  blockCount,
  isLoading,
  mode,
  onResetView,
}) => {
  return (
    <header className="hud-panel top-left" aria-label="Map Overview">
      <div className="brand-group">
        <h1 className="brand-title">MapMyCity</h1>
        <span className={`phase-pill ${mode === 'path' ? 'path-active' : ''}`}>
          {mode === 'path' ? 'Path Mode: Routing' : 'Phase 4: Path & Blocks'}
        </span>
      </div>

      <p className="hud-description">
        {mode === 'path'
          ? 'Network graph routing along mapped Chandigarh roads & paths with profile-specific cost optimization.'
          : '3D urban context with interactive profile-specific markers, infrastructure linework, and block density.'}
      </p>

      <div className="hud-meta">
        <div className="status-indicator">
          <span
            className={`status-dot ${isLoading ? 'pulsing' : 'active'}`}
            aria-hidden="true"
          />
          <span className="status-text">
            {isLoading
              ? 'Loading city network & blocks...'
              : blockCount !== null
                ? `${blockCount.toLocaleString()} blocks · ${buildingCount !== null ? buildingCount.toLocaleString() : '14,407'} buildings`
                : 'Network graph ready'}
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
