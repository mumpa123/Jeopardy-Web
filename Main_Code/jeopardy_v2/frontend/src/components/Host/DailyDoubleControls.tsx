import type { DDStage } from '../../types/WebSocket';
import './DailyDoubleControls.css';

interface DailyDoubleControlsProps {
  stage: DDStage;
  playerNumber: number;
  playerName: string;
  wager: number | null;
  submittedAnswer: string | null;
  onRevealDailyDouble: () => void;
  onShowClue: () => void;
  onJudgeCorrect: () => void;
  onJudgeIncorrect: () => void;
}

export function DailyDoubleControls({
  stage,
  playerName,
  wager,
  submittedAnswer,
  onRevealDailyDouble,
  onShowClue,
  onJudgeCorrect,
  onJudgeIncorrect
}: DailyDoubleControlsProps) {
  return (
    <div className="daily-double-controls">
      <div className="dd-header">
        <h3>⭐ DAILY DOUBLE ⭐</h3>
        <p className="dd-player-name">Player: <strong>{playerName}</strong></p>
      </div>

      {/* Stage: Detected - Host hasn't revealed DD yet */}
      {stage === 'detected' && (
        <div className="dd-stage">
          <p className="dd-status">
            Daily Double detected! {playerName} will wager.
          </p>
          <button
            className="dd-reveal-button"
            onClick={onRevealDailyDouble}
          >
            Reveal Daily Double
          </button>
          <p className="dd-hint">Click to show the Daily Double to all players</p>
        </div>
      )}

      {/* Stage: Revealed - Waiting for player to submit wager */}
      {stage === 'revealed' && (
        <div className="dd-stage">
          <p className="dd-status">
            Waiting for {playerName} to submit their wager...
          </p>
          <div className="dd-spinner">⏳</div>
        </div>
      )}

      {/* Stage: Wagering - Wager received, host can show clue */}
      {stage === 'wagering' && wager !== null && (
        <div className="dd-stage">
          <p className="dd-status">
            {playerName} has wagered: <strong className="dd-wager-amount">${wager.toLocaleString()}</strong>
          </p>
          <button
            className="dd-show-clue-button"
            onClick={onShowClue}
          >
            Show Clue
          </button>
          <p className="dd-hint">Reveal the clue question to the player</p>
        </div>
      )}

      {/* Stage: Answering - Player answers verbally, host judges */}
      {stage === 'answering' && (
        <div className="dd-stage">
          <p className="dd-status">
            {playerName} is answering verbally
          </p>
          <p className="dd-hint">Listen to their answer and judge:</p>
          <div className="dd-judge-buttons">
            <button
              className="dd-judge-correct"
              onClick={onJudgeCorrect}
            >
              ✓ Correct
            </button>
            <button
              className="dd-judge-incorrect"
              onClick={onJudgeIncorrect}
            >
              ✗ Incorrect
            </button>
          </div>
        </div>
      )}

      {/* Stage: Judged - Show result and ready for next clue */}
      {stage === 'judged' && (
        <div className="dd-stage">
          <p className="dd-status dd-complete">
            Daily Double complete! Click "Next Clue" to continue.
          </p>
        </div>
      )}
    </div>
  );
}
