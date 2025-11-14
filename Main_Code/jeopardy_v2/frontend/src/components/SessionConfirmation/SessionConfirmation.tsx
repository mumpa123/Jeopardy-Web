import type { SessionData } from '../../services/sessionManager';
import './SessionConfirmation.css';

interface SessionConfirmationProps {
  sessionData: SessionData;
  onContinue: () => void;
  onNewSession: () => void;
}

export function SessionConfirmation({
  sessionData,
  onContinue,
  onNewSession
}: SessionConfirmationProps) {
  const roleDisplay = sessionData.role === 'host' ? 'Host' :
                      sessionData.role === 'player' ? 'Player' :
                      'Board View';

  return (
    <div className="session-confirmation-overlay">
      <div className="session-confirmation-modal">
        <h2>Continue Session?</h2>

        <div className="session-info">
          <p className="session-role">
            You have an existing session as <strong>{roleDisplay}</strong>
          </p>

          {sessionData.role === 'player' && (
            <p className="session-player-name">
              Player: <strong>{sessionData.displayName}</strong>
            </p>
          )}

          <p className="session-game-id">
            Game ID: <code>{sessionData.gameId}</code>
          </p>
        </div>

        <p className="session-question">
          Would you like to continue this session or start a new one?
        </p>

        <div className="session-buttons">
          <button
            className="continue-button"
            onClick={onContinue}
          >
            Continue Session
          </button>

          <button
            className="new-session-button"
            onClick={onNewSession}
          >
            Start New Session
          </button>
        </div>
      </div>
    </div>
  );
}
