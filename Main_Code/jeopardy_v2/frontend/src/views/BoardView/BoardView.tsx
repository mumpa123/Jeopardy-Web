import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { ScoreDisplay } from '../../components/ScoreDisplay/ScoreDisplay';
import { Board } from '../../components/Board/Board';
import { ClueModal } from '../../components/Board/ClueModal';
import type { Category, Clue } from '../../types/Episode';
import { GameWebSocket } from '../../services/websocket';
import type { IncomingMessage } from '../../types/WebSocket';
import './BoardView.css';

// Mock data for testing (same as HostView)
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

export function BoardView() {
  const { season, episode } = useParams<{ season: string; episode: string }>();
  const [categories] = useState<Category[]>(mockCategories);
  const [revealedClues, setRevealedClues] = useState<number[]>([]);
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [scores, setScores] = useState<Record<number, number>>({ 1: 2400, 2: -800, 3: 1600 });
  const [playerNames] = useState<Record<number, string>>({ 1: 'Alice', 2: 'Bob', 3: 'Charlie' });

  // WebSocket connection
  const wsRef = useRef<GameWebSocket | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    // TODO: In production, fetch game_id from API based on season/episode
    const gameId = '12345678-1234-1234-1234-123456789abc';
    wsRef.current = new GameWebSocket(gameId);

    wsRef.current.connect()
      .then(() => {
        console.log('[BoardView] WebSocket connected');
      })
      .catch(error => {
        console.error('[BoardView] WebSocket connection failed:', error);
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
    console.log('[BoardView] Received message:', message);

    switch (message.type) {
      case 'connection_established':
        if (message.scores) {
          setScores(message.scores);
        }
        break;

      case 'clue_revealed':
        // Find the clue in categories and set it as selected
        for (const category of categories) {
          const clue = category.clues.find(c => c.id === message.clue.id);
          if (clue) {
            setSelectedClue(clue);
            setShowAnswer(false);
            break;
          }
        }
        break;

      case 'answer_judged':
        // Could show visual feedback here (green/red flash, etc.)
        break;

      case 'return_to_board':
        setSelectedClue(null);
        setShowAnswer(false);
        if (message.revealed_clues) {
          setRevealedClues(message.revealed_clues);
        }
        if (message.scores) {
          setScores(message.scores);
        }
        break;

      case 'error':
        console.error('[BoardView] Error from server:', message.message);
        break;

      default:
        console.log('[BoardView] Unhandled message type:', message.type);
    }
  };

  return (
    <div className="board-view">
      <Header title="JEOPARDY!" subtitle={`Season ${season} - Episode ${episode}`} />

      <div className="board-content">
        <ScoreDisplay scores={scores} playerNames={playerNames} />

        {categories.length > 0 && (
          <Board
            categories={categories}
            revealedClues={revealedClues}
            onClueClick={() => {}} // No-op - board is display-only
            round="single"
            disabled={true}
          />
        )}
      </div>

      <ClueModal
        clue={selectedClue}
        onClose={() => {}} // No-op - controlled by host
        showAnswer={showAnswer}
      />
    </div>
  );
}
