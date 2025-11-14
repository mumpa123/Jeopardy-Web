import { formatCurrency } from '../../utils/formatters';
import './ClueCard.css';

interface ClueCardProps {
  value: number;
  isRevealed: boolean;
  isDailyDouble?: boolean;
  isActive?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function ClueCard({ value, isRevealed, isDailyDouble = false, isActive = false, onClick, disabled = false }: ClueCardProps) {
  return (
    <button
      className={`clue-card ${isRevealed ? 'revealed' : ''} ${isActive ? 'buzzer-active' : ''} ${disabled ? 'disabled' : ''} ${isDailyDouble && !isRevealed ? 'daily-double-indicator' : ''}`}
      onClick={onClick}
      disabled={disabled || isRevealed}
    >
      {!isRevealed && (
        <>
          {isDailyDouble ? (
            <span className="clue-dd-text">DD</span>
          ) : (
            <span className="clue-value">{formatCurrency(value)}</span>
          )}
        </>
      )}
    </button>
  );
}
