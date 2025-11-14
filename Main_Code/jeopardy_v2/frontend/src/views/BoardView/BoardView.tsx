import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { ScoreDisplay } from '../../components/ScoreDisplay/ScoreDisplay';
import { Board } from '../../components/Board/Board';
import { ClueModal } from '../../components/Board/ClueModal';
import type { Category, Clue } from '../../types/Episode';
import { GameWebSocket } from '../../services/websocket';
import type { IncomingMessage } from '../../types/WebSocket';
import { api } from '../../services/api';
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
  const { gameId } = useParams<{ gameId: string }>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [revealedClues, setRevealedClues] = useState<number[]>([]);
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({});
  const [currentRound, setCurrentRound] = useState<'single' | 'double' | 'final'>('single');
  const [buzzerEnabled, setBuzzerEnabled] = useState(false);
  const [activeClueId, setActiveClueId] = useState<number | null>(null);

  // Daily Double state
  const [isDailyDouble, setIsDailyDouble] = useState(false);
  const [ddPlayerName, setDdPlayerName] = useState<string>('');
  const [ddWager, setDdWager] = useState<number | null>(null);
  const [showDDAnimation, setShowDDAnimation] = useState(false);

  // Final Jeopardy state
  const [isFinalJeopardy, setIsFinalJeopardy] = useState(false);
  const [fjCategory, setFjCategory] = useState<string | null>(null);
  const [fjShowClue, setFjShowClue] = useState(false);
  const [fjTimeRemaining, setFjTimeRemaining] = useState<number | null>(null);

  // WebSocket connection
  const wsRef = useRef<GameWebSocket | null>(null);

  // Load game and episode data
  useEffect(() => {
    const loadGameData = async () => {
      if (!gameId) {
        console.warn('[BoardView] No gameId provided');
        return;
      }

      console.log('[BoardView] Loading game data for gameId:', gameId);

      try {
        // Fetch game data from API
        console.log('[BoardView] Fetching game...');
        const game = await api.games.get(gameId);
        console.log('[BoardView] Game loaded:', game);

        // Fetch episode data
        console.log('[BoardView] Fetching episode:', game.episode);
        const episode = await api.episodes.get(game.episode);
        console.log('[BoardView] Episode loaded:', episode);
        console.log('[BoardView] Number of categories:', episode.categories?.length);

        // Set categories from episode
        if (episode.categories && episode.categories.length > 0) {
          setCategories(episode.categories);
          console.log('[BoardView] Categories set successfully');
        } else {
          console.warn('[BoardView] No categories in episode, using mock data');
          setCategories(mockCategories);
        }

        // Initialize player names from participants
        const names: Record<number, string> = {};
        game.participants?.forEach(p => {
          names[p.player_number] = p.player_name;
        });
        setPlayerNames(names);
        console.log('[BoardView] Player names initialized:', names);

      } catch (error) {
        console.error('[BoardView] Failed to load game data:', error);
        console.error('[BoardView] Error details:', error instanceof Error ? error.message : String(error));
        // Fall back to mock data for testing
        console.warn('[BoardView] Using mock data as fallback');
        setCategories(mockCategories);
      }
    };

    loadGameData();
  }, [gameId]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!gameId) {
      console.error('[BoardView] No gameId provided in URL');
      return;
    }

    wsRef.current = new GameWebSocket(gameId);

    wsRef.current.connect()
      .then(() => {
        console.log('[BoardView] WebSocket connected to game:', gameId);
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
  }, [gameId]);

  // Helper function to convert scores from string keys to number keys
  const convertScores = (scores: { [key: string]: number }): Record<number, number> => {
    const result: Record<number, number> = {};
    Object.entries(scores).forEach(([key, value]) => {
      result[parseInt(key)] = value;
    });
    return result;
  };

  // Handle incoming WebSocket messages
  const handleWebSocketMessage = (message: IncomingMessage) => {
    console.log('[BoardView] Received message:', message);

    switch (message.type) {
      case 'connection_established':
        if (message.scores) {
          setScores(convertScores(message.scores));
        }
        break;

      case 'clue_revealed':
        // Use clue data from WebSocket message directly
        const clueData: Clue = {
          id: message.clue.id,
          question: message.clue.question,
          answer: message.clue.answer,
          value: message.clue.value,
          position: 0, // Position not needed for display
          is_daily_double: message.clue.is_daily_double
        };
        setSelectedClue(clueData);
        setActiveClueId(message.clue.id);
        setBuzzerEnabled(false); // Buzzer locked until host enables it
        setShowAnswer(false);
        console.log('[BoardView] Clue revealed, buzzer locked');
        break;

      case 'answer_judged':
        // Could show visual feedback here (green/red flash, etc.)
        break;

      case 'buzzer_enabled':
        setBuzzerEnabled(true);
        console.log('[BoardView] Buzzer enabled for clue:', message.clue_id);
        break;

      case 'return_to_board':
        console.log('[BoardView] RETURN TO BOARD received!');
        console.log('[BoardView] Message data:', message);
        console.log('[BoardView] Current selectedClue before clear:', selectedClue);
        setSelectedClue(null);
        setActiveClueId(null);
        setBuzzerEnabled(false);
        setShowAnswer(false);
        // Clear DD state
        setIsDailyDouble(false);
        setDdPlayerName('');
        setDdWager(null);
        setShowDDAnimation(false);
        if (message.revealed_clues) {
          setRevealedClues(message.revealed_clues);
          console.log('[BoardView] Updated revealed clues:', message.revealed_clues);
        }
        if (message.scores) {
          setScores(convertScores(message.scores));
          console.log('[BoardView] Updated scores:', message.scores);
        }
        console.log('[BoardView] selectedClue set to null');
        break;

      case 'player_joined':
        // Update player names when a new player joins
        setPlayerNames(prev => ({
          ...prev,
          [message.player_number]: message.player_name
        }));
        // Initialize score for the new player if not already present
        setScores(prev => ({
          ...prev,
          [message.player_number]: prev[message.player_number] ?? 0
        }));
        console.log('[BoardView] Player joined:', message.player_name, 'as player', message.player_number);
        break;

      case 'game_reset':
        console.log('[BoardView] Game reset broadcast received');
        // Reset board state
        if (message.scores) {
          setScores(convertScores(message.scores));
        }
        setRevealedClues([]);
        setSelectedClue(null);
        setActiveClueId(null);
        setBuzzerEnabled(false);
        setShowAnswer(false);
        setCurrentRound('single');
        // Clear DD state
        setIsDailyDouble(false);
        setDdPlayerName('');
        setDdWager(null);
        setShowDDAnimation(false);
        console.log('[BoardView] Board state reset complete');
        break;

      case 'score_adjusted':
        console.log('[BoardView] Score adjusted broadcast received');
        // Update the specific player's score
        setScores(prev => ({
          ...prev,
          [message.player_number]: message.new_score
        }));
        console.log(`[BoardView] Player ${message.player_number} score updated to ${message.new_score}`);
        break;

      case 'daily_double_detected':
        console.log('[BoardView] Daily Double detected');
        setSelectedClue(null); // Clear any previous clue
        setActiveClueId(null); // Clear active clue to remove red border
        setIsDailyDouble(true);
        setDdPlayerName(playerNames[message.player_number] || `Player ${message.player_number}`);
        setDdWager(null);
        break;

      case 'daily_double_revealed':
        console.log('[BoardView] Daily Double revealed');
        setDdPlayerName(message.player_name);
        // Show DD animation and play sound
        setShowDDAnimation(true);

        // Play Daily Double sound
        const audio = new Audio('/dd.mp3');
        audio.play().catch(err => console.error('[BoardView] Failed to play DD sound:', err));

        // Hide animation after 5 seconds
        setTimeout(() => {
          setShowDDAnimation(false);
        }, 5000);
        break;

      case 'wager_submitted':
        console.log('[BoardView] Wager submitted:', message.wager);
        setDdWager(message.wager);
        // Wager submitted - wait for host to show clue
        break;

      case 'dd_clue_shown':
        console.log('[BoardView] DD clue shown');
        // Host has revealed the clue - NOW show it!
        const ddClue: Clue = {
          id: message.clue.id,
          question: message.clue.question,
          answer: message.clue.answer,
          value: message.clue.value,
          position: 0,
          is_daily_double: true
        };
        setSelectedClue(ddClue);
        // Don't set activeClueId for DD - no buzzer, so no red border needed
        setBuzzerEnabled(false);
        break;

      case 'dd_answer_judged':
        console.log('[BoardView] DD answer judged');
        // Update score
        setScores(prev => ({
          ...prev,
          [message.player_number]: message.new_score
        }));
        break;

      case 'fj_category_shown':
        console.log('[BoardView] Final Jeopardy category shown:', message.category);
        setIsFinalJeopardy(true);
        setFjCategory(message.category);
        setFjShowClue(false);
        setSelectedClue(null);
        setCurrentRound('final');
        break;

      case 'fj_clue_revealed':
        console.log('[BoardView] Final Jeopardy clue revealed');
        const fjClue: Clue = {
          id: message.clue.id,
          question: message.clue.question,
          answer: message.clue.answer,
          value: 0,
          position: 0,
          is_daily_double: false
        };
        setSelectedClue(fjClue);
        setFjShowClue(true);
        setFjTimeRemaining(message.timer_duration);
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

      case 'fj_answer_judged':
        console.log('[BoardView] FJ answer judged for player:', message.player_number);
        setScores(prev => ({
          ...prev,
          [message.player_number]: message.new_score
        }));
        break;

      case 'error':
        console.error('[BoardView] Error from server:', message.message);
        break;

      default:
        console.log('[BoardView] Unhandled message type:', message.type);
    }
  };

  // Filter categories by current round
  const currentCategories = categories.filter(cat => cat.round_type === currentRound);

  return (
    <div className="board-view">
      <div className="board-content">
        {currentCategories.length > 0 ? (
          <Board
            categories={currentCategories}
            revealedClues={revealedClues}
            activeClueId={activeClueId}
            buzzerEnabled={buzzerEnabled}
            onClueClick={() => {}} // No-op - board is display-only
            round={currentRound}
            disabled={false}
          />
        ) : categories.length > 0 ? (
          <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>
            No categories for {currentRound} jeopardy
          </div>
        ) : (
          <div style={{ color: 'white', textAlign: 'center', padding: '2rem' }}>
            Loading episode data...
          </div>
        )}

        <ScoreDisplay scores={scores} playerNames={playerNames} />
      </div>

      {/* Daily Double Animation - Full screen image with sound */}
      {showDDAnimation && (
        <div className="dd-animation-overlay">
          <img src="/dd_pic.jpg" alt="Daily Double" className="dd-animation-image" />
        </div>
      )}

      {/* BoardView does NOT show the wagering overlay - only the full-screen animation */}

      {/* Final Jeopardy Category Overlay - Show category before clue */}
      {isFinalJeopardy && !fjShowClue && fjCategory && (
        <div className="fj-overlay">
          <div className="fj-category-banner">
            <div className="fj-category-container">
              <p className="fj-category-label">CATEGORY:</p>
              <h2 className="fj-category-text">{fjCategory}</h2>
            </div>
            <p className="fj-category-status">Players are wagering...</p>
          </div>
        </div>
      )}

      {/* Final Jeopardy Clue with Timer */}
      {isFinalJeopardy && fjShowClue && selectedClue && (
        <div className="fj-clue-overlay">
          <div className="fj-clue-container">
            {fjTimeRemaining !== null && fjTimeRemaining > 0 && (
              <div className="fj-timer-display">
                <p className="fj-timer-label">Time Remaining:</p>
                <div className={`fj-timer ${fjTimeRemaining <= 10 ? 'urgent' : ''}`}>
                  {fjTimeRemaining}s
                </div>
              </div>
            )}

            <div className="fj-clue-content">
              <p className="fj-clue-text">{selectedClue.question.toUpperCase()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Regular ClueModal - Only show if NOT Final Jeopardy with clue */}
      {!(isFinalJeopardy && fjShowClue) && (
        <ClueModal
          clue={selectedClue}
          currentRound={currentRound}
          onClose={() => {}} // No-op - controlled by host
          showAnswer={showAnswer}
          buzzerEnabled={buzzerEnabled}
        />
      )}
    </div>
  );
}
