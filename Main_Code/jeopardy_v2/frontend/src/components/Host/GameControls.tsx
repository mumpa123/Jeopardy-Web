import './GameControls.css';

interface GameControlsProps {
  currentRound: 'single' | 'double' | 'final';
  gameStatus: 'waiting' | 'active' | 'completed';
  onStartRound: (round: 'single' | 'double' | 'final') => void;
  onEndGame: () => void;
  onResetGame?: () => void;
}

export function GameControls({
  currentRound,
  gameStatus,
  onStartRound,
  onEndGame,
  onResetGame
}: GameControlsProps) {
  return (
    <div className="game-controls">
      <h3>Game Controls</h3>

      {/* Round Selection */}
      <div className="control-section">
        <h4>Round</h4>
        <div className="round-buttons">
          <button
            className={`round-button ${currentRound === 'single' ? 'active' : ''}`}
            onClick={() => onStartRound('single')}
            disabled={gameStatus === 'completed'}
          >
            Single Jeopardy
          </button>
          <button
            className={`round-button ${currentRound === 'double' ? 'active' : ''}`}
            onClick={() => onStartRound('double')}
            disabled={gameStatus === 'completed'}
          >
            Double Jeopardy
          </button>
          <button
            className={`round-button ${currentRound === 'final' ? 'active' : ''}`}
            onClick={() => onStartRound('final')}
            disabled={gameStatus === 'completed'}
          >
            Final Jeopardy
          </button>
        </div>
      </div>

      {/* Game Management */}
      <div className="control-section">
        <h4>Game Management</h4>
        {onResetGame && (
          <button
            className="nav-button reset-game"
            onClick={onResetGame}
          >
            Reset Game
          </button>
        )}
        <button
          className="nav-button end-game"
          onClick={onEndGame}
        >
          End Game
        </button>
      </div>
    </div>
  );
}
