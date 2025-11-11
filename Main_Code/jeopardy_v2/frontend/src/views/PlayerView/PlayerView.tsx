import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { BuzzButton } from '../../components/Player/BuzzButton';
import { WagerInput } from '../../components/Player/WagerInput';
import { AnswerInput } from '../../components/Player/AnswerInput';
import { GameWebSocket } from '../../services/websocket';
import type { IncomingMessage } from '../../types/WebSocket';
import './PlayerView.css';

export function PlayerView() {
  const { playerName, playerNumber } = useParams<{ playerName: string; playerNumber: string }>();
  const [score, setScore] = useState(0);
  const [canBuzz, setCanBuzz] = useState(false);
  const [buzzed, setBuzzed] = useState(false);
  const [showWagerInput, setShowWagerInput] = useState(false);
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const [currentClue, setCurrentClue] = useState<string>('');
  const [status, setStatus] = useState('Waiting for game to start...');

  // WebSocket connection
  const wsRef = useRef<GameWebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    // TODO: In production, fetch game_id from API or route params
    const gameId = '12345678-1234-1234-1234-123456789abc';
    wsRef.current = new GameWebSocket(gameId);

    wsRef.current.connect()
      .then(() => {
        console.log('[PlayerView] WebSocket connected');
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
  }, []);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (message: IncomingMessage) => {
    console.log('[PlayerView] Received message:', message);

    switch (message.type) {
      case 'connection_established':
        setStatus('Game ready');
        if (message.scores && playerNumber) {
          const playerNum = parseInt(playerNumber);
          setScore(message.scores[playerNum] || 0);
        }
        break;

      case 'clue_revealed':
        setCurrentClue(message.clue.question);
        setCanBuzz(true);
        setBuzzed(false);
        setStatus('Clue revealed - you can buzz in!');
        break;

      case 'buzz_result':
        if (message.player_number === parseInt(playerNumber || '0')) {
          if (message.accepted) {
            setStatus(message.winner === message.player_number ? 'You won the buzz!' : `You were #${message.position} to buzz`);
          } else {
            setStatus('Buzz rejected - too late');
          }
        }
        break;

      case 'answer_judged':
        if (message.player_number === parseInt(playerNumber || '0')) {
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
        if (message.scores && playerNumber) {
          const playerNum = parseInt(playerNumber);
          setScore(message.scores[playerNum] || 0);
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
    if (canBuzz && !buzzed) {
      setBuzzed(true);
      setCanBuzz(false);

      // Send buzz via WebSocket
      if (wsRef.current?.isConnected() && playerNumber) {
        wsRef.current.send({
          type: 'buzz',
          player_number: parseInt(playerNumber),
          timestamp: Date.now()
        });
        console.log('Player buzzed!');
      }
    }
  };

  const handleWagerSubmit = (wager: number) => {
    // TODO: Send wager via WebSocket
    console.log('Wager submitted:', wager);
    setShowWagerInput(false);
    setShowAnswerInput(true);
  };

  const handleAnswerSubmit = (answer: string) => {
    // TODO: Send answer via WebSocket
    console.log('Answer submitted:', answer);
    setShowAnswerInput(false);
  };

  return (
    <div className="player-view">
      <Header title={`Player: ${playerName || 'Unknown'}`} subtitle={`Player ${playerNumber}`} />

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

        {/* Buzz Button */}
        {!showWagerInput && !showAnswerInput && (
          <div className="buzz-container">
            <BuzzButton
              onBuzz={handleBuzz}
              disabled={!canBuzz}
              buzzed={buzzed}
            />
          </div>
        )}

        {/* Wager Input (Daily Double / Final Jeopardy) */}
        {showWagerInput && (
          <WagerInput
            maxWager={Math.max(1000, score)}
            onSubmit={handleWagerSubmit}
            disabled={false}
          />
        )}

        {/* Answer Input */}
        {showAnswerInput && (
          <AnswerInput
            onSubmit={handleAnswerSubmit}
            disabled={false}
          />
        )}
      </div>
    </div>
  );
}
