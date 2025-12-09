import { RankedScoreDisplay } from './RankedScoreDisplay';
import type { GameResult } from '../../types/Episode';
import './GameHistoryItem.css';

interface GameHistoryItemProps {
  game: GameResult;
}

export function GameHistoryItem({ game }: GameHistoryItemProps) {
  const getStatusBadgeClass = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'status-completed';
      case 'active':
        return 'status-active';
      case 'paused':
        return 'status-paused';
      case 'abandoned':
        return 'status-abandoned';
      default:
        return 'status-waiting';
    }
  };

  const getStatusText = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getGameDuration = (): string | null => {
    if (!game.started_at || !game.ended_at) return null;

    const start = new Date(game.started_at);
    const end = new Date(game.ended_at);
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);

    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMin = minutes % 60;
    return `${hours}h ${remainingMin}m`;
  };

  const duration = getGameDuration();

  return (
    <div className="game-history-item">
      <div className="game-header">
        <span className={`status-badge ${getStatusBadgeClass(game.status)}`}>
          {getStatusText(game.status)}
        </span>
        <span className="game-date">{formatDate(game.created_at)}</span>
        {duration && <span className="game-duration">⏱️ {duration}</span>}
      </div>

      <div className="game-scores">
        <RankedScoreDisplay rankedScores={game.ranked_scores} />
      </div>

      <div className="game-id">
        <span className="game-id-label">Game ID:</span>
        <span className="game-id-value">{game.game_id.slice(0, 8)}</span>
      </div>
    </div>
  );
}
