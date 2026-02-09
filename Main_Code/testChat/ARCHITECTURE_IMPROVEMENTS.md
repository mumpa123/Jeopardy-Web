# Jeopardy App v2 - Architecture Improvements & Redesign

## Executive Summary

This document outlines a comprehensive redesign of the Jeopardy web application, addressing critical issues in the current implementation and proposing modern architectural patterns for improved maintainability, robustness, and feature extensibility.

## Current Architecture Problems

### Critical Issues

1. **1,183-line monolithic template** - `game.html` contains all JavaScript logic, HTML templates, and UI code in one file
2. **No server-side game state** - All state management is client-side, creating synchronization issues
3. **Client-authoritative buzzer system** - Race conditions and timing bugs due to client-side buzz handling
4. **No game isolation** - All games share the same WebSocket room ("chat")
5. **Duplicated CSV parsing** - Same parsing logic in `host()` and `board()` views
6. **Unused database models** - Player model exists but isn't integrated
7. **jQuery and string template literals** - Outdated patterns, poor maintainability
8. **No error handling** - Network failures and disconnections not handled
9. **No authentication** - Anyone can be host or manipulate game state
10. **Hardcoded configuration** - IP addresses and secret keys in settings.py

### Performance & Latency Issues

- Buzzer timing relies on client setTimeout() - unreliable across devices
- No server-side timestamp validation for buzz order
- Large JSON payloads sent over WebSocket (entire game state on every update)
- No message compression or batching
- Redis used only as channel layer, not for state caching

---

## Proposed Architecture: Version 2.0

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (SPA)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Host View    │  │ Player View  │  │ Board View   │     │
│  │ (React/Vue)  │  │ (React/Vue)  │  │ (React/Vue)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │   API Gateway    │
                    │   (REST + WS)    │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│  Django REST   │  │  WebSocket      │  │  Background    │
│  API           │  │  Consumer       │  │  Tasks         │
│  (DRF)         │  │  (Channels)     │  │  (Celery)      │
└───────┬────────┘  └────────┬────────┘  └───────┬────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│  Game Engine   │  │  Redis Cache    │  │  PostgreSQL    │
│  (State Mgmt)  │  │  (Game State)   │  │  (Persistence) │
└────────────────┘  └─────────────────┘  └────────────────┘
```

---

## Detailed Component Design

### 1. Backend Architecture

#### 1.1 Database Schema

**New/Updated Models:**

```python
# users/models.py
class Player(models.Model):
    user = models.OneToOneField(User, on_delete=CASCADE, null=True, blank=True)
    display_name = models.CharField(max_length=50)
    guest_session = models.UUIDField(null=True, blank=True)  # For guest players
    total_games = models.IntegerField(default=0)
    total_score = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

# games/models.py
class Episode(models.Model):
    season_number = models.IntegerField()
    episode_number = models.IntegerField()
    air_date = models.DateField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('season_number', 'episode_number')

class Category(models.Model):
    name = models.CharField(max_length=200)
    episode = models.ForeignKey(Episode, on_delete=CASCADE)
    round_type = models.CharField(max_length=20)  # 'single', 'double', 'final'
    position = models.IntegerField()  # 0-5 for regular rounds

class Clue(models.Model):
    category = models.ForeignKey(Category, on_delete=CASCADE)
    question = models.TextField()
    answer = models.TextField()
    value = models.IntegerField()  # 200, 400, 600, 800, 1000 (or double)
    position = models.IntegerField()  # Position within category
    is_daily_double = models.BooleanField(default=False)
    air_order = models.IntegerField(null=True)  # Original air order if available

