# Phase 4: WebSocket Integration & Real-Time Communication

This guide continues from Phase 3 (Parts D, E, F) which covered the Player, Host, and Board interfaces. Now we'll connect all three views together using WebSockets for real-time communication.

---

## Overview

In this phase, you'll:
- Create a WebSocket service to manage connections
- Connect the Host view to send game state updates
- Connect the Player view to send buzzes and receive updates
- Connect the Board view to display real-time game state
- Test the complete multiplayer game flow

**Architecture:**
```
┌──────────────┐      WebSocket      ┌──────────────┐
│  Host View   │◄────────────────────►│   Django     │
└──────────────┘                      │   Channels   │
                                      │   Backend    │
┌──────────────┐      WebSocket      │              │
│ Player View  │◄────────────────────►│              │
└──────────────┘                      │              │
                                      │              │
┌──────────────┐      WebSocket      │              │
│  Board View  │◄────────────────────►│              │
└──────────────┘                      └──────────────┘
```

---

## Part A: WebSocket Service Setup

### Step 1: Create WebSocket Service Directory

```bash
mkdir -p src/services
```

### Step 2: Create WebSocket Service

Create `src/services/websocket.ts`:

```typescript
export type MessageHandler = (data: any) => void;

export class GameWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private isConnecting = false;

  constructor(url: string) {
    this.url = url;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnecting = false;
          this.attemptReconnect();
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Reconnecting... Attempt ${this.reconnectAttempts}`);

      setTimeout(() => {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  send(type: string, data: any = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = { type, ...data };
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  on(messageType: string, handler: MessageHandler) {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    this.messageHandlers.get(messageType)!.add(handler);
  }

  off(messageType: string, handler: MessageHandler) {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  private handleMessage(message: any) {
    const { type } = message;
    const handlers = this.messageHandlers.get(type);

    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in handler for ${type}:`, error);
        }
      });
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance for the game
let gameWebSocket: GameWebSocket | null = null;

export function getGameWebSocket(roomId: string): GameWebSocket {
  if (!gameWebSocket) {
    // Adjust this URL to match your Django Channels WebSocket endpoint
    const wsUrl = `ws://localhost:8000/ws/game/${roomId}/`;
    gameWebSocket = new GameWebSocket(wsUrl);
  }
  return gameWebSocket;
}

export function disconnectGameWebSocket() {
  if (gameWebSocket) {
    gameWebSocket.disconnect();
    gameWebSocket = null;
  }
}
```

### Step 3: Create Message Types

Create `src/types/WebSocketMessages.ts`:

```typescript
// Message types for WebSocket communication

// Host -> Server messages
export interface StartRoundMessage {
  type: 'start_round';
  round: 'single' | 'double' | 'final';
}

export interface SelectClueMessage {
  type: 'select_clue';
  clue_id: number;
  category_id: number;
}

export interface RevealAnswerMessage {
  type: 'reveal_answer';
  clue_id: number;
}

export interface JudgeAnswerMessage {
  type: 'judge_answer';
  player_number: number;
  correct: boolean;
  value: number;
}

export interface NextClueMessage {
  type: 'next_clue';
}

export interface UpdateScoreMessage {
  type: 'update_score';
  player_number: number;
  score: number;
}

// Player -> Server messages
export interface PlayerReadyMessage {
  type: 'player_ready';
  player_name: string;
  player_number: number;
}

export interface BuzzMessage {
  type: 'buzz';
  player_name: string;
  player_number: number;
  timestamp: number;
}

export interface SubmitWagerMessage {
  type: 'submit_wager';
  player_number: number;
  wager: number;
}

export interface SubmitAnswerMessage {
  type: 'submit_answer';
  player_number: number;
  answer: string;
}

// Server -> Client messages
export interface GameStateMessage {
  type: 'game_state';
  round: 'single' | 'double' | 'final' | '';
  categories: any[];
  revealed_clues: number[];
  scores: Record<number, number>;
  player_names: Record<number, string>;
}

export interface ClueSelectedMessage {
  type: 'clue_selected';
  clue: any;
  show_answer: boolean;
}

export interface BuzzReceivedMessage {
  type: 'buzz_received';
  player_name: string;
  player_number: number;
  timestamp: number;
}

export interface BuzzQueueUpdateMessage {
  type: 'buzz_queue_update';
  queue: Array<{
    player_number: number;
    player_name: string;
    timestamp: number;
  }>;
}

export interface ScoresUpdateMessage {
  type: 'scores_update';
  scores: Record<number, number>;
}

export interface PlayerJoinedMessage {
  type: 'player_joined';
  player_number: number;
  player_name: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type WebSocketMessage =
  | StartRoundMessage
  | SelectClueMessage
  | RevealAnswerMessage
  | JudgeAnswerMessage
  | NextClueMessage
  | UpdateScoreMessage
  | PlayerReadyMessage
  | BuzzMessage
  | SubmitWagerMessage
  | SubmitAnswerMessage
  | GameStateMessage
  | ClueSelectedMessage
  | BuzzReceivedMessage
  | BuzzQueueUpdateMessage
  | ScoresUpdateMessage
  | PlayerJoinedMessage
  | ErrorMessage;
```

---

## Part B: Connect Host View to WebSocket

### Step 1: Update HostView with WebSocket Integration

Update `src/views/HostView/HostView.tsx`:

Add imports at the top:

```typescript
import { useEffect, useRef } from 'react';
import { getGameWebSocket, disconnectGameWebSocket } from '../../services/websocket';
```

Add WebSocket setup inside the HostView component (after state declarations):

```typescript
export function HostView() {
  const { season, episode } = useParams<{ season: string; episode: string }>();
  const wsRef = useRef(getGameWebSocket(`season${season}-episode${episode}`));

  // ... existing state declarations ...

  // WebSocket connection and message handlers
  useEffect(() => {
    const ws = wsRef.current;

    // Connect to WebSocket
    ws.connect().then(() => {
      console.log('Host connected to game');
    }).catch((error) => {
      console.error('Failed to connect:', error);
    });

    // Handle player joined
    ws.on('player_joined', (data) => {
      setPlayers((prev) => {
        const exists = prev.find(p => p.playerNumber === data.player_number);
        if (!exists) {
          return [...prev, {
            playerNumber: data.player_number,
            playerName: data.player_name,
            score: 0
          }];
        }
        return prev;
      });
    });

    // Handle buzz received
    ws.on('buzz_received', (data) => {
      setBuzzQueue((prev) => [...prev, {
        playerNumber: data.player_number,
        playerName: data.player_name,
        timestamp: data.timestamp
      }]);
    });

    // Cleanup on unmount
    return () => {
      disconnectGameWebSocket();
    };
  }, []);

  // ... rest of component ...
}
```

### Step 2: Update Host Actions to Send WebSocket Messages

Update the handler functions in HostView:

```typescript
const handleStartRound = (round: 'single' | 'double' | 'final') => {
  setCurrentRound(round);
  setRevealedClues([]);
  setSelectedClue(null);
  setShowAnswer(false);
  setBuzzQueue([]);

  // Send to WebSocket
  wsRef.current.send('start_round', { round });

  console.log('Starting round:', round);
};

const handleClueClick = (clue: Clue) => {
  setSelectedClue(clue);
  setShowAnswer(false);
  setBuzzQueue([]);

  // Send to WebSocket
  wsRef.current.send('select_clue', {
    clue_id: clue.id,
    category_id: clue.id, // Adjust based on your data structure
  });
};

const handleMarkCorrect = () => {
  if (selectedClue && buzzQueue.length > 0) {
    const winner = buzzQueue[0];
    const newScore = players.find(p => p.playerNumber === winner.playerNumber)!.score + selectedClue.value;

    handleAdjustScore(winner.playerNumber, selectedClue.value);

    // Send to WebSocket
    wsRef.current.send('judge_answer', {
      player_number: winner.playerNumber,
      correct: true,
      value: selectedClue.value
    });

    console.log('Marked correct for', winner.playerName);
  }
};

const handleMarkIncorrect = () => {
  if (selectedClue && buzzQueue.length > 0) {
    const winner = buzzQueue[0];

    handleAdjustScore(winner.playerNumber, -selectedClue.value);

    // Send to WebSocket
    wsRef.current.send('judge_answer', {
      player_number: winner.playerNumber,
      correct: false,
      value: selectedClue.value
    });

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

  // Send to WebSocket
  wsRef.current.send('next_clue', {});
};

const handleAdjustScore = (playerNumber: number, amount: number) => {
  setPlayers(players.map(p =>
    p.playerNumber === playerNumber
      ? { ...p, score: p.score + amount }
      : p
  ));

  // Send to WebSocket
  const player = players.find(p => p.playerNumber === playerNumber);
  if (player) {
    wsRef.current.send('update_score', {
      player_number: playerNumber,
      score: player.score + amount
    });
  }
};
```

---

## Part C: Connect Player View to WebSocket

### Step 1: Update PlayerView with WebSocket Integration

Update `src/views/PlayerView/PlayerView.tsx`:

Add imports:

```typescript
import { useEffect, useRef } from 'react';
import { getGameWebSocket, disconnectGameWebSocket } from '../../services/websocket';
```

Add WebSocket setup:

```typescript
export function PlayerView() {
  const { playerName, playerNumber } = useParams<{ playerName: string; playerNumber: string }>();
  const wsRef = useRef(getGameWebSocket('game')); // Use same room as host

  // ... existing state declarations ...

  // WebSocket connection and message handlers
  useEffect(() => {
    const ws = wsRef.current;

    // Connect to WebSocket
    ws.connect().then(() => {
      console.log('Player connected to game');

      // Send player ready message
      ws.send('player_ready', {
        player_name: playerName,
        player_number: parseInt(playerNumber || '0')
      });
    }).catch((error) => {
      console.error('Failed to connect:', error);
    });

    // Handle game state updates
    ws.on('game_state', (data) => {
      // Update game state based on server message
      setStatus('Game in progress');
    });

    // Handle clue selected
    ws.on('clue_selected', (data) => {
      setCurrentClue(data.clue.question);
      setCanBuzz(true);
      setBuzzed(false);
      setStatus('Read the clue and buzz in!');
    });

    // Handle scores update
    ws.on('scores_update', (data) => {
      const myScore = data.scores[parseInt(playerNumber || '0')];
      if (myScore !== undefined) {
        setScore(myScore);
      }
    });

    // Handle next clue
    ws.on('next_clue', () => {
      setCurrentClue('');
      setCanBuzz(false);
      setBuzzed(false);
      setStatus('Waiting for next clue...');
    });

    // Cleanup on unmount
    return () => {
      // Don't disconnect - host manages the connection
    };
  }, [playerName, playerNumber]);

  // ... rest of component ...
}
```

### Step 2: Update Player Actions to Send WebSocket Messages

```typescript
const handleBuzz = () => {
  if (canBuzz && !buzzed) {
    setBuzzed(true);
    setCanBuzz(false);

    // Send buzz via WebSocket
    wsRef.current.send('buzz', {
      player_name: playerName,
      player_number: parseInt(playerNumber || '0'),
      timestamp: Date.now()
    });

    console.log('Player buzzed!');
  }
};

const handleWagerSubmit = (wager: number) => {
  // Send wager via WebSocket
  wsRef.current.send('submit_wager', {
    player_number: parseInt(playerNumber || '0'),
    wager
  });

  console.log('Wager submitted:', wager);
  setShowWagerInput(false);
  setShowAnswerInput(true);
};

const handleAnswerSubmit = (answer: string) => {
  // Send answer via WebSocket
  wsRef.current.send('submit_answer', {
    player_number: parseInt(playerNumber || '0'),
    answer
  });

  console.log('Answer submitted:', answer);
  setShowAnswerInput(false);
};
```

---

## Part D: Connect Board View to WebSocket

### Step 1: Update BoardView with WebSocket Integration

Update `src/views/BoardView/BoardView.tsx`:

Add imports:

```typescript
import { useEffect, useRef } from 'react';
import { getGameWebSocket } from '../../services/websocket';
```

Replace the mock data initialization with WebSocket setup:

```typescript
export function BoardView() {
  const { season, episode } = useParams<{ season: string; episode: string }>();
  const wsRef = useRef(getGameWebSocket(`season${season}-episode${episode}`));

  const [categories, setCategories] = useState<Category[]>(mockCategories); // Start with mock for now
  const [revealedClues, setRevealedClues] = useState<number[]>([]);
  const [selectedClue, setSelectedClue] = useState<Clue | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [scores, setScores] = useState<Record<number, number>>({ 1: 2400, 2: -800, 3: 1600 });
  const [playerNames, setPlayerNames] = useState<Record<number, string>>({ 1: 'Alice', 2: 'Bob', 3: 'Charlie' });

  // WebSocket connection and message handlers
  useEffect(() => {
    const ws = wsRef.current;

    // Connect to WebSocket
    ws.connect().then(() => {
      console.log('Board connected to game');
    }).catch((error) => {
      console.error('Failed to connect:', error);
    });

    // Handle game state updates
    ws.on('game_state', (data) => {
      if (data.categories && data.categories.length > 0) {
        setCategories(data.categories);
      }
      setRevealedClues(data.revealed_clues || []);
      setScores(data.scores || {});
      setPlayerNames(data.player_names || {});
    });

    // Handle clue selected
    ws.on('clue_selected', (data) => {
      setSelectedClue(data.clue);
      setShowAnswer(data.show_answer);
    });

    // Handle next clue
    ws.on('next_clue', () => {
      setSelectedClue(null);
      setShowAnswer(false);
    });

    // Handle scores update
    ws.on('scores_update', (data) => {
      setScores(data.scores);
    });

    // Handle player joined
    ws.on('player_joined', (data) => {
      setPlayerNames(prev => ({
        ...prev,
        [data.player_number]: data.player_name
      }));
      setScores(prev => ({
        ...prev,
        [data.player_number]: 0
      }));
    });

    // Cleanup on unmount
    return () => {
      // Don't disconnect - host manages the connection
    };
  }, []);

  // ... rest of component remains the same ...
}
```

---

## Part E: Testing the Complete Flow

### Step 1: Start the Django Backend

First, ensure your Django Channels backend is running with Redis:

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start Django
cd /path/to/django/backend
python manage.py runserver
```

### Step 2: Start the Frontend

```bash
cd /path/to/frontend
npm run dev
```

### Step 3: Test Multiplayer Flow

**Testing Checklist:**

1. **Open Host View** (`http://localhost:5174/host/1/1`)
   - ✓ Host connects to WebSocket
   - ✓ Can start a round
   - ✓ Board displays categories

2. **Open Player Views** (in separate browser windows/tabs)
   - ✓ Player 1: `http://localhost:5174/player/Alice/1`
   - ✓ Player 2: `http://localhost:5174/player/Bob/2`
   - ✓ Player 3: `http://localhost:5174/player/Charlie/3`
   - ✓ Each player appears in host's player list

3. **Open Board View** (`http://localhost:5174/board/1/1`)
   - ✓ Board displays same categories as host
   - ✓ Scores display for all players

4. **Test Game Flow:**
   - Host clicks "SINGLE JEOPARDY" → All views update
   - Host clicks a clue → Board shows clue modal, Players see clue
   - Players buzz in → Host sees buzz queue
   - Host marks answer correct/incorrect → Scores update everywhere
   - Host clicks "Next Clue" → All views return to board

---

## Part F: Error Handling and Edge Cases

### Step 1: Add Connection Status Indicator

Create `src/components/ConnectionStatus/ConnectionStatus.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { GameWebSocket } from '../../services/websocket';
import './ConnectionStatus.css';

interface ConnectionStatusProps {
  ws: GameWebSocket;
}

export function ConnectionStatus({ ws }: ConnectionStatusProps) {
  const [connected, setConnected] = useState(ws.isConnected());

  useEffect(() => {
    const checkConnection = setInterval(() => {
      setConnected(ws.isConnected());
    }, 1000);

    return () => clearInterval(checkConnection);
  }, [ws]);

  return (
    <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
      <div className="status-indicator"></div>
      <span>{connected ? 'Connected' : 'Disconnected'}</span>
    </div>
  );
}
```

Create `src/components/ConnectionStatus/ConnectionStatus.css`:

```css
.connection-status {
  position: fixed;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: bold;
  z-index: 1000;
}

.connection-status.connected {
  background: #27ae60;
  color: white;
}

.connection-status.disconnected {
  background: #e74c3c;
  color: white;
}

.status-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: white;
}

.connection-status.connected .status-indicator {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Step 2: Add to Each View

Add to HostView, PlayerView, and BoardView:

```typescript
import { ConnectionStatus } from '../../components/ConnectionStatus/ConnectionStatus';

// ... in return statement:
return (
  <div className="host-view">
    <ConnectionStatus ws={wsRef.current} />
    {/* ... rest of view ... */}
  </div>
);
```

---

## Part G: Advanced Features

### Step 1: Add Daily Double Handling

In HostView, update handleClueClick:

```typescript
const handleClueClick = (clue: Clue) => {
  setSelectedClue(clue);
  setShowAnswer(false);
  setBuzzQueue([]);

  if (clue.is_daily_double) {
    // Send daily double notification
    wsRef.current.send('daily_double', {
      clue_id: clue.id,
      player_number: getCurrentPlayer() // Player who selected the clue
    });
  } else {
    wsRef.current.send('select_clue', {
      clue_id: clue.id,
      category_id: clue.id,
    });
  }
};
```

### Step 2: Add Final Jeopardy Workflow

Create Final Jeopardy handlers:

```typescript
const handleStartFinalJeopardy = () => {
  setCurrentRound('final');

  // Send final jeopardy start
  wsRef.current.send('start_final_jeopardy', {
    category: finalCategory,
    clue: finalClue
  });
};

const handleRevealFinalAnswers = () => {
  // Send reveal command
  wsRef.current.send('reveal_final_answers', {});
};
```

---

## Troubleshooting

### WebSocket Connection Issues

**Problem:** WebSocket fails to connect
**Solution:**
- Check Django Channels is running
- Verify Redis is running
- Check WebSocket URL matches your backend
- Look for CORS issues in browser console

**Problem:** Messages not received
**Solution:**
- Check message type matches between frontend and backend
- Verify JSON structure is correct
- Check Django consumer is handling the message type

**Problem:** Multiple reconnection attempts
**Solution:**
- Check network stability
- Verify backend isn't crashing
- Check Redis connection

### State Synchronization Issues

**Problem:** Views show different game states
**Solution:**
- Ensure all views connect to same WebSocket room
- Check that host broadcasts state changes
- Verify message handlers update state correctly

**Problem:** Scores don't update
**Solution:**
- Check score update messages are being sent
- Verify player_number matches across views
- Check state update logic in message handlers

---

## Summary

You've now completed Phase 4! Here's what you've built:

**What's Working:**
- ✅ Real-time WebSocket communication between all views
- ✅ Host can control the game and all views update
- ✅ Players can buzz in and host sees the queue
- ✅ Scores synchronize across all views
- ✅ Board displays live game state
- ✅ Connection status monitoring
- ✅ Automatic reconnection on disconnect

**Next Steps:**
- Add authentication and user management
- Implement Daily Double workflow
- Add Final Jeopardy functionality
- Add sound effects and animations
- Deploy to production
- Add game recording and replay features

The foundation for a complete multiplayer Jeopardy game is now in place!
