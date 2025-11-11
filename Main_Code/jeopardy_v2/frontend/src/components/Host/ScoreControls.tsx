import { useState } from 'react';
import { getPlayerColor } from '../../utils/formatters';
import './ScoreControls.css';

interface ScoreControlsProps {
  players: Array<{ playerNumber: number; playerName: string; score: number }>;
  onAdjustScore: (playerNumber: number, amount: number) => void;
}

export function ScoreControls({ players, onAdjustScore }: ScoreControlsProps) {
  const [customAmounts, setCustomAmounts] = useState<{ [key: number]: string }>({});

  const quickAmounts = [200, 400, 600, 800, 1000, -200, -400, -600, -800, -1000];

  const handleCustomAdjust = (playerNumber: number) => {
    const amount = parseInt(customAmounts[playerNumber] || '0');
    if (!isNaN(amount) && amount !== 0) {
      onAdjustScore(playerNumber, amount);
      setCustomAmounts({ ...customAmounts, [playerNumber]: '' });
    }
  };

  return (
    <div className="score-controls">
      <h3>Score Adjustments</h3>

      {players.map(player => (
        <div
          key={player.playerNumber}
          className="player-score-control"
          style={{ borderLeftColor: getPlayerColor(player.playerNumber) }}
        >
          <div className="player-info">
            <div className="player-name">{player.playerName}</div>
            <div className="current-score">${player.score.toLocaleString()}</div>
          </div>

          <div className="quick-adjustments">
            {quickAmounts.map(amount => (
              <button
                key={amount}
                className={`quick-button ${amount < 0 ? 'negative' : 'positive'}`}
                onClick={() => onAdjustScore(player.playerNumber, amount)}
              >
                {amount > 0 ? '+' : ''}{amount}
              </button>
            ))}
          </div>

          <div className="custom-adjustment">
            <input
              type="number"
              placeholder="Custom amount"
              value={customAmounts[player.playerNumber] || ''}
              onChange={(e) => setCustomAmounts({ ...customAmounts, [player.playerNumber]: e.target.value })}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCustomAdjust(player.playerNumber);
                }
              }}
            />
            <button onClick={() => handleCustomAdjust(player.playerNumber)}>
              Apply
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
