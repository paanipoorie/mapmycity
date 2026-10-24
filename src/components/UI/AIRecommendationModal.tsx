import React, { useState, useMemo } from 'react';
import type { UserProfile, AppMode, RouteEndpoint } from '../../types/map.ts';
import {
  type RecommendationProfile,
  type AIRecommendation,
  generateAIRecommendation,
  POPULAR_RECOMMENDATION_DESTINATIONS,
} from '../../services/aiRecommendation.ts';

interface AIRecommendationModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProfile: UserProfile;
  activeMode: AppMode;
  destPoint: RouteEndpoint | null;
  onApplyProfile?: (profile: UserProfile) => void;
  onSelectDestination?: (dest: RouteEndpoint) => void;
  onSwitchToPathMode?: () => void;
}

export const AIRecommendationModal: React.FC<AIRecommendationModalProps> = ({
  isOpen,
  onClose,
  activeProfile,
  activeMode,
  destPoint,
  onApplyProfile,
  onSelectDestination,
  onSwitchToPathMode,
}) => {
  // Local profile selection in recommendation modal (defaults to activeProfile)
  const [selectedProfile, setSelectedProfile] = useState<RecommendationProfile>(activeProfile);

  // Local destination selection
  const [selectedDestId, setSelectedDestId] = useState<string>(() => {
    if (destPoint?.name) {
      const match = POPULAR_RECOMMENDATION_DESTINATIONS.find((d) =>
        destPoint.name!.toLowerCase().includes(d.sector.toLowerCase())
      );
      if (match) return match.id;
    }
    return 'sec17-plaza';
  });

  // Current destination object
  const currentDest = useMemo(() => {
    return (
      POPULAR_RECOMMENDATION_DESTINATIONS.find((d) => d.id === selectedDestId) ||
      POPULAR_RECOMMENDATION_DESTINATIONS[0]
    );
  }, [selectedDestId]);

  // Destination display name and sector
  const destName = destPoint?.name || currentDest.name;
  const destSector = currentDest.sector;

  // Generate recommendation dynamically
  const recommendation: AIRecommendation = useMemo(() => {
    return generateAIRecommendation(selectedProfile, destName, destSector);
  }, [selectedProfile, destName, destSector]);

  if (!isOpen) return null;

  const profileOptions: Array<{ id: RecommendationProfile; label: string; icon: string; color: string }> = [
    { id: 'wheelchair', label: 'Wheelchair', icon: '♿', color: '#00c49f' },
    { id: 'bicycle', label: 'Bicycle', icon: '🚲', color: '#f59e0b' },
    { id: 'night', label: 'Night', icon: '🌙', color: '#a855f7' },
    { id: 'tourist', label: 'Tourist', icon: '🏛️', color: '#38bdf8' },
  ];

  const handleRouteAction = () => {
    if (onSelectDestination) {
      onSelectDestination({
        coordinates: currentDest.coordinates,
        name: currentDest.name,
      });
    }
    if (onSwitchToPathMode && activeMode !== 'path') {
      onSwitchToPathMode();
    }
    if (selectedProfile !== 'tourist' && onApplyProfile) {
      onApplyProfile(selectedProfile as UserProfile);
    }
    onClose();
  };

  const handleApplyProfileOnly = () => {
    if (selectedProfile !== 'tourist' && onApplyProfile) {
      onApplyProfile(selectedProfile as UserProfile);
    }
  };

  const getVerdictBadgeClass = (verdict: string) => {
    switch (verdict) {
      case 'recommended':
        return 'badge-cyan';
      case 'suitable':
        return 'badge-green';
      case 'caution':
        return 'badge-amber';
      case 'advisory':
        return 'badge-purple';
      default:
        return 'badge-cyan';
    }
  };

  return (
    <div className="ai-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="ai-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="ai-modal-title"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="ai-modal-header">
          <div className="ai-badge-group">
            <span className="ai-sparkle-pill">
              <span className="sparkle-anim">✨</span> Antigravity AI Insights
            </span>
            <span
              className="ai-profile-tag"
              style={{ backgroundColor: `${recommendation.badgeColor}22`, color: recommendation.badgeColor, borderColor: `${recommendation.badgeColor}55` }}
            >
              {recommendation.badge}
            </span>
          </div>

          <button
            type="button"
            className="ai-modal-close-btn"
            onClick={onClose}
            aria-label="Close AI Recommendation"
          >
            ✕
          </button>
        </div>

        {/* Profile Tabs */}
        <div className="ai-profile-selector" role="tablist" aria-label="Recommendation Profile">
          {profileOptions.map((opt) => {
            const isActive = selectedProfile === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`ai-profile-tab-btn ${isActive ? 'active' : ''}`}
                style={
                  isActive
                    ? ({
                        '--profile-accent': opt.color,
                        borderColor: opt.color,
                        boxShadow: `0 0 12px ${opt.color}33`,
                      } as React.CSSProperties)
                    : undefined
                }
                onClick={() => setSelectedProfile(opt.id)}
              >
                <span className="tab-icon" aria-hidden="true">{opt.icon}</span>
                <span className="tab-label">{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Destination Quick Selector */}
        <div className="ai-dest-selector-bar">
          <label htmlFor="ai-dest-select" className="ai-dest-label">
            Target Destination:
          </label>
          <select
            id="ai-dest-select"
            className="ai-dest-dropdown"
            value={selectedDestId}
            onChange={(e) => setSelectedDestId(e.target.value)}
          >
            {POPULAR_RECOMMENDATION_DESTINATIONS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.sector})
              </option>
            ))}
          </select>
        </div>

        {/* Main Recommendation Content Box */}
        <div
          className="ai-rec-content-box"
          style={{ borderLeftColor: recommendation.badgeColor }}
        >
          <div className="ai-rec-header-row">
            <span className={`ai-verdict-badge ${getVerdictBadgeClass(recommendation.verdict)}`}>
              {recommendation.verdict.toUpperCase()}
            </span>
            <span className="ai-sector-tag">{recommendation.sector}</span>
          </div>

          <h3 className="ai-rec-headline">{recommendation.headline}</h3>

          <p className="ai-rec-text">{recommendation.recommendationText}</p>

          {/* Mapped Feature Highlights */}
          <div className="ai-features-grid">
            {recommendation.mappedFeatures.map((feat, idx) => (
              <div key={idx} className={`ai-feature-card ${feat.type}`}>
                <span className="feat-icon">{feat.icon}</span>
                <div className="feat-info">
                  <span className="feat-label">{feat.label}</span>
                  <span className="feat-detail">{feat.detail}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Disclaimers & Limitations */}
          <div className="ai-disclaimer-box">
            <span className="disclaimer-icon">ℹ️</span>
            <span className="disclaimer-text">{recommendation.limitationsDisclaimer}</span>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="ai-modal-footer">
          <div className="ai-footer-left">
            <span className="ai-source-note">
              {recommendation.networkSummary}
            </span>
          </div>

          <div className="ai-footer-actions">
            {selectedProfile !== 'tourist' && selectedProfile !== activeProfile && (
              <button
                type="button"
                className="ai-action-btn secondary"
                onClick={handleApplyProfileOnly}
                title={`Switch map view to ${selectedProfile}`}
              >
                Apply {selectedProfile} to Map
              </button>
            )}

            <button
              type="button"
              className="ai-action-btn primary"
              onClick={handleRouteAction}
              style={{ backgroundColor: recommendation.badgeColor, color: '#090b10' }}
            >
              Route to {currentDest.sector} in Path Mode →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
