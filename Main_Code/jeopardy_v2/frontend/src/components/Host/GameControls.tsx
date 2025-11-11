import './GameControls.css';

interface GameControlsProps {
  currentRound: 'single' | 'double' | 'final';
  gameStatus: 'waiting' | 'active' | 'completed';
  currentClue: any;
  onStartRound: (round: 'single' | 'double' | 'final') => void;
  onMarkCorrect: () => void;
  onMarkIncorrect: () => void;
  onNextClue: () => void;
  onEndGame: () => void;
  onResetGame?: () => void;
}

export function GameControls({
  currentRound,
  gameStatus,
  currentClue,
  onStartRound,
  onMarkCorrect,
  onMarkIncorrect,
  onNextClue,
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

      {/* Answer Judgment (only show when clue is active) */}
      {currentClue && (
        <div className="control-section">
          <h4>Judge Answer</h4>
          <div className="judgment-buttons">
            <button
              className="judgment-button correct"
              onClick={onMarkCorrect}
            >
              ✓ Correct
            </button>
            <button
              className="judgment-button incorrect"
              onClick={onMarkIncorrect}
            >
              ✗ Incorrect
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="control-section">
        <h4>Navigation</h4>
        <button
          className="nav-button next-clue"
          onClick={onNextClue}
          disabled={!currentClue}
        >
          Next Clue
        </button>
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
