import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { Board } from '../../components/Board/Board';
import { ScoreDisplay } from '../../components/ScoreDisplay/ScoreDisplay';
import { BuzzerQueue } from '../../components/Host/BuzzerQueue';
import { ScoreControls } from '../../components/Host/ScoreControls';
import { ClueDetail } from '../../components/Host/ClueDetail';
import { GameControls } from '../../components/Host/GameControls';
import type { Category, Clue } from '../../types/Episode';
import { GameWebSocket } from '../../services/websocket';
import type { IncomingMessage } from '../../types/WebSocket';
import './HostView.css';

// Mock data for testing (same as TestView)
const mockCategories: Category[] = [
  {
    id: 1,
    name: 'SCIENCE',
    round_type: 'single',
    position: 0,
    clues: [
      { id: 1, question: 'This element has the symbol Au', answer: 'What is Gold?', value: 200, position: 0, is_daily_double: false },
      { id: 2, question: 'The powerhouse of the cell', answer: 'What is Mitochondria?', value: 400, position: 1, is_daily_double: false },
      { id: 3, question: 'This planet is known as the Red Planet', answer: 'What is Mars?', value: 600, position: 2, is_daily_double: true },
      { id: 4, question: 'H2O is the chemical formula for this', answer: 'What is Water?', value: 800, position: 3, is_daily_double: false },
      { id: 5, question: 'The study of living organisms', answer: 'What is Biology?', value: 1000, position: 4, is_daily_double: false },
    ]
  },
  {
    id: 2,
    name: 'HISTORY',
    round_type: 'single',
    position: 1,
    clues: [
      { id: 6, question: 'Year the Declaration of Independence was signed', answer: 'What is 1776?', value: 200, position: 0, is_daily_double: false },
      { id: 7, question: 'First President of the United States', answer: 'Who is George Washington?', value: 400, position: 1, is_daily_double: false },
      { id: 8, question: 'This wall fell in 1989', answer: 'What is the Berlin Wall?', value: 600, position: 2, is_daily_double: false },
      { id: 9, question: 'Ancient wonder in Egypt', answer: 'What are the Pyramids?', value: 800, position: 3, is_daily_double: false },
      { id: 10, question: 'Roman emperor when Jesus was born', answer: 'Who is Augustus?', value: 1000, position: 4, is_daily_double: false },
    ]
  },
  {
    id: 3,
    name: 'GEOGRAPHY',
    round_type: 'single',
    position: 2,
    clues: [
      { id: 11, question: 'Capital of France', answer: 'What is Paris?', value: 200, position: 0, is_daily_double: false },
      { id: 12, question: 'Longest river in the world', answer: 'What is the Nile?', value: 400, position: 1, is_daily_double: false },
      { id: 13, question: 'Largest ocean on Earth', answer: 'What is the Pacific?', value: 600, position: 2, is_daily_double: false },
      { id: 14, question: 'Number of continents', answer: 'What is seven?', value: 800, position: 3, is_daily_double: false },
      { id: 15, question: 'Tallest mountain in the world', answer: 'What is Mount Everest?', value: 1000, position: 4, is_daily_double: false },
    ]
  },
  {
    id: 4,
    name: 'LITERATURE',
    round_type: 'single',
    position: 3,
    clues: [
      { id: 16, question: 'Author of Harry Potter series', answer: 'Who is J.K. Rowling?', value: 200, position: 0, is_daily_double: false },
      { id: 17, question: 'Shakespeare\'s tragic prince of Denmark', answer: 'Who is Hamlet?', value: 400, position: 1, is_daily_double: false },
      { id: 18, question: 'Novel about a white whale', answer: 'What is Moby Dick?', value: 600, position: 2, is_daily_double: false },
      { id: 19, question: 'Greek epic about the Trojan War', answer: 'What is the Iliad?', value: 800, position: 3, is_daily_double: false },
      { id: 20, question: 'Dickens novel with Pip as protagonist', answer: 'What is Great Expectations?', value: 1000, position: 4, is_daily_double: false },
    ]
  },
  {
    id: 5,
    name: 'SPORTS',
    round_type: 'single',
    position: 4,
    clues: [
      { id: 21, question: 'Number of players on a baseball team', answer: 'What is nine?', value: 200, position: 0, is_daily_double: false },
      { id: 22, question: 'Sport with love, deuce, and ace', answer: 'What is Tennis?', value: 400, position: 1, is_daily_double: false },
      { id: 23, question: 'The Olympics are held every this many years', answer: 'What is four?', value: 600, position: 2, is_daily_double: false },
      { id: 24, question: 'Country that hosted 2016 Summer Olympics', answer: 'What is Brazil?', value: 800, position: 3, is_daily_double: false },
      { id: 25, question: 'Golf tournament held at Augusta', answer: 'What is The Masters?', value: 1000, position: 4, is_daily_double: false },
    ]
  },
  {
    id: 6,
    name: 'MOVIES',
    round_type: 'single',
    position: 5,
    clues: [
      { id: 26, question: 'Film with "I\'ll be back"', answer: 'What is The Terminator?', value: 200, position: 0, is_daily_double: false },
      { id: 27, question: 'Director of Jaws and E.T.', answer: 'Who is Steven Spielberg?', value: 400, position: 1, is_daily_double: false },
      { id: 28, question: 'Highest-grossing film of all time', answer: 'What is Avatar?', value: 600, position: 2, is_daily_double: false },
      { id: 29, question: 'Film where Jack freezes in the ocean', answer: 'What is Titanic?', value: 800, position: 3, is_daily_double: false },
      { id: 30, question: 'Wizard who lives at Hogwarts', answer: 'Who is Harry Potter?', value: 1000, position: 4, is_daily_double: false },
    ]
  },
];

