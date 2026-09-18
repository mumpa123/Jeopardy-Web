import { formatCurrency } from '../../utils/formatters';
import './ClueCard.css';

interface ClueCardProps {
  value: number;
  isRevealed: boolean;
  isActive?: boolean;
  buzzWon?: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function ClueCard({ value, isRevealed, isActive = false, buzzWon = false, onClick, disabled = false }: ClueCardProps) {
  const className = `clue-card ${isRevealed ? 'revealed' : ''} ${buzzWon ? 'buzz-won' : isActive ? 'buzzer-active' : ''} ${disabled ? 'disabled' : ''}`;

  // Debug logging
  if (isActive || buzzWon) {
    console.log('[ClueCard] Rendering with:', { isActive, buzzWon, className });
  }

  return (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled || isRevealed}
    >
      {!isRevealed && (
        <span className="clue-value">{formatCurrency(value)}</span>
      )}
    </button>
  );
}
