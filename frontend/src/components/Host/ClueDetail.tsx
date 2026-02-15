import type { Clue } from "../../types/Episode";
import { formatCurrency, getClueValue, cleanClueText } from "../../utils/formatters";
import "./ClueDetail.css";

interface ClueDetailProps {
  clue: Clue | null;
  currentRound: "single" | "double" | "final";
  showAnswer: boolean;
  buzzerEnabled: boolean;
  isReading?: boolean;
  autoPlayTTS?: boolean;
  onToggleAnswer: () => void;
  onNextClue: () => void;
  onEnableBuzzer: () => void;
  onMarkCorrect: () => void;
  onMarkIncorrect: () => void;
  onReadAloud?: () => void;
  onToggleAutoPlay?: (enabled: boolean) => void;
}

export function ClueDetail({
  clue,
  currentRound,
  showAnswer,
  buzzerEnabled,
  isReading = false,
  autoPlayTTS = false,
  onToggleAnswer,
  onNextClue,
  onEnableBuzzer,
  onMarkCorrect,
  onMarkIncorrect,
  onReadAloud,
  onToggleAutoPlay
}: ClueDetailProps) {
  if (!clue) {
    return (
      <div className="clue-detail empty">
        <p>No clue selected. Click a clue on the board to begin.</p>
      </div>
    );
  }

  // Calculate the correct value based on position and round
  const displayValue = currentRound === "final"
    ? clue.value
    : getClueValue(clue.position, currentRound);

  return (
    <div className="clue-detail">
      <div className="clue-header">
        <div className="clue-value">{formatCurrency(displayValue)}</div>
        {clue.is_daily_double && (
          <div className="daily-double-badge">DAILY DOUBLE</div>
        )}
      </div>

      <div className="clue-question">
        <h4>Question:</h4>
        <p dangerouslySetInnerHTML={{ __html: cleanClueText(clue.question) }} />
      </div>

      {/* TTS Controls - Show when buzzer not enabled */}
      {!buzzerEnabled && !showAnswer && (
        <div className="tts-controls">
          {/* Toggle Switch */}
          {onToggleAutoPlay && (
            <div className="tts-toggle-container">
              <label className="tts-toggle-label">
                <span className="tts-icon">{autoPlayTTS ? "🔊" : "🔇"}</span>
                Auto-read clues
              </label>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={autoPlayTTS}
                  onChange={(e) => onToggleAutoPlay(e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          )}

          {/* TTS Status Indicator */}
          {isReading && (
            <div className="tts-status">
              <span className="tts-status-icon">🔊</span>
              Reading clue...
            </div>
          )}

          {/* Manual Read Button - only show when auto-play is OFF and TTS is NOT currently playing */}
          {!autoPlayTTS && !isReading && onReadAloud && (
            <button
              onClick={onReadAloud}
              className="read-aloud-button"
            >
              🔊 Read Aloud
            </button>
          )}

          {/* Finished Reading Button - only show when auto-play is OFF */}
          {!autoPlayTTS && (
            <button
              className="finished-reading-button"
              onClick={onEnableBuzzer}
              disabled={isReading}
            >
              ✓ Finished Reading
            </button>
          )}
        </div>
      )}

      {/* Judge Answer Section */}
      <div className="judge-answer-section">
        <h4>Judge Answer</h4>
        <div className="judgment-buttons">
          <button
            className="judgment-button correct"
            onClick={onMarkCorrect}
          >
            ✓ Correct
          </button>
          <button
            className="judgment-button incorrect"
            onClick={onMarkIncorrect}
          >
            ✗ Incorrect
          </button>
        </div>
      </div>

      <div className="clue-answer-section">
        <div className="clue-buttons">
          <button
            className={`toggle-answer-button ${showAnswer ? "showing" : ""}`}
            onClick={onToggleAnswer}
          >
            {showAnswer ? "Hide Answer" : "Show Answer"}
          </button>
          <button
            className="next-clue-button"
            onClick={onNextClue}
          >
            Next Clue
          </button>
        </div>

        {showAnswer && (
          <div className="clue-answer">
            <h4>Answer:</h4>
            <p dangerouslySetInnerHTML={{ __html: cleanClueText(clue.answer) }} />
          </div>
        )}
      </div>
    </div>
  );
}