export function HostView() {
  const { season, episode } = useParams<{ season: string; episode: string }>();
  const [currentRound, setCurrentRound] = useState<'single' | 'double' | 'final'>('single');
  const [gameStatus, setGameStatus] = useState<'waiting' | 'active' | 'completed'>('active');
  const [revealedClues, setRevealedClues] = useState<number[]>([]);
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  // Player state - start with empty players
  const [players, setPlayers] = useState<Array<{ playerNumber: number; playerName: string; score: number }>>([]);

  // Buzzer queue state
  const [buzzQueue, setBuzzQueue] = useState<Array<{ playerNumber: number; playerName: string; timestamp: number }>>([]);

  // WebSocket connection
  const wsRef = useRef<GameWebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    // TODO: In production, fetch game_id from API based on season/episode
    const gameId = '12345678-1234-1234-1234-123456789abc';
    wsRef.current = new GameWebSocket(gameId);

    wsRef.current.connect()
      .then(() => {
        console.log('[HostView] WebSocket connected');
      })
      .catch(error => {
        console.error('[HostView] WebSocket connection failed:', error);
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
  }, [season, episode]);

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (message: IncomingMessage) => {
    console.log('[HostView] Received message:', message);

    switch (message.type) {
      case 'buzz_result':
        if (message.accepted && message.winner) {
          // Add to buzz queue
          const playerName = players.find(p => p.playerNumber === message.player_number)?.playerName || `Player ${message.player_number}`;
          setBuzzQueue(prev => [
            ...prev,
            {
              playerNumber: message.player_number,
              playerName,
              timestamp: message.server_timestamp
            }
          ]);
        }
        break;

      case 'connection_established':
        console.log('[HostView] Game state received:', message.state);
        // Initialize players from state if available
        if (message.scores) {
          const initialPlayers = Object.entries(message.scores).map(([num, score]) => ({
            playerNumber: parseInt(num),
            playerName: `Player ${num}`,
            score: score
          }));
          setPlayers(initialPlayers);
        }
        break;

      case 'player_joined':
        // Add or update player
        setPlayers(prev => {
          const existing = prev.find(p => p.playerNumber === message.player_number);
          if (existing) {
            return prev.map(p =>
              p.playerNumber === message.player_number
                ? { ...p, playerName: message.player_name }
                : p
            );
          } else {
            return [...prev, {
              playerNumber: message.player_number,
              playerName: message.player_name,
              score: 0
            }];
          }
        });
        break;

      case 'game_reset':
        // Reset all game state
        setPlayers(Object.entries(message.players).map(([num, name]) => ({
          playerNumber: parseInt(num),
          playerName: name,
          score: message.scores[parseInt(num)] || 0
        })));
        setRevealedClues([]);
        setSelectedClue(null);
        setShowAnswer(false);
        setBuzzQueue([]);
        setCurrentRound('single');
        break;

      case 'error':
        console.error('[HostView] Error from server:', message.message);
        break;

      default:
        console.log('[HostView] Unhandled message type:', message.type);
    }
  };

  // Convert players array to scores object for ScoreDisplay
  const scores: { [key: number]: number } = {};
  const playerNames: { [key: number]: string } = {};
  players.forEach(p => {
    scores[p.playerNumber] = p.score;
    playerNames[p.playerNumber] = p.playerName;
  });

  const handleClueClick = (clue: Clue) => {
    setSelectedClue(clue);
    setShowAnswer(false);
    setBuzzQueue([]); // Clear buzz queue

    // Send clue reveal message to all clients
    if (wsRef.current?.isConnected()) {
      wsRef.current.send({
        type: 'reveal_clue',
        clue_id: clue.id
      });
    }
  };

  const handleToggleAnswer = () => {
    setShowAnswer(!showAnswer);
  };

  const handleClearBuzzQueue = () => {
    setBuzzQueue([]);
  };

  const handleAdjustScore = (playerNumber: number, amount: number) => {
    setPlayers(players.map(p =>
      p.playerNumber === playerNumber
        ? { ...p, score: p.score + amount }
        : p
    ));
  };

  const handleStartRound = (round: 'single' | 'double' | 'final') => {
    setCurrentRound(round);
    setRevealedClues([]);
    setSelectedClue(null);
    setShowAnswer(false);
    setBuzzQueue([]);
    console.log('Starting round:', round);
  };

  const handleMarkCorrect = () => {
    if (selectedClue && buzzQueue.length > 0) {
      const winner = buzzQueue[0];
      handleAdjustScore(winner.playerNumber, selectedClue.value);

      // Send judge answer message
      if (wsRef.current?.isConnected()) {
        wsRef.current.send({
          type: 'judge_answer',
          player_number: winner.playerNumber,
          correct: true,
          value: selectedClue.value
        });
      }

      console.log('Marked correct for', winner.playerName);
    }
  };

  const handleMarkIncorrect = () => {
    if (selectedClue && buzzQueue.length > 0) {
      const winner = buzzQueue[0];
      handleAdjustScore(winner.playerNumber, -selectedClue.value);

      // Send judge answer message
      if (wsRef.current?.isConnected()) {
        wsRef.current.send({
          type: 'judge_answer',
          player_number: winner.playerNumber,
          correct: false,
          value: selectedClue.value
        });
      }

      // Remove the first player from buzz queue so next player can answer
      setBuzzQueue(prev => prev.slice(1));

      console.log('Marked incorrect for', winner.playerName);
    }
  };

  const handleNextClue = () => {
    if (selectedClue) {
      setRevealedClues([...revealedClues, selectedClue.id]);
    }
    setSelectedClue(null);
    setShowAnswer(false);
    setBuzzQueue([]);

    // Send next_clue message to return to board
    if (wsRef.current?.isConnected()) {
      wsRef.current.send({
        type: 'next_clue'
      });
    }
  };

  const handleEndGame = () => {
    setGameStatus('completed');
    console.log('Game ended');
  };

  const handleResetGame = () => {
    if (confirm('Are you sure you want to reset the game? This will clear all scores and revealed clues.')) {
      if (wsRef.current?.isConnected()) {
        wsRef.current.send({
          type: 'reset_game'
        });
      }
    }
  };

  return (
    <div className="host-view">
      <Header title={`HOST: Season ${season} Episode ${episode}`} subtitle="Control the game from here" />

      <div className="host-content">
        {/* Left Column: Board and Scores */}
        <div className="host-left">
          <ScoreDisplay scores={scores} playerNames={playerNames} />
          <div className="board-container">
            <Board
              categories={mockCategories}
              revealedClues={revealedClues}
              onClueClick={handleClueClick}
              round={currentRound}
            />
          </div>
        </div>

        {/* Right Column: Controls */}
        <div className="host-right">
          <ClueDetail
            clue={selectedClue}
            showAnswer={showAnswer}
            onToggleAnswer={handleToggleAnswer}
          />

          <BuzzerQueue
            buzzQueue={buzzQueue}
            onClear={handleClearBuzzQueue}
          />

          <GameControls
            currentRound={currentRound}
            gameStatus={gameStatus}
            currentClue={selectedClue}
            onStartRound={handleStartRound}
            onMarkCorrect={handleMarkCorrect}
            onMarkIncorrect={handleMarkIncorrect}
            onNextClue={handleNextClue}
            onEndGame={handleEndGame}
          />

          <ScoreControls
            players={players}
            onAdjustScore={handleAdjustScore}
          />
        </div>
      </div>
    </div>
  );
}
