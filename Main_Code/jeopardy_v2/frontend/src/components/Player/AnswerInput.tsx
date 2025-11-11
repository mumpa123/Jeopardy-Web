import { useState } from 'react';
import './AnswerInput.css';

interface AnswerInputProps {
  onSubmit: (answer: string) => void;
  disabled: boolean;
}

export function AnswerInput({ onSubmit, disabled }: AnswerInputProps) {
  const [answer, setAnswer] = useState('');

  const handleSubmit = () => {
    if (answer.trim()) {
      onSubmit(answer.trim());
      setAnswer('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled) {
      handleSubmit();
    }
  };

  return (
    <div className="answer-input-container">
      <h3>Your Answer:</h3>
      <input
        type="text"
        className="answer-input"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={disabled}
        placeholder="What is...?"
        autoFocus
      />
      <button
        className="answer-submit-button"
        onClick={handleSubmit}
        disabled={disabled || !answer.trim()}
      >
        Submit Answer
      </button>
    </div>
  );
}