class Game(models.Model):
    game_id = models.UUIDField(default=uuid4, unique=True, db_index=True)
    episode = models.ForeignKey(Episode, on_delete=PROTECT)
    host = models.ForeignKey(Player, on_delete=SET_NULL, null=True, related_name='hosted_games')
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True)
    ended_at = models.DateTimeField(null=True)
    status = models.CharField(max_length=20, choices=[
        ('waiting', 'Waiting'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('abandoned', 'Abandoned')
    ])
    current_round = models.CharField(max_length=20)  # 'single', 'double', 'final'
    settings = models.JSONField(default=dict)  # Game configuration

class GameParticipant(models.Model):
    game = models.ForeignKey(Game, on_delete=CASCADE)
    player = models.ForeignKey(Player, on_delete=CASCADE)
    player_number = models.IntegerField()  # 1, 2, 3
    score = models.IntegerField(default=0)
    final_wager = models.IntegerField(null=True)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('game', 'player_number')

class GameAction(models.Model):
    """Audit trail of all game actions"""
    game = models.ForeignKey(Game, on_delete=CASCADE)
    participant = models.ForeignKey(GameParticipant, on_delete=SET_NULL, null=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    action_type = models.CharField(max_length=50)  # 'buzz', 'answer', 'score_change', etc.
    data = models.JSONField()  # Action-specific data
    server_timestamp_us = models.BigIntegerField()  # Microsecond precision for buzzer

class ClueReveal(models.Model):
    """Track which clues have been revealed in a game"""
    game = models.ForeignKey(Game, on_delete=CASCADE)
    clue = models.ForeignKey(Clue, on_delete=PROTECT)
    revealed_at = models.DateTimeField(auto_now_add=True)
    revealed_by = models.ForeignKey(GameParticipant, on_delete=SET_NULL, null=True)
    buzz_winner = models.ForeignKey(GameParticipant, on_delete=SET_NULL, null=True, related_name='won_buzzes')
    correct = models.BooleanField(null=True)
```

#### 1.2 Game Engine (Server-Side State Management)

Create a dedicated game engine service:

```python
# games/engine.py
from typing import Optional, List
import time
from dataclasses import dataclass
from redis import Redis

@dataclass
class BuzzerState:
    locked: bool = False
    winner: Optional[int] = None  # player_number
    timestamp_us: Optional[int] = None
    buzzed_players: List[int] = None  # Order of buzzes

class GameStateManager:
    """
    Manages game state in Redis with PostgreSQL persistence
    """
    def __init__(self, game_id: str):
        self.game_id = game_id
        self.redis = Redis(connection_pool=get_redis_pool())
        self.state_key = f"game:{game_id}:state"
        self.buzzer_key = f"game:{game_id}:buzzer"
        self.lock_key = f"game:{game_id}:lock"

    def handle_buzz(self, player_number: int, client_timestamp: int) -> dict:
        """
        Server-authoritative buzz handling with microsecond precision
        Returns: {accepted: bool, position: int, winner: int}
        """
        server_timestamp_us = int(time.time() * 1_000_000)

        # Atomic buzz processing using Redis Lua script
        lua_script = """
        local buzzer_key = KEYS[1]
        local player = ARGV[1]
        local timestamp = ARGV[2]

        -- Check if buzzer is locked
        local locked = redis.call('HGET', buzzer_key, 'locked')
        if locked == '1' then
            return {0, -1, -1}  -- Not accepted
        end

        -- Check if player already buzzed
        local already_buzzed = redis.call('HEXISTS', buzzer_key, 'player:' .. player)
        if already_buzzed == 1 then
            return {0, -1, -1}  -- Already buzzed
        end

        -- Get current count of buzzed players
        local count = redis.call('HINCRBY', buzzer_key, 'count', 1)

        -- Record this buzz
        redis.call('HSET', buzzer_key, 'player:' .. player, timestamp)
        redis.call('RPUSH', buzzer_key .. ':order', player)

        -- If first buzz, lock the buzzer and set winner
        if count == 1 then
            redis.call('HSET', buzzer_key, 'locked', '1')
            redis.call('HSET', buzzer_key, 'winner', player)
            return {1, count, player}  -- Accepted, position, winner
        end

        return {1, count, -1}  -- Accepted but not winner
        """

        result = self.redis.eval(lua_script, 1, self.buzzer_key,
                                player_number, server_timestamp_us)

        # Log to database
        if result[0] == 1:  # Accepted
            GameAction.objects.create(
                game_id=self.game_id,
                participant_id=self._get_participant_id(player_number),
                action_type='buzz',
                data={'position': result[1]},
                server_timestamp_us=server_timestamp_us
            )

        return {
            'accepted': bool(result[0]),
            'position': result[1],
            'winner': result[2] if result[2] > 0 else None,
            'server_timestamp_us': server_timestamp_us
        }

    def reset_buzzer(self):
        """Reset buzzer state for next clue"""
        self.redis.delete(self.buzzer_key)
        self.redis.delete(f"{self.buzzer_key}:order")

    def get_game_state(self) -> dict:
        """Retrieve current game state from Redis"""
        state = self.redis.hgetall(self.state_key)
        return {k.decode(): v.decode() for k, v in state.items()}

    def update_game_state(self, updates: dict):
        """Update game state atomically"""
        pipeline = self.redis.pipeline()
        for key, value in updates.items():
            pipeline.hset(self.state_key, key, value)
        pipeline.execute()
```

#### 1.3 WebSocket Consumer (Refactored)

```python
# games/consumers.py
import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from .engine import GameStateManager
from .serializers import GameStateSerializer

class GameConsumer(AsyncJsonWebsocketConsumer):
    """
    Improved WebSocket consumer with proper error handling,
    authentication, and game room isolation
    """

    async def connect(self):
        self.game_id = self.scope['url_route']['kwargs']['game_id']
        self.user = self.scope.get('user')
        self.player_number = None
        self.role = None

        # Validate game exists and user has permission
        game_data = await self.validate_game_access()
        if not game_data:
            await self.close(code=4003)  # Forbidden
            return

        self.room_group_name = f"game_{self.game_id}"
        self.role = game_data['role']
        self.player_number = game_data.get('player_number')

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send current game state to newly connected client
        state = await self.get_game_state()
        await self.send_json({
            'type': 'game_state',
            'data': state
        })

        # Notify others of connection
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'player_connected',
                'role': self.role,
                'player_number': self.player_number
            }
        )

    async def disconnect(self, close_code):
        # Notify others of disconnection
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'player_disconnected',
                    'role': self.role,
                    'player_number': self.player_number
                }
            )

            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive_json(self, content):
        """Route messages to appropriate handlers"""
        message_type = content.get('type')

        handlers = {
            'buzz': self.handle_buzz,
            'select_clue': self.handle_select_clue,
            'judge_answer': self.handle_judge_answer,
            'next_clue': self.handle_next_clue,
            'change_round': self.handle_change_round,
        }

        handler = handlers.get(message_type)
        if handler:
            try:
                await handler(content)
            except Exception as e:
                await self.send_json({
                    'type': 'error',
                    'message': str(e)
                })
        else:
            await self.send_json({
                'type': 'error',
                'message': f'Unknown message type: {message_type}'
            })

    async def handle_buzz(self, content):
        """Server-authoritative buzz handling"""
        if self.role != 'player':
            return

        game_engine = GameStateManager(self.game_id)
        result = await database_sync_to_async(game_engine.handle_buzz)(
            self.player_number,
            content.get('client_timestamp', 0)
        )

        # Broadcast buzz result to all clients
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'buzz_result',
                'player_number': self.player_number,
                'accepted': result['accepted'],
                'winner': result['winner'],
                'position': result['position'],
                'server_timestamp': result['server_timestamp_us']
            }
        )

    async def handle_select_clue(self, content):
        """Host selects a clue to reveal"""
        if self.role != 'host':
            return

        clue_id = content.get('clue_id')
        game_engine = GameStateManager(self.game_id)

        # Get clue data and update state
        clue_data = await self.get_clue_data(clue_id)
        await database_sync_to_async(game_engine.update_game_state)({
            'current_clue': clue_id,
            'buzzer_active': True
        })
        await database_sync_to_async(game_engine.reset_buzzer)()

        # Broadcast clue to all clients (without answer for players/board)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'clue_revealed',
                'clue': clue_data
            }
        )

    async def handle_judge_answer(self, content):
        """Host judges answer as correct or incorrect"""
        if self.role != 'host':
            return

        player_number = content.get('player_number')
        correct = content.get('correct')
        value = content.get('value')

        # Update score
        await self.update_player_score(player_number, value, correct)

        # Broadcast result
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'answer_judged',
                'player_number': player_number,
                'correct': correct,
                'value': value
            }
        )

    # Channel layer message handlers
    async def buzz_result(self, event):
        await self.send_json(event)

    async def clue_revealed(self, event):
        # Filter answer based on role
        clue = event['clue'].copy()
        if self.role != 'host':
            clue.pop('answer', None)
        await self.send_json({'type': 'clue_revealed', 'clue': clue})

    async def answer_judged(self, event):
        await self.send_json(event)

    async def player_connected(self, event):
        await self.send_json(event)

    async def player_disconnected(self, event):
        await self.send_json(event)

    # Database helpers
    @database_sync_to_async
    def validate_game_access(self):
        # Implementation
        pass

    @database_sync_to_async
    def get_game_state(self):
        # Implementation
        pass

    @database_sync_to_async
    def get_clue_data(self, clue_id):
        # Implementation
        pass

    @database_sync_to_async
    def update_player_score(self, player_number, value, correct):
        # Implementation
        pass
