import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { BuzzButton } from '../../components/Player/BuzzButton';
import { WagerInput } from '../../components/Player/WagerInput';
import { AnswerInput } from '../../components/Player/AnswerInput';
import { SessionConfirmation } from '../../components/SessionConfirmation/SessionConfirmation';
import { GameWebSocket } from '../../services/websocket';
import type { IncomingMessage } from '../../types/WebSocket';
import { api } from '../../services/api';
import { getSession, saveSession, clearSession, type SessionData } from '../../services/sessionManager';
import './PlayerView.css';

export function PlayerView() {
  const { gameId, playerName: urlPlayerName, playerNumber: urlPlayerNumber } = useParams<{ gameId: string; playerName: string; playerNumber: string }>();
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState(urlPlayerName || '');
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [canBuzz, setCanBuzz] = useState(false);
  const [buzzed, setBuzzed] = useState(false);
  const [showWagerInput, setShowWagerInput] = useState(false);
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const [currentClue, setCurrentClue] = useState<string>('');
  const [status, setStatus] = useState('Enter your name to join...');

  // Daily Double state
  const [isDailyDouble, setIsDailyDouble] = useState(false);
  const [isMyDailyDouble, setIsMyDailyDouble] = useState(false);
  const [currentRound, setCurrentRound] = useState<'single' | 'double'>('single');

  // Final Jeopardy state
  const [isFinalJeopardy, setIsFinalJeopardy] = useState(false);
  const [fjCategory, setFjCategory] = useState<string | null>(null);
  const [fjShowWagerInput, setFjShowWagerInput] = useState(false);
  const [fjShowAnswerInput, setFjShowAnswerInput] = useState(false);
  const [fjTimeRemaining, setFjTimeRemaining] = useState<number | null>(null);
  const [fjWagerSubmitted, setFjWagerSubmitted] = useState(false);
  const [fjAnswerSubmitted, setFjAnswerSubmitted] = useState(false);

  // Session recovery state
  const [showSessionConfirmation, setShowSessionConfirmation] = useState(false);
  const [existingSession, setExistingSession] = useState<SessionData | null>(null);
  const [isValidatingSession, setIsValidatingSession] = useState(true);

  // WebSocket connection
  const wsRef = useRef<GameWebSocket | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const validateExistingSession = async () => {
      if (!gameId) {
        setIsValidatingSession(false);
        return;
      }

      console.log('[PlayerView] Checking for existing session...');

      const session = getSession('player', gameId);

      // No session exists
      if (!session) {
        console.log('[PlayerView] No existing session found');
        setIsValidatingSession(false);
        return;
      }

      console.log('[PlayerView] Found existing session:', session);

      // Validate session with backend
      try {
        const gameValidation = await api.games.validate(gameId);
        if (!gameValidation.valid) {
          console.log('[PlayerView] Game no longer exists, clearing session');
          clearSession('player', gameId);
          navigate('/lobby');
          return;
        }

        const playerValidation = await api.games.validatePlayer(gameId, session.playerId);
        if (!playerValidation.valid) {
          console.log('[PlayerView] Player no longer in game, clearing session');
          clearSession('player', gameId);
          setIsValidatingSession(false);
          return;
        }

        // Session is valid - show confirmation modal
        console.log('[PlayerView] Session is valid, showing confirmation');
        setExistingSession(session);
        setShowSessionConfirmation(true);
        setIsValidatingSession(false);
      } catch (error) {
        console.error('[PlayerView] Session validation error:', error);
        clearSession('player', gameId);
        setIsValidatingSession(false);
      }
    };

    validateExistingSession();
  }, [gameId, navigate]);

  // Handle continuing existing session
  const handleContinueSession = () => {
    if (!existingSession) return;

    console.log('[PlayerView] Continuing existing session');
    setPlayerName(existingSession.displayName);
    setPlayerNumber(existingSession.playerNumber);
    setPlayerId(existingSession.playerId);
    setHasJoined(true);
    setShowSessionConfirmation(false);
    setStatus('Rejoined game - reconnecting...');
  };

  // Handle starting new session
  const handleNewSession = () => {
    if (!gameId) return;
    console.log('[PlayerView] Starting new session');
    clearSession('player', gameId);
    setExistingSession(null);
    setShowSessionConfirmation(false);
  };

  // Handle joining the game
  const handleJoinGame = async () => {
    if (!gameId || !playerName.trim()) {
      setJoinError('Please enter a name');
      return;
    }

    setIsJoining(true);
    setJoinError(null);

    try {
      console.log('[PlayerView] Joining game as:', playerName);

      // Call API to join game
      const participant = await api.games.join(gameId, {
        display_name: playerName.trim()
      });

      console.log('[PlayerView] Successfully joined game:', participant);
      setPlayerNumber(participant.player_number);
      setPlayerId(participant.player);
      setHasJoined(true);
      setStatus('Joined game - waiting for host to start');

      // Save session to localStorage
      saveSession({
        playerId: participant.player,
        guestSession: participant.player.toString(), // We'll store player ID as session
        gameId: gameId,
        playerNumber: participant.player_number,
        role: 'player',
        displayName: playerName.trim(),
        timestamp: Date.now()
      });

      console.log('[PlayerView] Session saved to localStorage');

    } catch (error) {
      console.error('[PlayerView] Failed to join game:', error);
      setJoinError(error instanceof Error ? error.message : 'Failed to join game');
      setStatus('Join failed');
    } finally {
      setIsJoining(false);
    }
  };

  // Initialize WebSocket connection after joining
  useEffect(() => {
    if (!gameId || !hasJoined) {
      return;
    }

    console.log('[PlayerView] Initializing WebSocket connection');

    wsRef.current = new GameWebSocket(gameId);

    wsRef.current.connect()
      .then(() => {
        console.log('[PlayerView] WebSocket connected to game:', gameId);
        setStatus('Connected to game');
      })
      .catch(error => {
        console.error('[PlayerView] WebSocket connection failed:', error);
        setStatus('Connection failed');
      });

    // Register message handler
    const unsubscribe = wsRef.current.onMessage((message: IncomingMessage) => {
      handleWebSocketMessage(message);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe();
      wsRef.current?.close();
    };
  }, [gameId, hasJoined]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (message: IncomingMessage) => {
    console.log('[PlayerView] Received message:', message);

    switch (message.type) {
      case 'connection_established':
        setStatus('Game ready');
        if (message.scores && playerNumber) {
          setScore(message.scores[String(playerNumber)] || 0);
        }
        // Extract current round from state if available
        if (message.state && message.state.current_round) {
          setCurrentRound(message.state.current_round);
        }
        break;

      case 'clue_revealed':
        setCurrentClue(message.clue.question);
        setCanBuzz(false); // Buzzer locked until host finishes reading
        setBuzzed(false);
        setStatus('Host is reading the clue...');
        // Normal clue, not a DD
        setIsDailyDouble(false);
        setIsMyDailyDouble(false);
        break;

      case 'daily_double_detected':
        // DD detected - Player can wager immediately!
        setCurrentClue(''); // Clear any previous clue
        setIsDailyDouble(true);
        setIsMyDailyDouble(message.player_number === playerNumber);
        setCanBuzz(false);
        if (message.player_number === playerNumber) {
          setShowWagerInput(true); // Show wager input immediately
          setStatus('⭐ Daily Double! Enter your wager:');
        } else {
          setStatus(`⭐ Daily Double! ${message.player_name || 'Player ' + message.player_number} is wagering...`);
        }
        break;

      case 'daily_double_revealed':
        // DD revealed - this happens before wager but we're skipping it now
        // Just update status for non-DD players if needed
        if (message.player_number !== playerNumber) {
          setStatus(`⭐ Daily Double! ${message.player_name} is wagering...`);
        }
        break;

      case 'wager_submitted':
        // Wager has been submitted - wait for host to show clue
        setShowWagerInput(false);
        if (message.player_number === playerNumber) {
          setStatus('Wager submitted! Waiting for host to reveal clue...');
        } else {
          setStatus('Wager submitted. Waiting for clue...');
        }
        break;

      case 'dd_clue_shown':
        // Host has revealed the clue - NOW show it!
        setCurrentClue(message.clue.question);
        if (message.player_number === playerNumber) {
          setStatus('Give your answer verbally to the host!');
        } else {
          setStatus('Clue revealed. Waiting for answer...');
        }
        break;

      case 'dd_answer_judged':
        // DD judged - update score
        if (playerNumber && message.player_number === playerNumber) {
          setScore(message.new_score);
          setStatus(message.correct ? `Correct! +$${message.wager}` : `Incorrect. -$${message.wager}`);
        }
        // Clear DD state
        setIsDailyDouble(false);
        setIsMyDailyDouble(false);
        break;

      case 'buzzer_enabled':
        setCanBuzz(true);
        setStatus('You can buzz in now!');
        break;

      case 'buzz_result':
        if (playerNumber && message.player_number === playerNumber) {
          if (message.accepted) {
            setStatus(message.winner === message.player_number ? 'You won the buzz!' : `You were #${message.position} to buzz`);
          } else {
            setStatus('Buzz rejected - too late');
          }
        }
        break;

      case 'answer_judged':
        if (playerNumber && message.player_number === playerNumber) {
          setScore(message.new_score);
          setStatus(message.correct ? 'Correct!' : 'Incorrect');
          setBuzzed(false);
          setCanBuzz(false);
        }
        break;

      case 'return_to_board':
        setCurrentClue('');
        setCanBuzz(false);
        setBuzzed(false);
        setStatus('Waiting for next clue...');
        // Clear DD state
        setIsDailyDouble(false);
        setIsMyDailyDouble(false);
        setShowWagerInput(false);
        setShowAnswerInput(false);
        if (message.scores && playerNumber) {
          setScore(message.scores[String(playerNumber)] || 0);
        }
        break;

      case 'game_reset':
        console.log('[PlayerView] Game reset broadcast received');
        // Reset player state
        setScore(0);
        setCurrentClue('');
        setCanBuzz(false);
        setBuzzed(false);
        setShowWagerInput(false);
        setShowAnswerInput(false);
        setIsDailyDouble(false);
        setIsMyDailyDouble(false);
        setStatus('Game has been reset');
        break;

      case 'score_adjusted':
        console.log('[PlayerView] Score adjusted broadcast received');
        // Update score if it's for this player
        if (playerNumber && message.player_number === playerNumber) {
          setScore(message.new_score);
          console.log(`[PlayerView] Score updated to ${message.new_score}`);
        }
        break;

      case 'fj_category_shown':
        console.log('[PlayerView] Final Jeopardy category shown:', message.category);
        setIsFinalJeopardy(true);
        setFjCategory(message.category);
        setFjShowWagerInput(true);
        setFjWagerSubmitted(false);
        setFjAnswerSubmitted(false);
        setCanBuzz(false);
        setCurrentClue('');
        setStatus('Final Jeopardy! Enter your wager.');
        break;

      case 'fj_wager_submitted':
        console.log('[PlayerView] FJ wager submitted by player:', message.player_number);
        if (playerNumber && message.player_number === playerNumber) {
          setFjShowWagerInput(false);
          setFjWagerSubmitted(true);
          setStatus('Wager submitted! Waiting for host to reveal clue...');
        }
        break;

      case 'fj_clue_revealed':
        console.log('[PlayerView] FJ clue revealed, timer started');
        setCurrentClue(message.clue.question);
        setFjShowAnswerInput(true);
        setFjTimeRemaining(message.timer_duration);
        setStatus('Type your answer! Timer is running.');
        // Start countdown timer
        const fjTimerInterval = setInterval(() => {
          setFjTimeRemaining(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(fjTimerInterval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        break;

      case 'fj_answer_submitted':
        console.log('[PlayerView] FJ answer submitted by player:', message.player_number);
        if (playerNumber && message.player_number === playerNumber) {
          setFjShowAnswerInput(false);
          setFjAnswerSubmitted(true);
          setStatus('Answer submitted! Waiting for host to judge...');
        }
        break;

      case 'fj_answer_judged':
        console.log('[PlayerView] FJ answer judged:', message.player_number, message.correct);
        if (playerNumber && message.player_number === playerNumber) {
          setScore(message.new_score);
          setStatus(message.correct ? `Correct! +$${message.wager}` : `Incorrect. -$${message.wager}`);
        }
        break;

      case 'error':
        console.error('[PlayerView] Error from server:', message.message);
        setStatus(`Error: ${message.message}`);
        break;

      default:
        console.log('[PlayerView] Unhandled message type:', message.type);
    }
  };

  const handleBuzz = () => {
    if (canBuzz && !buzzed && playerNumber) {
      setBuzzed(true);
      setCanBuzz(false);

      // Send buzz via WebSocket
      if (wsRef.current?.isConnected()) {
        wsRef.current.send({
          type: 'buzz',
          player_number: playerNumber,
          timestamp: Date.now()
        });
        console.log('Player buzzed!');
      }
    }
  };

  const handleWagerSubmit = (wager: number) => {
    if (wsRef.current?.isConnected() && playerNumber) {
      wsRef.current.send({
        type: 'submit_wager',
        player_number: playerNumber,
        wager: wager
      });
      console.log('[PlayerView] Wager submitted:', wager);
    }
  };

  const handleAnswerSubmit = (answer: string) => {
    if (wsRef.current?.isConnected() && playerNumber) {
      wsRef.current.send({
        type: 'submit_dd_answer',
        player_number: playerNumber,
        answer: answer
      });
      console.log('[PlayerView] DD answer submitted:', answer);
    }
  };

  const handleFJWagerSubmit = (wager: number) => {
    console.log('[PlayerView] handleFJWagerSubmit called with wager:', wager);
    console.log('[PlayerView] WebSocket connected?', wsRef.current?.isConnected());
    console.log('[PlayerView] Player number:', playerNumber);
    if (wsRef.current?.isConnected() && playerNumber) {
      wsRef.current.send({
        type: 'submit_fj_wager',
        player_number: playerNumber,
        wager: wager
      });
      console.log('[PlayerView] FJ wager message sent to backend');
    } else {
      console.error('[PlayerView] Cannot send FJ wager - WS not connected or no player number');
    }
  };

  const handleFJAnswerSubmit = (answer: string) => {
    console.log('[PlayerView] handleFJAnswerSubmit called with answer:', answer);
    console.log('[PlayerView] WebSocket connected?', wsRef.current?.isConnected());
    console.log('[PlayerView] Player number:', playerNumber);
    if (wsRef.current?.isConnected() && playerNumber) {
      wsRef.current.send({
        type: 'submit_fj_answer',
        player_number: playerNumber,
        answer: answer
      });
      console.log('[PlayerView] FJ answer message sent to backend');
    } else {
      console.error('[PlayerView] Cannot send FJ answer - WS not connected or no player number');
    }
  };

  // Calculate max wager for Daily Double
  const calculateMaxWager = () => {
    const minWager = 5;
    const maxClueValue = currentRound === 'single' ? 1000 : 2000;
    return Math.max(maxClueValue, score);
  };

  // Show session confirmation modal if existing session found
  if (showSessionConfirmation && existingSession) {
    return (
      <SessionConfirmation
        sessionData={existingSession}
        onContinue={handleContinueSession}
        onNewSession={handleNewSession}
      />
    );
  }

  // Show loading while validating session
  if (isValidatingSession) {
    return (
      <div className="player-view">
        <Header title="Validating Session" subtitle="Please wait..." />
        <div className="player-content" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Checking for existing session...</p>
        </div>
      </div>
    );
  }

  // Show join screen if not joined yet
  if (!hasJoined) {
    return (
      <div className="player-view">
        <Header title="Join Game" subtitle={`Game: ${gameId?.slice(0, 8)}...`} />

        <div className="player-content" style={{ maxWidth: '500px', margin: '2rem auto' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
            <h2 style={{ color: '#2c3e50', marginBottom: '1.5rem' }}>Enter Your Name</h2>

            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
              placeholder="Enter your name..."
              disabled={isJoining}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1.2rem',
                border: '2px solid #dee2e6',
                borderRadius: '8px',
                marginBottom: '1rem'
              }}
            />

            {joinError && (
              <div style={{ color: '#e74c3c', marginBottom: '1rem', padding: '0.5rem', background: '#ffe8e8', borderRadius: '4px' }}>
                {joinError}
              </div>
            )}

            <button
              onClick={handleJoinGame}
              disabled={isJoining || !playerName.trim()}
              style={{
                width: '100%',
                padding: '1rem',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                background: isJoining || !playerName.trim() ? '#95a5a6' : 'linear-gradient(135deg, #e74c3c, #c0392b)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: isJoining || !playerName.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {isJoining ? 'Joining...' : 'Join Game'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="player-view">
      <Header title={`Player: ${playerName}`} subtitle={`Player ${playerNumber}`} />

      <div className="player-content">
        {/* Player Score */}
        <div className="player-score-display">
          <h2>Your Score</h2>
          <div className="player-score">${score.toLocaleString()}</div>
        </div>

        {/* Game Status */}
        <div className="player-status">
          <p>{status}</p>
        </div>

        {/* Current Clue (if active) */}
        {currentClue && (
          <div className="current-clue-display">
            <p>{currentClue}</p>
          </div>
        )}

        {/* Buzz Button - Only show if NOT a Daily Double */}
        {!isDailyDouble && !showWagerInput && !showAnswerInput && (
          <div className="buzz-container">
            <BuzzButton
              onBuzz={handleBuzz}
              disabled={!canBuzz}
              buzzed={buzzed}
            />
          </div>
        )}

        {/* Daily Double message for other players */}
        {isDailyDouble && !isMyDailyDouble && (
          <div className="dd-spectator-message">
            <h2>⭐ DAILY DOUBLE ⭐</h2>
            <p>{status}</p>
          </div>
        )}

        {/* Wager Input - Show for Daily Double when it's my turn */}
        {showWagerInput && isMyDailyDouble && (
          <div className="dd-input-section">
            <h2>⭐ DAILY DOUBLE ⭐</h2>
            <p className="dd-instruction">Enter your wager:</p>
            <WagerInput
              maxWager={calculateMaxWager()}
              onSubmit={handleWagerSubmit}
              disabled={false}
            />
          </div>
        )}

        {/* Answer Input - Show for Daily Double when it's my turn */}
        {showAnswerInput && isMyDailyDouble && (
          <div className="dd-input-section">
            <h2>⭐ DAILY DOUBLE ⭐</h2>
            <p className="dd-instruction">Type your answer:</p>
            <AnswerInput
              onSubmit={handleAnswerSubmit}
              disabled={false}
            />
          </div>
        )}

        {/* Final Jeopardy Section */}
        {isFinalJeopardy && (
          <div className="fj-section">
            <h2 className="fj-title">🏆 FINAL JEOPARDY 🏆</h2>

            {/* Show category */}
            {fjCategory && (
              <div className="fj-category-display">
                <p className="fj-label">Category:</p>
                <h3 className="fj-category">{fjCategory}</h3>
              </div>
            )}

            {/* FJ Wager Input */}
            {fjShowWagerInput && !fjWagerSubmitted && (
              <div className="fj-input-section">
                <p className="fj-instruction">Enter your Final Jeopardy wager:</p>
                <WagerInput
                  maxWager={Math.max(score, 0)}
                  onSubmit={handleFJWagerSubmit}
                  disabled={false}
                />
              </div>
            )}

            {/* Waiting for clue */}
            {fjWagerSubmitted && !fjShowAnswerInput && (
              <div className="fj-waiting">
                <p>{status}</p>
              </div>
            )}

            {/* Timer display */}
            {fjTimeRemaining !== null && fjTimeRemaining > 0 && (
              <div className="fj-timer-display">
                <p className="fj-timer-label">Time Remaining:</p>
                <div className={`fj-timer ${fjTimeRemaining <= 10 ? 'urgent' : ''}`}>
                  {fjTimeRemaining}s
                </div>
              </div>
            )}

            {/* FJ Answer Input */}
            {fjShowAnswerInput && !fjAnswerSubmitted && (
              <div className="fj-input-section">
                <p className="fj-instruction">Enter your answer:</p>
                <AnswerInput
                  onSubmit={handleFJAnswerSubmit}
                  disabled={false}
                />
              </div>
            )}

            {/* Waiting for judgment */}
            {fjAnswerSubmitted && (
              <div className="fj-waiting">
                <p>{status}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
