import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { Board } from '../../components/Board/Board';
import { ScoreDisplay } from '../../components/ScoreDisplay/ScoreDisplay';
import { BuzzerQueue } from '../../components/Host/BuzzerQueue';
import { ScoreControls } from '../../components/Host/ScoreControls';
import { ClueDetail } from '../../components/Host/ClueDetail';
import { GameControls } from '../../components/Host/GameControls';
import { DailyDoubleControls } from '../../components/Host/DailyDoubleControls';
import { FinalJeopardyControls, type FJStage } from '../../components/Host/FinalJeopardyControls';
import { SessionConfirmation } from '../../components/SessionConfirmation/SessionConfirmation';
import type { Category, Clue } from '../../types/Episode';
import { GameWebSocket } from '../../services/websocket';
import type { IncomingMessage, DDStage } from '../../types/WebSocket';
import { getClueValue } from '../../utils/formatters';
import { api } from '../../services/api';
import { getSession, saveSession, clearSession, type SessionData } from '../../services/sessionManager';
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
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [currentRound, setCurrentRound] = useState<'single' | 'double' | 'final'>('single');
  const [gameStatus, setGameStatus] = useState<'waiting' | 'active' | 'completed'>('active');
  const [revealedClues, setRevealedClues] = useState<number[]>([]);
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  // Player state - start with empty players
  const [players, setPlayers] = useState<Array<{ playerNumber: number; playerName: string; score: number }>>([]);

  // Buzzer queue state
  const [buzzQueue, setBuzzQueue] = useState<Array<{ playerNumber: number; playerName: string; timestamp: number }>>([]);

  // Buzzer enabled state (starts false, set to true when host clicks "Finished Reading")
  const [buzzerEnabled, setBuzzerEnabled] = useState(false);

  // Score adjustments menu state
  const [showScoreAdjustments, setShowScoreAdjustments] = useState(false);

  // Daily Double state
  const [isDailyDouble, setIsDailyDouble] = useState(false);
  const [ddStage, setDdStage] = useState<DDStage>('detected');
  const [ddPlayer, setDdPlayer] = useState<number | null>(null);
  const [ddWager, setDdWager] = useState<number | null>(null);
  const [ddAnswer, setDdAnswer] = useState<string | null>(null);

  // Final Jeopardy state
  const [fjStage, setFjStage] = useState<FJStage>('not_started');
  const [fjCategory, setFjCategory] = useState<string | null>(null);
  const [fjClue, setFjClue] = useState<Clue | null>(null); // Store the FJ clue (question and correct answer)
  const [fjPlayerAnswers, setFjPlayerAnswers] = useState<Array<{
    playerNumber: number;
    playerName: string;
    wager: number | null;
    answer: string | null;
    judged: boolean;
    correct?: boolean;
  }>>([]);
  const [fjTimeRemaining, setFjTimeRemaining] = useState<number | null>(null);

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

      console.log('[HostView] Checking for existing session...');

      const session = getSession('host', gameId);

      // No session exists
      if (!session) {
        console.log('[HostView] No existing session found');
        setIsValidatingSession(false);
        return;
      }

      console.log('[HostView] Found existing host session:', session);

      // Validate game still exists
      try {
        const gameValidation = await api.games.validate(gameId);
        if (!gameValidation.valid) {
          console.log('[HostView] Game no longer exists, clearing session');
          clearSession('host', gameId);
          navigate('/lobby');
          return;
        }

        // Session is valid - show confirmation modal
        console.log('[HostView] Session is valid, showing confirmation');
        setExistingSession(session);
        setShowSessionConfirmation(true);
        setIsValidatingSession(false);
      } catch (error) {
        console.error('[HostView] Session validation error:', error);
        clearSession('host', gameId);
        setIsValidatingSession(false);
      }
    };

    validateExistingSession();
  }, [gameId, navigate]);

  // Handle continuing existing session
  const handleContinueSession = () => {
    console.log('[HostView] Continuing existing host session');
    setShowSessionConfirmation(false);
  };

  // Handle starting new session
  const handleNewSession = () => {
    if (!gameId) return;
    console.log('[HostView] Starting new host session');
    clearSession('host', gameId);
    setExistingSession(null);
    setShowSessionConfirmation(false);
  };

  // Load game and episode data
  useEffect(() => {
    // Skip loading if still validating session or showing confirmation
    if (isValidatingSession || showSessionConfirmation) {
      return;
    }

    const loadGameData = async () => {
      if (!gameId) {
        console.warn('[HostView] No gameId provided');
        return;
      }

      console.log('[HostView] Loading game data for gameId:', gameId);

      try {
        // Fetch game data from API
        console.log('[HostView] Fetching game...');
        const game = await api.games.get(gameId);
        console.log('[HostView] Game loaded:', game);

        // Fetch episode data
        console.log('[HostView] Fetching episode:', game.episode);
        const episode = await api.episodes.get(game.episode);
        console.log('[HostView] Episode loaded:', episode);
        console.log('[HostView] Number of categories:', episode.categories?.length);

        // Set categories from episode
        if (episode.categories && episode.categories.length > 0) {
          setCategories(episode.categories);
          console.log('[HostView] Categories set successfully');
        } else {
          console.warn('[HostView] No categories in episode, using mock data');
          setCategories(mockCategories);
        }

        // DO NOT initialize players here - let WebSocket handle it completely
        // The connection_established message has the authoritative player list with live Redis scores
        // Setting players here causes race conditions and overwrites scores on refresh
        console.log('[HostView] Game loaded, waiting for WebSocket to initialize players with Redis scores');

        // Save host session to localStorage
        saveSession({
          playerId: 0, // Host doesn't have a player ID
          guestSession: gameId, // Use gameId as session identifier for host
          gameId: gameId,
          playerNumber: 0, // Host doesn't have a player number
          role: 'host',
          displayName: 'Host',
          timestamp: Date.now()
        });

        console.log('[HostView] Host session saved to localStorage');

      } catch (error) {
        console.error('[HostView] Failed to load game data:', error);
        console.error('[HostView] Error details:', error instanceof Error ? error.message : String(error));
        // Fall back to mock data for testing
        console.warn('[HostView] Using mock data as fallback');
        setCategories(mockCategories);
      }
    };

    loadGameData();
  }, [gameId, isValidatingSession, showSessionConfirmation]);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!gameId) {
      console.error('[HostView] No gameId provided in URL');
      return;
    }

    wsRef.current = new GameWebSocket(gameId);

    wsRef.current.connect()
      .then(() => {
        console.log('[HostView] WebSocket connected to game:', gameId);
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
  }, [gameId]);

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
        console.log('[HostView] Scores from Redis:', message.scores);
        console.log('[HostView] Players from backend:', message.players);

        // Initialize players from backend data with Redis scores (authoritative source)
        if (message.players) {
          const initialPlayers = Object.entries(message.players).map(([numStr, name]) => ({
            playerNumber: parseInt(numStr),
            playerName: name as string,
            score: message.scores?.[numStr] ?? 0
          }));
          setPlayers(initialPlayers);
          console.log('[HostView] Players initialized from Redis:', initialPlayers);
        } else {
          // Fallback: If backend hasn't been restarted and doesn't send players field yet,
          // just update existing player scores from Redis
          if (message.scores) {
            setPlayers(prev => prev.map(p => ({
              ...p,
              score: message.scores[p.playerNumber] ?? p.score
            })));
            console.log('[HostView] Player scores updated from Redis (legacy mode)');
          }
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

      case 'clue_revealed':
        console.log('[HostView] Clue revealed broadcast received');
        // Buzzer is already locked by handleClueClick, but confirm state
        setBuzzerEnabled(false);
        break;

      case 'buzzer_enabled':
        console.log('[HostView] Buzzer enabled broadcast received');
        setBuzzerEnabled(true);
        break;

      case 'answer_judged':
        console.log('[HostView] Answer judged broadcast received');
        // Update player score based on broadcast
        setPlayers(prev => prev.map(p =>
          p.playerNumber === message.player_number
            ? { ...p, score: message.new_score }
            : p
        ));
        break;

      case 'return_to_board':
        console.log('[HostView] Return to board broadcast received');
        // Clear clue and return to board
        setSelectedClue(null);
        setShowAnswer(false);
        setBuzzQueue([]);
        setBuzzerEnabled(false);
        // Clear DD state
        setIsDailyDouble(false);
        setDdStage('detected');
        setDdPlayer(null);
        setDdWager(null);
        setDdAnswer(null);
        // Update revealed clues from server (authoritative source)
        if (message.revealed_clues) {
          setRevealedClues(message.revealed_clues);
        }
        // Update scores from broadcast
        if (message.scores) {
          setPlayers(prev => prev.map(p => ({
            ...p,
            score: message.scores[p.playerNumber] ?? p.score
          })));
        }
        break;

      case 'game_reset':
        console.log('[HostView] Game reset broadcast received');
        // Reset all game state
        setPlayers(Object.entries(message.players).map(([numStr, name]) => {
          const num = parseInt(numStr);
          return {
            playerNumber: num,
            playerName: name,
            score: message.scores[numStr] || 0
          };
        }));
        setRevealedClues([]);
        setSelectedClue(null);
        setShowAnswer(false);
        setBuzzQueue([]);
        setBuzzerEnabled(false);
        setCurrentRound('single');
        console.log('[HostView] Game state reset complete');
        break;

      case 'score_adjusted':
        console.log('[HostView] Score adjusted broadcast received');
        // Update player score from broadcast
        setPlayers(prev => prev.map(p =>
          p.playerNumber === message.player_number
            ? { ...p, score: message.new_score }
            : p
        ));
        console.log(`[HostView] Player ${message.player_number} score updated to ${message.new_score}`);
        break;

      case 'daily_double_detected':
        console.log('[HostView] Daily Double detected:', message);
        setIsDailyDouble(true);
        setDdStage('detected');
        setDdPlayer(message.player_number);
        setDdWager(null);
        setDdAnswer(null);
        break;

      case 'daily_double_revealed':
        console.log('[HostView] Daily Double revealed to all players');
        setDdStage('revealed');
        // Set the clue data if needed
        if (message.clue) {
          setSelectedClue({
            id: message.clue.id,
            question: message.clue.question,
            answer: message.clue.answer,
            value: message.clue.value,
            position: 0,
            is_daily_double: true
          });
        }
        break;

      case 'wager_submitted':
        console.log('[HostView] Wager submitted:', message.wager);
        setDdWager(message.wager);
        setDdStage('wagering');
        break;

      case 'dd_clue_shown':
        console.log('[HostView] DD clue shown to all players');
        // Clue has been revealed to players, stage moves to answering
        setDdStage('answering');
        break;

      case 'dd_answer_judged':
        console.log('[HostView] DD answer judged:', message.correct);
        setDdStage('judged');
        // Update player score
        setPlayers(prev => prev.map(p =>
          p.playerNumber === message.player_number
            ? { ...p, score: message.new_score }
            : p
        ));
        break;

      case 'fj_category_shown':
        console.log('[HostView] Final Jeopardy category shown:', message.category);
        setFjStage('category_shown');
        setFjCategory(message.category);

        // Initialize player answers array using current players state (avoid closure issues)
        setPlayers(currentPlayers => {
          console.log('[HostView] Current players in state:', currentPlayers);
          const initialPlayerAnswers = currentPlayers.map(p => ({
            playerNumber: p.playerNumber,
            playerName: p.playerName,
            wager: null,
            answer: null,
            judged: false
          }));
          console.log('[HostView] Initialized fjPlayerAnswers:', initialPlayerAnswers);
          setFjPlayerAnswers(initialPlayerAnswers);
          return currentPlayers; // Return unchanged
        });
        break;

      case 'fj_wager_submitted':
        console.log('[HostView] FJ wager submitted:', message.player_number, message.wager);
        console.log('[HostView] Message player_number type:', typeof message.player_number);
        console.log('[HostView] Current fjPlayerAnswers:', fjPlayerAnswers);

        // Need to access current players state, not the closure
        setPlayers(currentPlayers => {
          console.log('[HostView] Current players in state:', currentPlayers);

          setFjPlayerAnswers(prev => {
            console.log('[HostView] Updating player answers, prev:', prev);

            // Convert message.player_number to number for comparison
            const playerNum = Number(message.player_number);

            // If the array is empty, initialize it from current players
            if (prev.length === 0 && currentPlayers.length > 0) {
              console.log('[HostView] fjPlayerAnswers is empty, initializing from current players');
              prev = currentPlayers.map(p => ({
                playerNumber: p.playerNumber,
                playerName: p.playerName,
                wager: null,
                answer: null,
                judged: false
              }));
              console.log('[HostView] Initialized array:', prev);
            }

            // Check if this player exists in the array
            const playerExists = prev.some(pa => pa.playerNumber === playerNum);

            if (!playerExists) {
              // Player doesn't exist, add them
              console.log('[HostView] Player not in array, adding player:', playerNum);
              const playerInfo = currentPlayers.find(p => p.playerNumber === playerNum);
              if (playerInfo) {
                prev = [...prev, {
                  playerNumber: playerNum,
                  playerName: playerInfo.playerName,
                  wager: message.wager,
                  answer: null,
                  judged: false
                }];
              }
            } else {
              // Player exists, update their wager
              prev = prev.map(pa => {
                console.log(`[HostView] Checking player ${pa.playerNumber} vs ${playerNum}:`, pa.playerNumber === playerNum);
                return pa.playerNumber === playerNum
                  ? { ...pa, wager: message.wager }
                  : pa;
              });
            }

            console.log('[HostView] Updated array:', prev);

            // Check if all wagers are in using the UPDATED array
            const allWagersIn = prev.length > 0 && prev.every(pa => pa.wager !== null);
            console.log('[HostView] All wagers in?', allWagersIn);

            if (allWagersIn) {
              console.log('[HostView] Setting stage to wagering');
              setFjStage('wagering');
            } else {
              console.log('[HostView] Not all wagers in yet:', prev);
            }

            return prev;
          });

          return currentPlayers; // Return unchanged
        });
        break;

      case 'fj_clue_revealed':
        console.log('[HostView] FJ clue revealed, timer started');
        console.log('[HostView] FJ clue data:', message.clue);
        setFjStage('clue_shown');
        setFjClue(message.clue); // Store the clue (includes question and correct answer)
        setFjTimeRemaining(message.timer_duration);
        // Start countdown timer
        const timerInterval = setInterval(() => {
          setFjTimeRemaining(prev => {
            if (prev === null || prev <= 1) {
              clearInterval(timerInterval);
              // Move to judging when timer expires
              setFjStage('judging');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        break;

      case 'fj_answer_submitted':
        console.log('[HostView] FJ answer submitted:', message.player_number, message.answer);
        console.log('[HostView] Message player_number type:', typeof message.player_number);

        // Need to access current players state, not the closure
        setPlayers(currentPlayers => {
          console.log('[HostView] Current players in state:', currentPlayers);

          setFjPlayerAnswers(prev => {
            console.log('[HostView] Updating answers, prev:', prev);

            // Convert message.player_number to number for comparison
            const playerNum = Number(message.player_number);

            // If the array is empty, initialize it from current players
            if (prev.length === 0 && currentPlayers.length > 0) {
              console.log('[HostView] fjPlayerAnswers is empty, initializing from current players');
              prev = currentPlayers.map(p => ({
                playerNumber: p.playerNumber,
                playerName: p.playerName,
                wager: null,
                answer: null,
                judged: false
              }));
              console.log('[HostView] Initialized array:', prev);
            }

            // Check if player exists in array
            const playerExists = prev.some(pa => pa.playerNumber === playerNum);

            let updated;
            if (!playerExists) {
              // Add player if not exists (defensive - shouldn't normally happen)
              console.log('[HostView] Player not in array, adding them');
              const playerInfo = currentPlayers.find(p => p.playerNumber === playerNum);
              if (playerInfo) {
                updated = [...prev, {
                  playerNumber: playerNum,
                  playerName: playerInfo.playerName,
                  wager: null, // Wager should have been submitted already, but set to null as fallback
                  answer: message.answer,
                  judged: false
                }];
              } else {
                updated = prev;
              }
            } else {
              // Update the player answers with the new answer
              updated = prev.map(pa => {
                console.log(`[HostView] Checking player ${pa.playerNumber} vs ${playerNum}:`, pa.playerNumber === playerNum);
                return pa.playerNumber === playerNum
                  ? { ...pa, answer: message.answer }
                  : pa;
              });
            }

            console.log('[HostView] Updated answers array:', updated);

            // Check if all answers are in using the UPDATED array
            const allAnswersIn = updated.length > 0 && updated.every(pa => pa.answer !== null && pa.answer !== '');
            console.log('[HostView] All answers in?', allAnswersIn, 'Array length:', updated.length);

            // Move to judging stage if all answers submitted
            if (allAnswersIn) {
              console.log('[HostView] Setting stage to judging');
              setFjStage('judging');
            }

            return updated;
          });

          return currentPlayers; // Return unchanged
        });
        break;

      case 'fj_answer_judged':
        console.log('[HostView] FJ answer judged:', message.player_number, message.correct);
        setFjPlayerAnswers(prev => {
          // Update the player answers with judged status
          // Convert message.player_number to number for comparison
          const playerNum = Number(message.player_number);
          const updated = prev.map(pa =>
            pa.playerNumber === playerNum
              ? { ...pa, judged: true, correct: message.correct }
              : pa
          );

          // Check if all answers are judged using the UPDATED array
          const allJudged = updated.every(pa => pa.judged);
          console.log('[HostView] All answers judged?', allJudged);

          if (allJudged) {
            setFjStage('complete');
          }

          return updated;
        });
        // Update player score
        setPlayers(prev => prev.map(p =>
          p.playerNumber === Number(message.player_number)
            ? { ...p, score: message.new_score }
            : p
        ));
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

  // Filter categories by current round
  const currentCategories = categories.filter(cat => cat.round_type === currentRound);

  const handleClueClick = (clue: Clue) => {
    setSelectedClue(clue);
    setShowAnswer(false);
    setBuzzQueue([]); // Clear buzz queue
    setBuzzerEnabled(false); // Lock buzzer until host finishes reading

    // Send clue reveal message to all clients
    if (wsRef.current?.isConnected()) {
      wsRef.current.send({
        type: 'reveal_clue',
        clue_id: clue.id
      });
    }
  };

  const handleEnableBuzzer = () => {
    setBuzzerEnabled(true);

    // Send enable buzzer message to all clients
    if (wsRef.current?.isConnected()) {
      wsRef.current.send({
        type: 'enable_buzzer'
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
    // Send score adjustment via WebSocket
    if (wsRef.current?.isConnected()) {
      wsRef.current.send({
        type: 'adjust_score',
        player_number: playerNumber,
        adjustment: amount
      });
      console.log(`[HostView] Score adjustment sent for player ${playerNumber}: ${amount}`);
    } else {
      console.error('[HostView] Cannot adjust score - WebSocket not connected');
    }
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
      // Calculate the correct value based on position and current round
      const clueValue = getClueValue(selectedClue.position, currentRound as 'single' | 'double');

      // Send judge answer message - backend will handle score update
      if (wsRef.current?.isConnected()) {
        wsRef.current.send({
          type: 'judge_answer',
          player_number: winner.playerNumber,
          correct: true,
          value: clueValue
        });
      }

      console.log('Marked correct for', winner.playerName, 'value:', clueValue);
    }
  };

  const handleMarkIncorrect = () => {
    if (selectedClue && buzzQueue.length > 0) {
      const winner = buzzQueue[0];
      // Calculate the correct value based on position and current round
      const clueValue = getClueValue(selectedClue.position, currentRound as 'single' | 'double');

      // Send judge answer message - backend will handle score update
      if (wsRef.current?.isConnected()) {
        wsRef.current.send({
          type: 'judge_answer',
          player_number: winner.playerNumber,
          correct: false,
          value: clueValue
        });
      }

      // Remove the first player from buzz queue so next player can answer
      setBuzzQueue(prev => prev.slice(1));

      console.log('Marked incorrect for', winner.playerName, 'value:', clueValue);
    }
  };

  const handleNextClue = () => {
    // Send next_clue message to return to board
    // State will be updated when we receive the return_to_board broadcast
    if (wsRef.current?.isConnected()) {
      wsRef.current.send({
        type: 'next_clue'
      });
    }
  };

  const handleEndGame = () => {
    if (!gameId) return;
    setGameStatus('completed');
    console.log('Game ended');
    // Clear session when game ends
    clearSession('host', gameId);
    console.log('[HostView] Session cleared - game ended');
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

  // Daily Double handlers
  const handleRevealDailyDouble = () => {
    if (wsRef.current?.isConnected()) {
      wsRef.current.send({
        type: 'reveal_daily_double'
      });
    }
  };

  const handleShowDDClue = () => {
    // Send WebSocket message to show clue to all players
    if (wsRef.current?.isConnected()) {
      wsRef.current.send({
        type: 'show_dd_clue'
      });
      console.log('[HostView] Sent show_dd_clue message');
    }
    // Also show the answer section for host reference
    setShowAnswer(true);
    setDdStage('answering');
  };

  const handleJudgeDDCorrect = () => {
    if (wsRef.current?.isConnected() && ddPlayer) {
      wsRef.current.send({
        type: 'judge_dd_answer',
        player_number: ddPlayer,
        correct: true
      });
    }
  };

  const handleJudgeDDIncorrect = () => {
    if (wsRef.current?.isConnected() && ddPlayer) {
      wsRef.current.send({
        type: 'judge_dd_answer',
        player_number: ddPlayer,
        correct: false
      });
    }
  };

  // Final Jeopardy handlers
  const handleStartFinalJeopardy = () => {
    if (wsRef.current?.isConnected()) {
      wsRef.current.send({
        type: 'start_final_jeopardy'
      });
      console.log('[HostView] Sent start_final_jeopardy message');
    }
  };

  const handleRevealFJClue = () => {
    if (wsRef.current?.isConnected()) {
      wsRef.current.send({
        type: 'reveal_fj_clue'
      });
      console.log('[HostView] Sent reveal_fj_clue message');
    }
  };

  const handleJudgeFJAnswer = (playerNumber: number, correct: boolean) => {
    if (wsRef.current?.isConnected()) {
      wsRef.current.send({
        type: 'judge_fj_answer',
        player_number: playerNumber,
        correct: correct
      });
      console.log(`[HostView] Sent judge_fj_answer for player ${playerNumber}: ${correct}`);
    }
  };

  const handleShowFJAnswers = () => {
    console.log('[HostView] Manually showing FJ answers for judging');
    setFjStage('judging');
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
      <div className="host-view">
        <Header title="Validating Session" subtitle="Please wait..." />
        <div className="host-content" style={{ textAlign: 'center', padding: '3rem' }}>
          <p>Checking for existing session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="host-view">
      <Header title={`HOST: Game ${gameId}`} subtitle="Control the game from here" />

      <div className="host-content">
        {/* Left Column: Board and Scores */}
        <div className="host-left">
          <ScoreDisplay scores={scores} playerNames={playerNames} />
          <div className="board-container">
            {currentCategories.length > 0 ? (
              <Board
                categories={currentCategories}
                revealedClues={revealedClues}
                onClueClick={handleClueClick}
                round={currentRound}
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
          </div>
        </div>

        {/* Right Column: Controls */}
        <div className="host-right">
          {/* Show Final Jeopardy Controls if round is 'final' */}
          {currentRound === 'final' && (
            <>
              {console.log('[HostView] Rendering FinalJeopardyControls with:')}
              {console.log('  - stage:', fjStage)}
              {console.log('  - playerAnswers:', fjPlayerAnswers)}
              {console.log('  - playerAnswers length:', fjPlayerAnswers.length)}
              {fjPlayerAnswers.length > 0 && console.log('  - First player:', fjPlayerAnswers[0])}
              {console.log('  - FJ Clue:', fjClue)}
              <FinalJeopardyControls
                stage={fjStage}
                category={fjCategory}
                clue={fjClue}
                playerAnswers={fjPlayerAnswers}
                timeRemaining={fjTimeRemaining}
                onStartFinalJeopardy={handleStartFinalJeopardy}
                onRevealClue={handleRevealFJClue}
                onJudgeAnswer={handleJudgeFJAnswer}
                onShowAnswers={handleShowFJAnswers}
              />
            </>
          )}

          {/* Show Daily Double Controls if DD is active */}
          {isDailyDouble && ddPlayer && (
            <DailyDoubleControls
              stage={ddStage}
              playerNumber={ddPlayer}
              playerName={players.find(p => p.playerNumber === ddPlayer)?.playerName || `Player ${ddPlayer}`}
              wager={ddWager}
              submittedAnswer={ddAnswer}
              onRevealDailyDouble={handleRevealDailyDouble}
              onShowClue={handleShowDDClue}
              onJudgeCorrect={handleJudgeDDCorrect}
              onJudgeIncorrect={handleJudgeDDIncorrect}
            />
          )}

          {/* Show normal ClueDetail if not a DD and not Final Jeopardy */}
          {!isDailyDouble && currentRound !== 'final' && (
            <ClueDetail
              clue={selectedClue}
              currentRound={currentRound}
              showAnswer={showAnswer}
              buzzerEnabled={buzzerEnabled}
              onToggleAnswer={handleToggleAnswer}
              onNextClue={handleNextClue}
              onEnableBuzzer={handleEnableBuzzer}
              onMarkCorrect={handleMarkCorrect}
              onMarkIncorrect={handleMarkIncorrect}
            />
          )}

          {/* Show clue detail for DD after wager stage */}
          {isDailyDouble && ddStage !== 'detected' && ddStage !== 'revealed' && (
            <ClueDetail
              clue={selectedClue}
              currentRound={currentRound}
              showAnswer={showAnswer}
              buzzerEnabled={false}
              onToggleAnswer={handleToggleAnswer}
              onNextClue={handleNextClue}
              onEnableBuzzer={handleEnableBuzzer}
              onMarkCorrect={handleMarkCorrect}
              onMarkIncorrect={handleMarkIncorrect}
            />
          )}

          {/* Only show buzzer queue for normal clues, not DDs or Final Jeopardy */}
          {!isDailyDouble && currentRound !== 'final' && (
            <BuzzerQueue
              buzzQueue={buzzQueue}
              onClear={handleClearBuzzQueue}
            />
          )}

          <div className="score-adjustments-section">
            <button
              className="toggle-score-adjustments"
              onClick={() => setShowScoreAdjustments(!showScoreAdjustments)}
            >
              {showScoreAdjustments ? '▼' : '▶'} Manual Score Adjustments
            </button>
            {showScoreAdjustments && (
              <ScoreControls
                players={players}
                onAdjustScore={handleAdjustScore}
              />
            )}
          </div>

          <GameControls
            currentRound={currentRound}
            gameStatus={gameStatus}
            onStartRound={handleStartRound}
            onEndGame={handleEndGame}
            onResetGame={handleResetGame}
          />
        </div>
      </div>
    </div>
  );
}
