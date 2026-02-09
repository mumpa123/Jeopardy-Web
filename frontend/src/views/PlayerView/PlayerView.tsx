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
import { cleanClueText } from '../../utils/formatters';
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
  const [unlockToken, setUnlockToken] = useState<number | null>(null); // Token for validating buzzes
  const [showWagerInput, setShowWagerInput] = useState(false);
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const [currentClue, setCurrentClue] = useState<string>('');
  const [status, setStatus] = useState('Enter your name to join...');
  const [buzzCooldown, setBuzzCooldown] = useState(0); // Cooldown in seconds
  const [cooldownInterval, setCooldownInterval] = useState<NodeJS.Timeout | null>(null);

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

  // Audio ref for FJ music
  const fjMusicAudioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio
  useEffect(() => {
    fjMusicAudioRef.current = new Audio('/final_jeopardy_music.mp3');

    // Cleanup on unmount
    return () => {
      if (fjMusicAudioRef.current) {
        fjMusicAudioRef.current.pause();
        fjMusicAudioRef.current = null;
      }
    };
  }, []);

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
        setCurrentClue(cleanClueText(message.clue.question));
        setCanBuzz(false); // Buzzer locked until host finishes reading
        setBuzzed(false);
        setStatus('Host is reading the clue...');
        // Normal clue, not a DD
        setIsDailyDouble(false);
        setIsMyDailyDouble(false);
        // Clear cooldown for new clue
        setBuzzCooldown(0);
        if (cooldownInterval) {
          clearInterval(cooldownInterval);
          setCooldownInterval(null);
        }
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
        setCurrentClue(cleanClueText(message.clue.question));
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
        // Reset buzzed state so players can buzz again (unless they already attempted)
        setBuzzed(false);
        // Store unlock token for buzz validation
        if (message.unlock_token) {
          setUnlockToken(message.unlock_token);
        }
        // Don't clear cooldown - players must wait full penalty time
        if (buzzCooldown > 0) {
          setStatus(`Buzzer enabled but you're in cooldown - wait ${Math.ceil(buzzCooldown)}s`);
        } else {
          setStatus('You can buzz in now!');
        }
        break;

      case 'buzz_result':
        if (playerNumber && message.player_number === playerNumber) {
          if (message.accepted) {
            setStatus(message.winner === message.player_number ? 'You won the buzz!' : `You were #${message.position} to buzz`);
          } else if (message.position === -3) {
            // Already attempted this clue
            setStatus('You already attempted this clue');
            setBuzzed(false);
            setCanBuzz(false);  // Disable buzzing for this player on this clue
          } else if (message.cooldown) {
            // Buzz rejected due to cooldown or early buzz
            const cooldownTime = Math.ceil(message.cooldown_remaining);
            if (message.position === -2) {
              // Already in cooldown
              setStatus(`Cooldown active - wait ${cooldownTime}s`);
            } else {
              // Early buzz or spam attempt
              setStatus(`Too early! Wait ${cooldownTime}s`);
            }
            // Reset buzzed state so they can try again after cooldown
            setBuzzed(false);
            // Start cooldown timer
            setBuzzCooldown(message.cooldown_remaining);
            startCooldownTimer(message.cooldown_remaining);
          } else {
            setStatus('Buzz rejected - too late');
            // Reset buzzed state in case they want to wait for next clue
            setBuzzed(false);
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
        // Clear cooldown
        setBuzzCooldown(0);
        if (cooldownInterval) {
          clearInterval(cooldownInterval);
          setCooldownInterval(null);
        }
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

      case 'round_changed':
        console.log('[PlayerView] Round changed to:', message.round);
        setCurrentRound(message.round);
        setStatus(`${message.round === 'single' ? 'Single' : 'Double'} Jeopardy started!`);
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
        console.log('[PlayerView] FJ clue revealed - waiting for host to start timer');
        setCurrentClue(cleanClueText(message.clue.question));
        setStatus('Clue revealed! Wait for host to finish reading...');
        // Don't start timer or show answer input yet
        break;

      case 'fj_timer_started':
        console.log('[PlayerView] FJ timer started');
        setFjShowAnswerInput(true);
        setFjTimeRemaining(message.timer_duration);
        setStatus('Type your answer! Timer is running.');
        // Play FJ music
        if (fjMusicAudioRef.current) {
          fjMusicAudioRef.current.currentTime = 0;
          fjMusicAudioRef.current.play().catch(err =>
            console.error('[PlayerView] Failed to play FJ music:', err)
          );
        }
        // Start countdown timer
        const fjTimerInterval = setInterval(() => {
          setFjTimeRemaining(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(fjTimerInterval);
              // Stop music when timer expires
              if (fjMusicAudioRef.current) {
                fjMusicAudioRef.current.pause();
                fjMusicAudioRef.current.currentTime = 0;
              }
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

      case 'game_completed':
        console.log('[PlayerView] Game completed');
        setStatus('Game Completed!');
        // Keys are strings from backend
        if (message.final_scores && message.final_scores[String(playerNumber)]) {
          setScore(message.final_scores[String(playerNumber)]);
        }
        break;

      case 'game_abandoned':
        console.log('[PlayerView] Game abandoned');
        setStatus('Game Abandoned');
        // Keys are strings from backend
        if (message.final_scores && message.final_scores[String(playerNumber)]) {
          setScore(message.final_scores[String(playerNumber)]);
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

  // Start cooldown countdown timer
  const startCooldownTimer = (initialSeconds: number) => {
    // Clear any existing interval
    if (cooldownInterval) {
      clearInterval(cooldownInterval);
    }

    let remainingTime = initialSeconds;

    const interval = setInterval(() => {
      remainingTime -= 0.1; // Update every 100ms for smooth countdown

      if (remainingTime <= 0) {
        setBuzzCooldown(0);
        clearInterval(interval);
        setCooldownInterval(null);
      } else {
        setBuzzCooldown(remainingTime);
      }
    }, 100);

    setCooldownInterval(interval);
  };

  // Clean up cooldown interval on unmount
  useEffect(() => {
    return () => {
      if (cooldownInterval) {
        clearInterval(cooldownInterval);
      }
    };
  }, [cooldownInterval]);

  const handleBuzz = () => {
    // Check if in cooldown
    if (buzzCooldown > 0) {
      setStatus(`Cooldown active - wait ${Math.ceil(buzzCooldown)}s`);
      return;
    }

    // Check if already buzzed for this clue
    if (buzzed) {
      return;
    }

    // Allow buzz attempt even if buzzer not enabled yet (server will enforce and start cooldown)
    if (playerNumber && wsRef.current?.isConnected()) {
      setBuzzed(true); // Prevent multiple rapid clicks

      // Send buzz via WebSocket with unlock token for validation
      wsRef.current.send({
        type: 'buzz',
        player_number: playerNumber,
        timestamp: Date.now(),
        unlock_token: unlockToken  // Include token received from buzzer_enabled
      });
      console.log('Player buzzed with unlock_token:', unlockToken);

      // If buzz was successful (buzzer enabled), update state
      if (canBuzz) {
        setCanBuzz(false);
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
            <p dangerouslySetInnerHTML={{ __html: currentClue }} />
          </div>
        )}

        {/* Buzz Button - Only show if NOT a Daily Double */}
        {!isDailyDouble && !showWagerInput && !showAnswerInput && (
          <div className="buzz-container">
            <BuzzButton
              onBuzz={handleBuzz}
              disabled={!canBuzz}
              buzzed={buzzed}
              cooldown={buzzCooldown}
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
