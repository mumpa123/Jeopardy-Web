import { getPlayerColor } from '../../utils/formatters';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  scores: { [playerNumber: number]: number };
  playerNames?: { [playerNumber: number]: string };
  currentPlayer?: number | null;
}

export function ScoreDisplay({ scores, playerNames = {}, currentPlayer = null }: ScoreDisplayProps) {
  const playerNumbers = Object.keys(scores).map(Number).sort();

  return (
    <div className="score-display">
      {playerNumbers.map(playerNum => (
        <div
          key={playerNum}
          className={`score-item ${currentPlayer === playerNum ? 'current-player' : ''}`}
          style={{ borderLeftColor: getPlayerColor(playerNum) }}
        >
          <div className="player-name">
            {playerNames[playerNum] || `Player ${playerNum}`}
          </div>
          <div className="player-score">
            ${scores[playerNum].toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
