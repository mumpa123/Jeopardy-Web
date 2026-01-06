import { useEffect, useRef, useState } from 'react';
import type { Clue } from '../../types/Episode';
import { formatCurrency, getClueValue, cleanClueText } from '../../utils/formatters';
import './ClueModal.css';

interface ClueModalProps {
  clue: Clue | null;
  currentRound: 'single' | 'double' | 'final';
  onClose: () => void;
  showAnswer?: boolean;
  buzzerEnabled?: boolean;
  buzzWon?: boolean;
}

export function ClueModal({ clue, currentRound, onClose, showAnswer = false, buzzerEnabled = false, buzzWon = false }: ClueModalProps) {
  const questionRef = useRef<HTMLDivElement>(null);
  const answerRef = useRef<HTMLDivElement>(null);
  const [questionFontSize, setQuestionFontSize] = useState(6); // rem
  const [answerFontSize, setAnswerFontSize] = useState(4.25); // rem

  useEffect(() => {
    const adjustFontSize = () => {
      // Adjust question font size
      if (questionRef.current) {
        const container = questionRef.current.parentElement;
        if (container) {
          let fontSize = window.innerWidth <= 768 ? 3.4 : 6;
          const minFontSize = window.innerWidth <= 768 ? 1.5 : 2.5;

          questionRef.current.style.fontSize = `${fontSize}rem`;

          // Check if content overflows and reduce font size until it fits
          while (
            (questionRef.current.scrollHeight > container.clientHeight ||
            questionRef.current.scrollWidth > container.clientWidth) &&
            fontSize > minFontSize
          ) {
            fontSize -= 0.2;
            questionRef.current.style.fontSize = `${fontSize}rem`;
          }

          setQuestionFontSize(fontSize);
        }
      }

      // Adjust answer font size
      if (showAnswer && answerRef.current) {
        const container = answerRef.current.parentElement;
        if (container) {
          let fontSize = window.innerWidth <= 768 ? 2.55 : 4.25;
          const minFontSize = window.innerWidth <= 768 ? 1.2 : 2;

          answerRef.current.style.fontSize = `${fontSize}rem`;

          // Check if content overflows and reduce font size until it fits
          while (
            (answerRef.current.scrollHeight > container.clientHeight ||
            answerRef.current.scrollWidth > container.clientWidth) &&
            fontSize > minFontSize
          ) {
            fontSize -= 0.2;
            answerRef.current.style.fontSize = `${fontSize}rem`;
          }

          setAnswerFontSize(fontSize);
        }
      }
    };

    // Small delay to ensure content is rendered
    const timeoutId = setTimeout(adjustFontSize, 50);

    // Add resize listener
    window.addEventListener('resize', adjustFontSize);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', adjustFontSize);
    };
  }, [clue, showAnswer]);

  if (!clue) return null;

  // Calculate the correct value based on position and round
  const displayValue = currentRound === 'final'
    ? clue.value
    : getClueValue(clue.position, currentRound);

  return (
    <div className="clue-modal-overlay" onClick={onClose}>
      <div className={`clue-modal ${buzzWon ? 'buzz-won' : buzzerEnabled ? 'buzzer-active' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="clue-value-header">
          {formatCurrency(displayValue)}
        </div>

        <div className="clue-content">
          <div
            ref={questionRef}
            className="clue-question"
            dangerouslySetInnerHTML={{ __html: cleanClueText(clue.question) }}
          />

          {showAnswer && (
            <div className="clue-answer">
              <div className="answer-label">Answer:</div>
              <div
                ref={answerRef}
                className="answer-text"
                dangerouslySetInnerHTML={{ __html: cleanClueText(clue.answer) }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
