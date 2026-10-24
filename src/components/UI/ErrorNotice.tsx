import React from 'react';
import type { MapError } from '../../types/map.ts';

interface ErrorNoticeProps {
  error: MapError;
  onRetry: () => void;
}

export const ErrorNotice: React.FC<ErrorNoticeProps> = ({ error, onRetry }) => {
  return (
    <aside className="error-banner" role="alert" aria-live="assertive">
      <div className="error-icon" aria-hidden="true">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div className="error-content">
        <h2 className="error-title">{error.title}</h2>
        <p className="error-message">{error.message}</p>
        {error.details && (
          <code className="error-details">{error.details}</code>
        )}
      </div>
      <button
        type="button"
        className="error-retry-btn"
        onClick={onRetry}
      >
        Retry
      </button>
    </aside>
  );
};
