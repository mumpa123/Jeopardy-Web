import { formatCurrency } from '../../utils/formatters';
import './ClueCard.css';

interface ClueCardProps {
  value: number;
  isRevealed: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export function ClueCard({ value, isRevealed, onClick, disabled = false }: ClueCardProps) {
  return (
    <button
      className={`clue-card ${isRevealed ? 'revealed' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled || isRevealed}
    >
      {!isRevealed && (
        <span className="clue-value">{formatCurrency(value)}</span>
      )}
    </button>
  );
}
