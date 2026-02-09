import { useState, useEffect } from 'react';
import type { Season } from '../../types/Episode';
import { api } from '../../services/api';
import './SeasonSelector.css';

interface SeasonSelectorProps {
  onSelectSeason: (seasonNumber: number) => void;
}

export function SeasonSelector({ onSelectSeason }: SeasonSelectorProps) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSeasons();
  }, []);

  const loadSeasons = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.episodes.getSeasons();
      setSeasons(data);
    } catch (err) {
      console.error('Failed to load seasons:', err);
      setError('Failed to load seasons. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="season-selector loading">
        <p>Loading seasons...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="season-selector error">
        <p>{error}</p>
        <button onClick={loadSeasons} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  if (seasons.length === 0) {
    return (
      <div className="season-selector empty">
        <p>No seasons available</p>
      </div>
    );
  }

  return (
    <div className="season-selector">
      <h2 className="season-selector-title">Select a Season</h2>
      <div className="seasons-grid">
        {seasons.map((season) => (
          <div
            key={season.season_number}
            className="season-card"
            onClick={() => onSelectSeason(season.season_number)}
          >
            <div className="season-number">Season {season.season_number}</div>
            <div className="season-stats">
              <div className="season-stat">
                <span className="stat-value">{season.episode_count}</span>
                <span className="stat-label">Episodes</span>
              </div>
              <div className="season-stat">
                <span className="stat-value">{season.total_games_played}</span>
                <span className="stat-label">Games Played</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
