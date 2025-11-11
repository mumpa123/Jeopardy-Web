import { getPlayerColor } from '../../utils/formatters';
import './ScoreDisplay.css';

interface ScoreDisplayProps {
  scores: { [playerNumber: number]: number };
  playerNames?: { [playerNumber: number]: string };
}

export function ScoreDisplay({ scores, playerNames = {} }: ScoreDisplayProps) {
  const playerNumbers = Object.keys(scores).map(Number).sort();

  return (
    <div className="score-display">
      {playerNumbers.map(playerNum => (
        <div
          key={playerNum}
          className="score-item"
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
