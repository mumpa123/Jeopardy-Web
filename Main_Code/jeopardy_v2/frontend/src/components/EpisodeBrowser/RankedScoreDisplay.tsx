import type { RankedScore } from '../../types/Episode';
import './RankedScoreDisplay.css';

interface RankedScoreDisplayProps {
  rankedScores: RankedScore[];
  compact?: boolean;
}

export function RankedScoreDisplay({ rankedScores, compact = false }: RankedScoreDisplayProps) {
  const getMedalEmoji = (rank: number): string => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return '';
    }
  };

  if (rankedScores.length === 0) {
    return (
      <div className="ranked-scores empty">
        <p>No scores available</p>
      </div>
    );
  }

  if (compact) {
    // Compact view: single line with winner
    const winner = rankedScores[0];
    return (
      <div className="ranked-scores compact">
        <span className="winner-display">
          🥇 {winner.player_name}: ${winner.score.toLocaleString()}
        </span>
        {rankedScores.length > 1 && (
          <span className="additional-players">
            {' '}+{rankedScores.length - 1} more
          </span>
        )}
      </div>
    );
  }

  // Full view: all players with ranks
  return (
    <div className="ranked-scores">
      {rankedScores.map((score) => (
        <div key={score.player_number} className={`score-item rank-${score.rank}`}>
          <span className="rank-medal">{getMedalEmoji(score.rank)}</span>
          <span className="rank-number">#{score.rank}</span>
          <span className="player-name">{score.player_name}</span>
          <span className="score">${score.score.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
