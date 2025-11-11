import type { Clue } from '../../types/Episode';
import { formatCurrency } from '../../utils/formatters';
import './ClueModal.css';

interface ClueModalProps {
  clue: Clue | null;
  onClose: () => void;
  showAnswer?: boolean;
}

export function ClueModal({ clue, onClose, showAnswer = false }: ClueModalProps) {
  if (!clue) return null;

  return (
    <div className="clue-modal-overlay" onClick={onClose}>
      <div className="clue-modal" onClick={(e) => e.stopPropagation()}>
        <div className="clue-value-header">
          {formatCurrency(clue.value)}
        </div>

        <div className="clue-content">
          <div className="clue-question">
            {clue.question}
          </div>

          {showAnswer && (
            <div className="clue-answer">
              <div className="answer-label">Answer:</div>
              <div className="answer-text">{clue.answer}</div>
            </div>
          )}
        </div>

        {clue.is_daily_double && (
          <div className="daily-double-indicator">
            DAILY DOUBLE
          </div>
        )}

        <button className="close-button" onClick={onClose}>
          ×
        </button>
      </div>
    </div>
  );
}
