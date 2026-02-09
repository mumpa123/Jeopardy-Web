import { useState, useEffect } from 'react';
import { GameHistoryItem } from './GameHistoryItem';
import type { EpisodeWithHistory, GameResult } from '../../types/Episode';
import { api } from '../../services/api';
import './EpisodeCard.css';

interface EpisodeCardProps {
  episode: EpisodeWithHistory;
  onSelectEpisode: (episodeId: number) => void;
}

export function EpisodeCard({ episode, onSelectEpisode }: EpisodeCardProps) {
  const [showHistory, setShowHistory] = useState(false);
  const [gameHistory, setGameHistory] = useState<GameResult[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const formatAirDate = (dateString: string | null): string => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatLastPlayed = (dateString: string | null): string => {
    if (!dateString) return 'Never';

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  const loadGameHistory = async () => {
    if (gameHistory.length > 0) {
      // Already loaded
      setShowHistory(!showHistory);
      return;
    }

    setShowHistory(true);
    setLoadingHistory(true);
    setHistoryError(null);

    try {
      const history = await api.episodes.getGames(episode.id);
      setGameHistory(history);
    } catch (error) {
      console.error('Failed to load game history:', error);
      setHistoryError('Failed to load game history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleHistory = () => {
    if (episode.games_played === 0) return; // No history to show

    if (!showHistory && gameHistory.length === 0) {
      loadGameHistory();
    } else {
      setShowHistory(!showHistory);
    }
  };

  return (
    <div className="episode-card">
      <div className="episode-info">
        <div className="episode-header">
          <h3 className="episode-title">
            S{episode.season_number}E{episode.episode_number}
          </h3>
          <span className="episode-air-date">{formatAirDate(episode.air_date)}</span>
        </div>

        <div className="episode-stats">
          <span className="stat">
            <span className="stat-label">Clues:</span>
            <span className="stat-value">{episode.total_clues}</span>
          </span>
          <span className="stat">
            <span className="stat-label">Times Played:</span>
            <span className="stat-value">{episode.games_played}</span>
          </span>
          {episode.last_played && (
            <span className="stat">
              <span className="stat-label">Last Played:</span>
              <span className="stat-value">{formatLastPlayed(episode.last_played)}</span>
            </span>
          )}
        </div>

        <div className="episode-actions">
          <button className="play-button" onClick={() => onSelectEpisode(episode.id)}>
            Play This Episode
          </button>
          {episode.games_played > 0 && (
            <button className="history-button" onClick={toggleHistory}>
              {showHistory ? '▼' : '►'} {episode.games_played} Game{episode.games_played !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {showHistory && (
        <div className="game-history-section">
          {loadingHistory ? (
            <div className="loading-history">Loading game history...</div>
          ) : historyError ? (
            <div className="error-history">{historyError}</div>
          ) : gameHistory.length > 0 ? (
            <div className="game-history-list">
              <h4 className="history-title">Game History</h4>
              {gameHistory.map((game) => (
                <GameHistoryItem key={game.game_id} game={game} />
              ))}
            </div>
          ) : (
            <div className="no-history">No games found</div>
          )}
        </div>
      )}
    </div>
  );
}
