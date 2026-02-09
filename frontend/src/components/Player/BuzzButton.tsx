import './BuzzButton.css';

interface BuzzButtonProps {
  onBuzz: () => void;
  disabled: boolean;
  buzzed: boolean;
  cooldown?: number; // Cooldown in seconds
}

export function BuzzButton({ onBuzz, disabled, buzzed, cooldown = 0 }: BuzzButtonProps) {
  const isInCooldown = cooldown > 0;
  const displayText = isInCooldown
    ? `WAIT ${Math.ceil(cooldown)}s`
    : buzzed
      ? 'BUZZED!'
      : disabled
        ? 'LOCKED'
        : 'BUZZ!';

  return (
    <button
      className={`buzz-button ${buzzed ? 'buzzed' : ''} ${disabled && !isInCooldown ? 'locked' : ''} ${isInCooldown ? 'cooldown' : ''}`}
      onClick={onBuzz}
      disabled={isInCooldown}
    >
      {displayText}
    </button>
  );
}