```

#### 1.4 REST API (Django REST Framework)

```python
# games/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Game, Episode, Player
from .serializers import GameSerializer, EpisodeSerializer, PlayerSerializer
from .engine import GameStateManager

class GameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all()
    serializer_class = GameSerializer
    lookup_field = 'game_id'

    @action(detail=False, methods=['post'])
    def create_game(self, request):
        """Create a new game instance"""
        episode_id = request.data.get('episode_id')
        host_id = request.data.get('host_id')

        game = Game.objects.create(
            episode_id=episode_id,
            host_id=host_id,
            status='waiting'
        )

        # Initialize game state in Redis
        game_engine = GameStateManager(str(game.game_id))
        game_engine.update_game_state({
            'status': 'waiting',
            'current_round': 'single',
            'current_clue': None
        })

        return Response(
            GameSerializer(game).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def join_game(self, request, game_id=None):
        """Player joins a game"""
        game = self.get_object()
        player_id = request.data.get('player_id')
        display_name = request.data.get('display_name')

        # Find available player slot
        existing_players = GameParticipant.objects.filter(game=game).count()
        if existing_players >= 3:
            return Response(
                {'error': 'Game is full'},
                status=status.HTTP_400_BAD_REQUEST
            )

        participant = GameParticipant.objects.create(
            game=game,
            player_id=player_id,
            player_number=existing_players + 1
        )

        return Response({
            'game_id': str(game.game_id),
            'player_number': participant.player_number,
            'role': 'player'
        })

    @action(detail=True, methods=['get'])
    def state(self, request, game_id=None):
        """Get current game state"""
        game = self.get_object()
        game_engine = GameStateManager(str(game.game_id))
        state = game_engine.get_game_state()

        # Augment with database data
        participants = GameParticipant.objects.filter(game=game).select_related('player')
        state['players'] = [
            {
                'player_number': p.player_number,
                'name': p.player.display_name,
                'score': p.score
            }
            for p in participants
        ]

        return Response(state)

class EpisodeViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Episode.objects.all().prefetch_related('category_set__clue_set')
    serializer_class = EpisodeSerializer

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search episodes by season/episode number"""
        season = request.query_params.get('season')
        episode = request.query_params.get('episode')

        queryset = self.get_queryset()
        if season:
            queryset = queryset.filter(season_number=season)
        if episode:
            queryset = queryset.filter(episode_number=episode)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
```

### 2. Frontend Architecture

#### 2.1 Technology Stack

**Recommended: React with TypeScript**

Reasons:
- Strong typing reduces bugs
- Component-based architecture improves maintainability
- Large ecosystem and community
- Excellent WebSocket support
- Good testing tools

**Alternative: Vue 3 with TypeScript** (lighter weight, easier learning curve)

#### 2.2 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/          # Reusable components
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   └── Modal.tsx
│   │   ├── game/
│   │   │   ├── Board.tsx           # Game board display
│   │   │   ├── ClueCard.tsx        # Individual clue card
│   │   │   ├── CategoryHeader.tsx
│   │   │   ├── ScoreDisplay.tsx
│   │   │   └── PlayerBadge.tsx
│   │   ├── host/
│   │   │   ├── HostDashboard.tsx   # Host control panel
│   │   │   ├── ClueSelector.tsx
│   │   │   ├── AnswerJudge.tsx
│   │   │   └── GameControls.tsx
│   │   ├── player/
│   │   │   ├── PlayerView.tsx      # Player interface
│   │   │   ├── BuzzButton.tsx
│   │   │   └── WagerInput.tsx
│   │   └── lobby/
│   │       ├── GameLobby.tsx       # Waiting room
│   │       ├── EpisodeSelector.tsx
│   │       └── PlayerList.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts         # WebSocket connection
│   │   ├── useGameState.ts         # Game state management
│   │   ├── useBuzzer.ts            # Buzzer functionality
│   │   └── useAudio.ts             # Sound effects
│   ├── services/
│   │   ├── api.ts                  # REST API client
│   │   ├── websocket.ts            # WebSocket client
│   │   └── audio.ts                # Audio playback
│   ├── store/
│   │   ├── gameSlice.ts            # Redux/Zustand state
│   │   ├── playerSlice.ts
│   │   └── uiSlice.ts
│   ├── types/
│   │   ├── game.ts                 # Type definitions
│   │   ├── api.ts
│   │   └── websocket.ts
│   ├── utils/
│   │   ├── timing.ts               # Timing utilities
│   │   ├── validation.ts
│   │   └── formatting.ts
│   └── views/
│       ├── HostView.tsx
│       ├── PlayerView.tsx
│       ├── BoardView.tsx
│       └── LobbyView.tsx
├── public/
│   ├── sounds/                     # Audio files
│   └── images/                     # Static images
└── tests/
    ├── components/
    ├── hooks/
    └── integration/
```

#### 2.3 Key Frontend Components

**WebSocket Hook with Reconnection:**

```typescript
// hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';
import { WebSocketMessage } from '../types/websocket';

interface UseWebSocketOptions {
  gameId: string;
  onMessage: (message: WebSocketMessage) => void;
  onConnectionChange: (connected: boolean) => void;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export function useWebSocket({
  gameId,
  onMessage,
  onConnectionChange,
  reconnectAttempts = 5,
  reconnectDelay = 2000
}: UseWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const reconnectTimeout = useRef<NodeJS.Timeout>();

  const connect = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/game/${gameId}/`;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      setReconnectCount(0);
      onConnectionChange(true);
    };

    ws.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      onMessage(message);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      onConnectionChange(false);

      // Attempt reconnection
      if (reconnectCount < reconnectAttempts) {
        reconnectTimeout.current = setTimeout(() => {
          console.log(`Reconnecting... (${reconnectCount + 1}/${reconnectAttempts})`);
          setReconnectCount(prev => prev + 1);
          connect();
        }, reconnectDelay * (reconnectCount + 1)); // Exponential backoff
      }
    };
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [gameId]);

  const sendMessage = (message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket not connected');
    }
  };

  return { connected, sendMessage };
}
```

**Optimized Buzzer Component:**

```typescript
// components/player/BuzzButton.tsx
import React, { useCallback, useRef, useState } from 'react';
import { useGameState } from '../../hooks/useGameState';

interface BuzzButtonProps {
  playerNumber: number;
  onBuzz: (timestamp: number) => void;
}

export const BuzzButton: React.FC<BuzzButtonProps> = ({ playerNumber, onBuzz }) => {
  const { buzzerLocked, currentClue } = useGameState();
  const [buzzed, setBuzzed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleBuzz = useCallback(() => {
    if (buzzerLocked || !currentClue || buzzed) {
      return;
    }

    // Use high-resolution timestamp
    const timestamp = performance.now();

    setBuzzed(true);
    onBuzz(timestamp);

    // Reset after server response or timeout
    setTimeout(() => setBuzzed(false), 3000);
  }, [buzzerLocked, currentClue, buzzed, onBuzz]);

  // Keyboard support for faster buzzing
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        handleBuzz();
      }
    };

    if (!buzzerLocked && currentClue) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [buzzerLocked, currentClue, handleBuzz]);

  return (
    <button
      ref={buttonRef}
      onClick={handleBuzz}
      disabled={buzzerLocked || !currentClue || buzzed}
      className={`buzz-button ${buzzed ? 'buzzed' : ''} ${buzzerLocked ? 'locked' : ''}`}
    >
      {buzzed ? 'BUZZED!' : 'BUZZ'}
    </button>
  );
};
```

### 3. Performance & Latency Optimizations

#### 3.1 WebSocket Optimizations

1. **Message Compression**: Enable per-message compression
   ```python
   # settings.py
   CHANNEL_LAYERS = {
       "default": {
           "BACKEND": "channels_redis.core.RedisChannelLayer",
           "CONFIG": {
               "hosts": [("127.0.0.1", 6379)],
               "capacity": 1500,
               "expiry": 10,
               "compression": "gzip",  # Enable compression
           },
       },
   }
   ```

2. **Binary Protocol**: Use MessagePack instead of JSON for smaller payloads
   ```python
   import msgpack

   # In consumer
   async def receive(self, bytes_data=None):
       if bytes_data:
           content = msgpack.unpackb(bytes_data)
   ```

3. **Delta Updates**: Send only changed data, not full state
   ```typescript
   // Instead of sending full game state:
   // { players: [...], board: [...], scores: [...] }

   // Send delta:
   // { type: 'score_update', player: 1, delta: 200 }
   ```

#### 3.2 Buzzer Latency Reduction

1. **Client-side prediction**: Show immediate feedback, confirm with server
2. **UDP option**: For ultra-low latency, consider WebRTC DataChannels
3. **Hardware integration**: Support USB buzzers via WebHID API
4. **Network prioritization**: Use WebSocket priority frames if available

```typescript
// components/player/BuzzButton.tsx - with prediction
const handleBuzz = async () => {
  // Optimistic UI update
  setLocalBuzzState('pending');
  playBuzzSound();

  // Send to server
  const clientTimestamp = performance.now();
  sendMessage({
    type: 'buzz',
    player_number: playerNumber,
    client_timestamp: clientTimestamp
  });

  // Wait for server confirmation (with timeout)
  const confirmed = await waitForConfirmation(1000);

  if (confirmed.accepted) {
    setLocalBuzzState(confirmed.winner === playerNumber ? 'winner' : 'buzzed');
  } else {
    // Revert optimistic update
    setLocalBuzzState('rejected');
    playErrorSound();
  }
};
```

#### 3.3 Database Optimizations

1. **Eager loading**: Use `select_related()` and `prefetch_related()`
2. **Caching**: Cache episode/clue data in Redis (rarely changes)
3. **Connection pooling**: Use pgBouncer for PostgreSQL
4. **Read replicas**: Separate read and write databases for scaling

```python
# games/views.py
from django.core.cache import cache

def get_episode_data(episode_id):
    cache_key = f'episode:{episode_id}'
    data = cache.get(cache_key)

    if not data:
        episode = Episode.objects.prefetch_related(
            'category_set__clue_set'
        ).get(id=episode_id)
        data = EpisodeSerializer(episode).data
        cache.set(cache_key, data, 60 * 60 * 24)  # Cache for 24 hours

    return data
```

#### 3.4 Frontend Performance

1. **Code splitting**: Lazy load routes
   ```typescript
   const HostView = React.lazy(() => import('./views/HostView'));
   const PlayerView = React.lazy(() => import('./views/PlayerView'));
   ```

2. **Memoization**: Prevent unnecessary re-renders
   ```typescript
   const ClueCard = React.memo(({ clue, onClick }) => {
     return <div onClick={onClick}>{clue.value}</div>;
   });
   ```

3. **Virtual scrolling**: For episode/game lists
4. **Service worker**: Cache static assets and enable offline mode

### 4. Data Migration Strategy

#### 4.1 CSV Import Script

```python
# management/commands/import_episodes.py
from django.core.management.base import BaseCommand
from games.models import Episode, Category, Clue
import csv
import glob

class Command(BaseCommand):
    help = 'Import Jeopardy episodes from CSV files'

    def add_arguments(self, parser):
        parser.add_argument('--path', type=str, default='chat/jeopardy_clue_data/')

    def handle(self, *args, **options):
        path = options['path']

        # Find all CSV files
        csv_files = glob.glob(f'{path}/**/episode_*.csv', recursive=True)

        for csv_file in csv_files:
            self.stdout.write(f'Processing {csv_file}...')

            # Extract season and episode from filename
            # e.g., "season_1/episode_5.csv"
            parts = csv_file.split('/')
            season_num = int(parts[-2].replace('season_', ''))
            episode_num = int(parts[-1].replace('episode_', '').replace('.csv', ''))

            with open(csv_file, 'r') as f:
                reader = csv.reader(f, delimiter='|')
                row = next(reader)

                # Create episode
                episode, created = Episode.objects.get_or_create(
                    season_number=season_num,
                    episode_number=episode_num
                )

                if not created:
                    self.stdout.write(f'  Episode already exists, skipping')
                    continue

                # Parse data
                self._parse_episode_data(episode, row)

                self.stdout.write(self.style.SUCCESS(f'  Imported episode {season_num}-{episode_num}'))

    def _parse_episode_data(self, episode, row):
        # Single Jeopardy
        single_cats = row[0:6]
        single_clues = row[6:36]
        single_answers = row[36:66]

        for i, cat_name in enumerate(single_cats):
            cat = Category.objects.create(
                episode=episode,
                name=self._clean_text(cat_name),
                round_type='single',
                position=i
            )

            # Create 5 clues for this category
            for j in range(5):
                clue_idx = i + (j * 6)
                Clue.objects.create(
                    category=cat,
                    question=self._clean_text(single_clues[clue_idx]),
                    answer=self._clean_text(single_answers[clue_idx]),
                    value=(j + 1) * 200,
                    position=j
                )

        # Double Jeopardy
        double_cats = row[66:72]
        double_clues = row[72:102]
        double_answers = row[102:132]

        for i, cat_name in enumerate(double_cats):
            cat = Category.objects.create(
                episode=episode,
                name=self._clean_text(cat_name),
                round_type='double',
                position=i
            )

            for j in range(5):
                clue_idx = i + (j * 6)
                Clue.objects.create(
                    category=cat,
                    question=self._clean_text(double_clues[clue_idx]),
                    answer=self._clean_text(double_answers[clue_idx]),
                    value=(j + 1) * 400,
                    position=j
                )

        # Final Jeopardy
        final_cat = Category.objects.create(
            episode=episode,
            name=self._clean_text(row[132]),
            round_type='final',
            position=0
        )

        Clue.objects.create(
            category=final_cat,
            question=self._clean_text(row[133]),
            answer=self._clean_text(row[134]),
            value=0,  # Wagered amount
            position=0
        )

    def _clean_text(self, text):
        """Remove byte string markers and quotes"""
        return text.strip("b'\"").replace("\\'", "'")
```

Run with:
```bash
python manage.py import_episodes --path chat/jeopardy_clue_data/
```

### 5. Testing Strategy

#### 5.1 Backend Tests

```python
# games/tests/test_buzzer.py
from django.test import TestCase
from games.engine import GameStateManager
from games.models import Game
import time

class BuzzerTestCase(TestCase):
    def setUp(self):
        self.game = Game.objects.create(status='active')
        self.engine = GameStateManager(str(self.game.game_id))

    def test_first_buzz_wins(self):
        """First player to buzz should win"""
        result1 = self.engine.handle_buzz(1, int(time.time() * 1_000_000))
        result2 = self.engine.handle_buzz(2, int(time.time() * 1_000_000))

        self.assertTrue(result1['accepted'])
        self.assertEqual(result1['winner'], 1)
        self.assertTrue(result2['accepted'])
        self.assertIsNone(result2['winner'])

    def test_buzzer_locks_on_first_buzz(self):
        """Buzzer should lock after first buzz"""
        self.engine.handle_buzz(1, int(time.time() * 1_000_000))

        # Subsequent buzzes should still be recorded but buzzer is locked
        result = self.engine.handle_buzz(2, int(time.time() * 1_000_000))
        self.assertTrue(result['accepted'])
        self.assertIsNone(result['winner'])

    def test_duplicate_buzz_rejected(self):
        """Same player cannot buzz twice"""
        self.engine.handle_buzz(1, int(time.time() * 1_000_000))
        result = self.engine.handle_buzz(1, int(time.time() * 1_000_000))

        self.assertFalse(result['accepted'])
```

#### 5.2 Frontend Tests

```typescript
// components/player/__tests__/BuzzButton.test.tsx
import { render, fireEvent, waitFor } from '@testing-library/react';
import { BuzzButton } from '../BuzzButton';

describe('BuzzButton', () => {
  it('calls onBuzz when clicked', () => {
    const onBuzz = jest.fn();
    const { getByText } = render(
      <BuzzButton playerNumber={1} onBuzz={onBuzz} />
    );

    fireEvent.click(getByText('BUZZ'));

    expect(onBuzz).toHaveBeenCalledTimes(1);
    expect(onBuzz).toHaveBeenCalledWith(expect.any(Number));
  });

  it('disables button when buzzer is locked', () => {
    const onBuzz = jest.fn();
    const { getByText } = render(
      <BuzzButton
        playerNumber={1}
        onBuzz={onBuzz}
        buzzerLocked={true}
      />
    );

    const button = getByText('BUZZ');
    expect(button).toBeDisabled();
  });

  it('responds to keyboard input', () => {
    const onBuzz = jest.fn();
    render(<BuzzButton playerNumber={1} onBuzz={onBuzz} />);

    fireEvent.keyDown(window, { code: 'Space' });

    expect(onBuzz).toHaveBeenCalled();
  });
});
```

### 6. Deployment & DevOps

#### 6.1 Docker Configuration

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Run migrations and collect static files
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "testChat.asgi:application"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: jeopardy
      POSTGRES_USER: jeopardy
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  web:
    build: .
    command: daphne -b 0.0.0.0 -p 8000 testChat.asgi:application
    volumes:
      - .:/app
      - static_volume:/app/staticfiles
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://jeopardy:${DB_PASSWORD}@db:5432/jeopardy
      - REDIS_URL=redis://redis:6379/0
      - SECRET_KEY=${SECRET_KEY}
      - DEBUG=False
    depends_on:
      - db
      - redis

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - static_volume:/static
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - web

volumes:
  postgres_data:
  redis_data:
  static_volume:
```

#### 6.2 Environment Configuration

```python
# settings.py - Use environment variables
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY')
DEBUG = os.environ.get('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', '').split(',')

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'jeopardy'),
        'USER': os.environ.get('DB_USER', 'jeopardy'),
        'PASSWORD': os.environ.get('DB_PASSWORD'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# Redis
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [REDIS_URL],
        },
    },
}
```

### 7. Additional Features

#### 7.1 Authentication & Authorization

```python
# users/models.py
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    is_host = models.BooleanField(default=False)
    can_create_games = models.BooleanField(default=True)

# games/permissions.py
from rest_framework import permissions

class IsHostOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.host.user == request.user
```

#### 7.2 Game Lobby System

```python
# games/models.py
class GameLobby(models.Model):
    lobby_code = models.CharField(max_length=6, unique=True)  # e.g., "ABC123"
    game = models.OneToOneField(Game, on_delete=CASCADE)
    max_players = models.IntegerField(default=3)
    is_public = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    def generate_code(self):
        import random, string
        return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
```

#### 7.3 Statistics & Leaderboards

```python
# games/models.py
class PlayerStatistics(models.Model):
    player = models.OneToOneField(Player, on_delete=CASCADE)
    games_played = models.IntegerField(default=0)
    games_won = models.IntegerField(default=0)
    total_earnings = models.BigIntegerField(default=0)
    average_score = models.FloatField(default=0.0)
    buzz_accuracy = models.FloatField(default=0.0)  # % of buzzes that were correct
    favorite_categories = models.JSONField(default=list)

    def update_stats(self, game_result):
        self.games_played += 1
        if game_result['won']:
            self.games_won += 1
        self.total_earnings += game_result['score']
        self.average_score = self.total_earnings / self.games_played
        self.save()
```

#### 7.4 Spectator Mode

```python
# games/consumers.py - Add spectator role
class GameConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        # ... existing code ...

        if self.role == 'spectator':
            # Spectators can watch but not interact
            await self.channel_layer.group_add(
                f"{self.room_group_name}_spectators",
                self.channel_name
            )
```

### 8. Migration Plan

#### Phase 1: Foundation (Weeks 1-2)
- Set up new Django project with DRF
- Create database models
- Write CSV import script
- Import all episode data
- Set up Redis and basic WebSocket consumer

#### Phase 2: Backend Core (Weeks 3-4)
- Implement GameStateManager with Redis
- Build REST API endpoints
- Create server-authoritative buzzer system
- Write backend tests
- Set up Docker environment

#### Phase 3: Frontend Foundation (Weeks 5-6)
- Initialize React/TypeScript project
- Create component library
- Build WebSocket hooks
- Implement basic routing

#### Phase 4: Game Implementation (Weeks 7-9)
- Build host interface
- Build player interface
- Build board display
- Integrate all three with WebSocket
- Add audio and animations

#### Phase 5: Polish & Testing (Weeks 10-11)
- End-to-end testing
- Performance optimization
- Bug fixes
- UI/UX improvements
- Documentation

#### Phase 6: Deployment (Week 12)
- Production configuration
- Deploy to staging
- Load testing
- Deploy to production
- Monitor and iterate

---

## Summary of Key Improvements

### Architecture
✅ **Separation of Concerns**: Frontend/backend split with clear API boundaries
✅ **Server-Side State**: Authoritative game state in Redis + PostgreSQL
✅ **Type Safety**: TypeScript frontend, validated API schemas
✅ **Modularity**: Component-based frontend, reusable Django apps

### Performance
✅ **Reduced Latency**: Server-authoritative buzzer with microsecond precision
✅ **Optimized WebSocket**: Compression, binary protocol, delta updates
✅ **Database Optimization**: Eager loading, caching, connection pooling
✅ **Frontend Performance**: Code splitting, memoization, virtual scrolling

### Robustness
✅ **Error Handling**: Reconnection logic, graceful degradation
✅ **Data Persistence**: All game actions logged to database
✅ **Authentication**: User accounts and permissions
✅ **Testing**: Comprehensive unit and integration tests

### Maintainability
✅ **Code Organization**: Clear file structure, small focused components
✅ **Documentation**: API docs, code comments, type definitions
✅ **Configuration**: Environment variables, Docker setup
✅ **Modern Stack**: Current best practices and tools

### Features
✅ **Game Isolation**: Multiple concurrent games with unique rooms
✅ **Lobby System**: Easy game creation and joining
✅ **Statistics**: Player stats and leaderboards
✅ **Spectator Mode**: Watch games without playing
✅ **Reconnection**: Rejoin games after disconnection

This redesign transforms the application from a proof-of-concept into a production-ready, scalable system that can support many concurrent games with reliable timing, proper state management, and an excellent user experience.
