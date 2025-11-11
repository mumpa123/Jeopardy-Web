import './BuzzButton.css';

interface BuzzButtonProps {
  onBuzz: () => void;
  disabled: boolean;
  buzzed: boolean;
}

export function BuzzButton({ onBuzz, disabled, buzzed }: BuzzButtonProps) {
  return (
    <button
      className={`buzz-button ${buzzed ? 'buzzed' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={onBuzz}
      disabled={disabled}
    >
      {buzzed ? 'BUZZED!' : 'BUZZ!'}
    </button>
  );
}
