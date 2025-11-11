import { getPlayerColor } from '../../utils/formatters';
import './BuzzerQueue.css';

interface BuzzerQueueProps {
  buzzQueue: Array<{ playerNumber: number; playerName: string; timestamp: number }>;
  onClear: () => void;
}

export function BuzzerQueue({ buzzQueue, onClear }: BuzzerQueueProps) {
  if (buzzQueue.length === 0) {
    return (
      <div className="buzzer-queue empty">
        <h3>Buzzer Queue</h3>
        <p className="no-buzzes">No buzzes yet</p>
      </div>
    );
  }

  return (
    <div className="buzzer-queue">
      <div className="queue-header">
        <h3>Buzzer Queue</h3>
        <button className="clear-button" onClick={onClear}>
          Clear
        </button>
      </div>

      <div className="queue-list">
        {buzzQueue.map((buzz, index) => (
          <div
            key={`${buzz.playerNumber}-${buzz.timestamp}`}
            className={`queue-item ${index === 0 ? 'first' : ''}`}
            style={{ borderLeftColor: getPlayerColor(buzz.playerNumber) }}
          >
            <div className="queue-position">{index + 1}</div>
            <div className="queue-player">
              <div className="player-name">{buzz.playerName}</div>
              <div className="player-number">Player {buzz.playerNumber}</div>
            </div>
            {index === 0 && (
              <div className="winner-badge">WINNER</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
