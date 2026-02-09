import { useState, useEffect } from 'react';
import { EpisodeCard } from './EpisodeCard';
import type { EpisodeWithHistory } from '../../types/Episode';
import { api } from '../../services/api';
import './EpisodeSelector.css';

interface EpisodeSelectorProps {
  seasonNumber: number;
  onSelectEpisode: (episodeId: number) => void;
  onBack: () => void;
}

export function EpisodeSelector({ seasonNumber, onSelectEpisode, onBack }: EpisodeSelectorProps) {
  const [episodes, setEpisodes] = useState<EpisodeWithHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEpisodes();
  }, [seasonNumber]);

  const loadEpisodes = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.episodes.getBySeason(seasonNumber);
      setEpisodes(data);
    } catch (err) {
      console.error('Failed to load episodes:', err);
      setError('Failed to load episodes. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="episode-selector loading">
        <button onClick={onBack} className="back-button">
          ← Back to Seasons
        </button>
        <p>Loading episodes for Season {seasonNumber}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="episode-selector error">
        <button onClick={onBack} className="back-button">
          ← Back to Seasons
        </button>
        <p>{error}</p>
        <button onClick={loadEpisodes} className="retry-button">
          Try Again
        </button>
      </div>
    );
  }

  if (episodes.length === 0) {
    return (
      <div className="episode-selector empty">
        <button onClick={onBack} className="back-button">
          ← Back to Seasons
        </button>
        <p>No episodes found for Season {seasonNumber}</p>
      </div>
    );
  }

  return (
    <div className="episode-selector">
      <div className="episode-selector-header">
        <button onClick={onBack} className="back-button">
          ← Back to Seasons
        </button>
        <h2 className="episode-selector-title">
          Season {seasonNumber} Episodes
        </h2>
        <div className="episode-count">
          {episodes.length} episode{episodes.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="episodes-list">
        {episodes.map((episode) => (
          <EpisodeCard
            key={episode.id}
            episode={episode}
            onSelectEpisode={onSelectEpisode}
          />
        ))}
      </div>
    </div>
  );
}
