import { useState } from 'react';
import './WagerInput.css';

interface WagerInputProps {
  maxWager: number;
  onSubmit: (wager: number) => void;
  disabled: boolean;
}

export function WagerInput({ maxWager, onSubmit, disabled }: WagerInputProps) {
  const [wager, setWager] = useState<string>('');

  const handleSubmit = () => {
    const wagerNum = parseInt(wager);
    if (wagerNum >= 0 && wagerNum <= maxWager) {
      onSubmit(wagerNum);
      setWager('');
    }
  };

  return (
    <div className="wager-input-container">
      <h2>Enter Your Wager</h2>
      <p className="wager-max">Maximum: ${maxWager.toLocaleString()}</p>
      <input
        type="number"
        className="wager-input"
        value={wager}
        onChange={(e) => setWager(e.target.value)}
        min={0}
        max={maxWager}
        disabled={disabled}
        placeholder="Enter amount"
      />
      <button
        className="wager-submit-button"
        onClick={handleSubmit}
        disabled={disabled || !wager || parseInt(wager) > maxWager}
      >
        Submit Wager
      </button>
    </div>
  );
}
