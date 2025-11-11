import type { Clue } from '../../types/Episode';
import { formatCurrency } from '../../utils/formatters';
import './ClueDetail.css';

interface ClueDetailProps {
  clue: Clue | null;
  showAnswer: boolean;
  onToggleAnswer: () => void;
}

export function ClueDetail({ clue, showAnswer, onToggleAnswer }: ClueDetailProps) {
  if (!clue) {
    return (
      <div className="clue-detail empty">
        <p>No clue selected. Click a clue on the board to begin.</p>
      </div>
    );
  }

  return (
    <div className="clue-detail">
      <div className="clue-header">
        <div className="clue-value">{formatCurrency(clue.value)}</div>
        {clue.is_daily_double && (
          <div className="daily-double-badge">DAILY DOUBLE</div>
        )}
      </div>

      <div className="clue-question">
        <h4>Question:</h4>
        <p>{clue.question}</p>
      </div>

      <div className="clue-answer-section">
        <button
          className={`toggle-answer-button ${showAnswer ? 'showing' : ''}`}
          onClick={onToggleAnswer}
        >
          {showAnswer ? 'Hide Answer' : 'Show Answer'}
        </button>

        {showAnswer && (
          <div className="clue-answer">
            <h4>Answer:</h4>
            <p>{clue.answer}</p>
          </div>
        )}
      </div>
    </div>
  );
}
