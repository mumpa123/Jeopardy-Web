import { useState, useEffect } from 'react';
import './FinalJeopardyControls.css';

export type FJStage = 'not_started' | 'category_shown' | 'wagering' | 'clue_shown' | 'answering' | 'judging' | 'complete';

interface PlayerAnswer {
  playerNumber: number;
  playerName: string;
  wager: number | null;
  answer: string | null;
  judged: boolean;
  correct?: boolean;
}

interface Clue {
  id: number;
  question: string;
  answer: string;
  value: number;
  category?: string;
}

interface FinalJeopardyControlsProps {
  stage: FJStage;
  category: string | null;
  clue: Clue | null;  // The FJ clue with correct answer
  playerAnswers: PlayerAnswer[];
  timeRemaining: number | null;  // null means timer not started
  onStartFinalJeopardy: () => void;
  onRevealClue: () => void;
  onJudgeAnswer: (playerNumber: number, correct: boolean) => void;
  onShowAnswers?: () => void;  // Manual trigger to show answers for judging
}

export function FinalJeopardyControls({
  stage,
  category,
  clue,
  playerAnswers,
  timeRemaining,
  onStartFinalJeopardy,
  onRevealClue,
  onJudgeAnswer,
  onShowAnswers
}: FinalJeopardyControlsProps) {
  const [allWagersIn, setAllWagersIn] = useState(false);

  // Check if all players have submitted wagers
  useEffect(() => {
    if (playerAnswers.length > 0) {
      const allIn = playerAnswers.every(p => p.wager !== null);
      setAllWagersIn(allIn);
    }
  }, [playerAnswers]);

  return (
    <div className="final-jeopardy-controls">
      <div className="fj-header">
        <h3>🏆 FINAL JEOPARDY 🏆</h3>
      </div>

      {/* Stage: Not Started */}
      {stage === 'not_started' && (
        <div className="fj-stage">
          <p className="fj-status">
            Ready to start Final Jeopardy?
          </p>
          <button
            className="fj-start-button"
            onClick={onStartFinalJeopardy}
          >
            Start Final Jeopardy
          </button>
          <p className="fj-hint">This will show the category to all players</p>
        </div>
      )}

      {/* Stage: Category Shown - Waiting for wagers */}
      {stage === 'category_shown' && (
        <div className="fj-stage">
          <div className="fj-category-display">
            <p className="fj-label">Category:</p>
            <h2 className="fj-category">{category}</h2>
          </div>
          <p className="fj-status">Waiting for all players to submit their wagers...</p>

          <div className="fj-wager-status">
            {playerAnswers.map(player => (
              <div key={player.playerNumber} className="player-wager-status">
                <span className="player-name">{player.playerName}:</span>
                {player.wager !== null ? (
                  <span className="wager-in">✓ ${player.wager.toLocaleString()}</span>
                ) : (
                  <span className="wager-pending">⏳ Wagering...</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage: Wagering - All wagers in, ready to reveal */}
      {stage === 'wagering' && (
        <div className="fj-stage">
          <div className="fj-category-display">
            <p className="fj-label">Category:</p>
            <h2 className="fj-category">{category}</h2>
          </div>
          <p className="fj-status">All wagers are in!</p>

          <div className="fj-wager-status">
            {playerAnswers.map(player => (
              <div key={player.playerNumber} className="player-wager-status">
                <span className="player-name">{player.playerName}:</span>
                <span className="wager-in">${player.wager?.toLocaleString()}</span>
              </div>
            ))}
          </div>

          <button
            className="fj-reveal-button"
            onClick={onRevealClue}
          >
            Reveal Clue
          </button>
          <p className="fj-hint">This will show the clue and start the 30-second timer</p>
        </div>
      )}

      {/* Stage: Clue Shown / Answering - Timer running */}
      {(stage === 'clue_shown' || stage === 'answering') && (
        <div className="fj-stage">
          {/* Display the clue question */}
          {clue && (
            <div className="fj-clue-display">
              <p className="fj-clue-label">Final Jeopardy Clue:</p>
              <div className="fj-clue-question">{clue.question}</div>
            </div>
          )}

          <div className="fj-timer-display">
            {timeRemaining !== null && timeRemaining > 0 ? (
              <>
                <p className="fj-label">Time Remaining:</p>
                <div className={`fj-timer ${timeRemaining <= 10 ? 'urgent' : ''}`}>
                  {timeRemaining}s
                </div>
              </>
            ) : (
              <>
                <p className="fj-status">Time's up!</p>
                {onShowAnswers && (
                  <button
                    className="fj-reveal-button"
                    onClick={onShowAnswers}
                    style={{ marginTop: '1rem' }}
                  >
                    Show Answers for Judging
                  </button>
                )}
              </>
            )}
          </div>

          <div className="fj-answer-status">
            {playerAnswers.map(player => (
              <div key={player.playerNumber} className="player-answer-status">
                <span className="player-name">{player.playerName}:</span>
                {player.answer ? (
                  <span className="answer-submitted">✓ Answer submitted</span>
                ) : (
                  <span className="answer-pending">⏳ Thinking...</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage: Judging - Show answers and judge buttons */}
      {stage === 'judging' && (
        <div className="fj-stage">
          <p className="fj-status">Judge each player's answer:</p>

          {/* Show the correct answer */}
          {clue && (
            <div className="fj-correct-answer-box">
              <p className="fj-correct-label">Correct Answer:</p>
              <div className="fj-correct-answer">{clue.answer}</div>
            </div>
          )}

          <div className="fj-judging-list">
            {playerAnswers.map(player => (
              <div key={player.playerNumber} className="fj-judging-item">
                <div className="player-info">
                  <h4>{player.playerName}</h4>
                  <p className="player-wager">Wagered: ${player.wager?.toLocaleString()}</p>
                </div>

                <div className="player-answer-display">
                  <p className="answer-label">Player's Answer:</p>
                  <div className="answer-text">"{player.answer || "No answer"}"</div>
                </div>

                {!player.judged ? (
                  <div className="fj-judge-buttons">
                    <button
                      className="fj-judge-correct"
                      onClick={() => onJudgeAnswer(player.playerNumber, true)}
                    >
                      ✓ Correct
                    </button>
                    <button
                      className="fj-judge-incorrect"
                      onClick={() => onJudgeAnswer(player.playerNumber, false)}
                    >
                      ✗ Incorrect
                    </button>
                  </div>
                ) : (
                  <div className={`fj-judged ${player.correct ? 'correct' : 'incorrect'}`}>
                    {player.correct ? '✓ Marked Correct' : '✗ Marked Incorrect'}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage: Complete */}
      {stage === 'complete' && (
        <div className="fj-stage">
          <p className="fj-status fj-complete">
            Final Jeopardy complete! Check the scores to see the winner!
          </p>
        </div>
      )}
    </div>
  );
}
