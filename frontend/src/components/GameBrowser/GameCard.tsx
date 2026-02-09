import { useNavigate } from 'react-router-dom';
import type { Game } from '../../types/Game';
import './GameCard.css';

interface GameCardProps {
  game: Game;
}

export function GameCard({ game }: GameCardProps) {
  const navigate = useNavigate();

  // Get short game ID (first 8 characters)
  const shortGameId = game.game_id.substring(0, 8);

  // Get player count
  const playerCount = game.participants?.length || 0;
  const maxPlayers = 6;

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting':
        return 'status-waiting';
      case 'active':
        return 'status-active';
      case 'completed':
        return 'status-completed';
      case 'paused':
        return 'status-paused';
      case 'abandoned':
        return 'status-abandoned';
      default:
        return 'status-default';
    }
  };

  // Get status display text
  const getStatusText = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Format relative time (e.g., "5 minutes ago")
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  // Handle join game
  const handleJoinGame = () => {
    navigate(`/player/${game.game_id}`);
  };

  // Handle spectate game
  const handleSpectate = () => {
    navigate(`/board/${game.game_id}`);
  };

  // Copy game ID to clipboard
  const handleCopyGameId = () => {
    navigator.clipboard.writeText(game.game_id);
    // You could add a toast notification here
    alert('Game ID copied to clipboard!');
  };

  return (
    <div className="game-card">
      {/* Header with Game ID and Status */}
      <div className="game-card-header">
        <div className="game-id-section">
          <span className="game-id-label">ID:</span>
          <span className="game-id">{shortGameId}</span>
          <button
            className="copy-button"
            onClick={handleCopyGameId}
            title="Copy full game ID"
          >
            📋
          </button>
        </div>
        <span className={`status-badge ${getStatusColor(game.status)}`}>
          {getStatusText(game.status)}
        </span>
      </div>

      {/* Game Info */}
      <div className="game-card-body">
        {/* Episode Info */}
        <div className="info-row">
          <span className="info-label">Episode:</span>
          <span className="info-value episode-badge">
            {game.episode_display || `Episode ${game.episode}`}
          </span>
        </div>

        {/* Player Count */}
        <div className="info-row">
          <span className="info-label">Players:</span>
          <span className="info-value">
            {playerCount}/{maxPlayers}
          </span>
        </div>

        {/* Host */}
        <div className="info-row">
          <span className="info-label">Host:</span>
          <span className="info-value">{game.host_name || 'Unknown'}</span>
        </div>

        {/* Created Time */}
        <div className="info-row">
          <span className="info-label">Created:</span>
          <span className="info-value time-value">
            {getRelativeTime(game.created_at)}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="game-card-actions">
        {game.status === 'waiting' && (
          <>
            <button className="btn-join" onClick={handleJoinGame}>
              Join Game
            </button>
            <button className="btn-spectate" onClick={handleSpectate}>
              View Board
            </button>
          </>
        )}
        {game.status === 'active' && (
          <>
            <button className="btn-join" onClick={handleJoinGame}>
              Join Game
            </button>
            <button className="btn-spectate" onClick={handleSpectate}>
              Spectate
            </button>
          </>
        )}
        {game.status === 'completed' && (
          <button className="btn-spectate" onClick={handleSpectate}>
            View Results
          </button>
        )}
      </div>
    </div>
  );
}
