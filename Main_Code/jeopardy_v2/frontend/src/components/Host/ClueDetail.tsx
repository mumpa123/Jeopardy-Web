import type { Clue } from '../../types/Episode';
import { formatCurrency, getClueValue, cleanClueText } from '../../utils/formatters';
import './ClueDetail.css';

interface ClueDetailProps {
  clue: Clue | null;
  currentRound: 'single' | 'double' | 'final';
  showAnswer: boolean;
  buzzerEnabled: boolean;
  onToggleAnswer: () => void;
  onNextClue: () => void;
  onEnableBuzzer: () => void;
  onMarkCorrect: () => void;
  onMarkIncorrect: () => void;
}

export function ClueDetail({
  clue,
  currentRound,
  showAnswer,
  buzzerEnabled,
  onToggleAnswer,
  onNextClue,
  onEnableBuzzer,
  onMarkCorrect,
  onMarkIncorrect
}: ClueDetailProps) {
  if (!clue) {
    return (
      <div className="clue-detail empty">
        <p>No clue selected. Click a clue on the board to begin.</p>
      </div>
    );
  }

  // Calculate the correct value based on position and round
  const displayValue = currentRound === 'final'
    ? clue.value
    : getClueValue(clue.position, currentRound);

  return (
    <div className="clue-detail">
      <div className="clue-header">
        <div className="clue-value">{formatCurrency(displayValue)}</div>
        {clue.is_daily_double && (
          <div className="daily-double-badge">DAILY DOUBLE</div>
        )}
      </div>

      <div className="clue-question">
        <h4>Question:</h4>
        <p dangerouslySetInnerHTML={{ __html: cleanClueText(clue.question) }} />
      </div>

      {/* Finished Reading Button - Show when buzzer not enabled */}
      {!buzzerEnabled && (
        <div className="clue-reading-section">
          <button
            className="finished-reading-button"
            onClick={onEnableBuzzer}
          >
            Finished Reading
          </button>
        </div>
      )}

      {/* Judge Answer Section */}
      <div className="judge-answer-section">
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

      <div className="clue-answer-section">
        <div className="clue-buttons">
          <button
            className={`toggle-answer-button ${showAnswer ? 'showing' : ''}`}
            onClick={onToggleAnswer}
          >
            {showAnswer ? 'Hide Answer' : 'Show Answer'}
          </button>
          <button
            className="next-clue-button"
            onClick={onNextClue}
          >
            Next Clue
          </button>
        </div>

        {showAnswer && (
          <div className="clue-answer">
            <h4>Answer:</h4>
            <p dangerouslySetInnerHTML={{ __html: cleanClueText(clue.answer) }} />
          </div>
        )}
      </div>
    </div>
  );
}
