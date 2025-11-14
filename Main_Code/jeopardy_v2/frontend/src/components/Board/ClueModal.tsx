import type { Clue } from '../../types/Episode';
import { formatCurrency, getClueValue } from '../../utils/formatters';
import './ClueModal.css';

interface ClueModalProps {
  clue: Clue | null;
  currentRound: 'single' | 'double' | 'final';
  onClose: () => void;
  showAnswer?: boolean;
  buzzerEnabled?: boolean;
}

export function ClueModal({ clue, currentRound, onClose, showAnswer = false, buzzerEnabled = false }: ClueModalProps) {
  if (!clue) return null;

  // Calculate the correct value based on position and round
  const displayValue = currentRound === 'final'
    ? clue.value
    : getClueValue(clue.position, currentRound);

  return (
    <div className="clue-modal-overlay" onClick={onClose}>
      <div className={`clue-modal ${buzzerEnabled ? 'buzzer-active' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="clue-value-header">
          {formatCurrency(displayValue)}
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
      </div>
    </div>
  );
}
