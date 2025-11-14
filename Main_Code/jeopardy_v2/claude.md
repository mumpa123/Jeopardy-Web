# Jeopardy Game Webserver - Project Documentation

## Project Overview

A full-stack multiplayer Jeopardy game system with real-time synchronization using WebSockets. Players can join games, buzz in to answer questions, and compete against each other while a host controls the game flow.

**Current Phase:** Phase 3 - Frontend Integration (Active Development)

---

## Tech Stack

### Backend
- **Django 4.2** - Web framework
- **Django REST Framework** - REST API
- **Django Channels** - WebSocket support via Daphne ASGI server
- **PostgreSQL** - Primary database (episodes, games, players, participants)
- **Redis** - Real-time game state management with atomic buzzer logic
- **Python 3.12** - Language

### Frontend
- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **WebSocket client** - Real-time communication

---

## Architecture

```
Frontend (React/Vite - Port 5173)
    ↓ HTTP REST API + WebSocket
Backend (Django/Daphne - Port 8000)
    ↓
PostgreSQL (Port 5432) - Persistent data
Redis (Port 6379) - Game state & buzzer logic
```

### Key Design Decisions

1. **Episode Data in PostgreSQL** - 7,524+ real Jeopardy episodes with categories and clues
2. **Game State in Redis** - Fast atomic operations for buzzer fairness (microsecond timestamps)
3. **WebSocket Broadcasting** - All game updates broadcast to connected clients via Django Channels
4. **Dynamic Game Creation** - Games created via API with random or selected episodes
5. **Guest Players** - No authentication required; players join with display names

---

## Current Status

### ✅ What's Working

1. **Game Creation**
   - Lobby screen with "Quick Play" (random episode) and episode selection
   - Games created via REST API with unique game_id (UUID)
   - Shareable links for all roles (host, players, board view)

2. **Player Joining**
   - Players enter name on join screen
   - API registers player and broadcasts to all clients
   - Host and board views show joined players
   - Player names and scores display on BoardView in real-time

3. **Real-time Game Flow**
   - Host reveals clues → all clients see the clue
   - **Buzzer Locking System** → Players cannot buzz until host finishes reading
   - Host clicks "Finished Reading" → Buzzer unlocks, red outline appears on active clue
   - Players buzz in → atomic Redis logic determines winner
   - Host judges answers → scores update everywhere
   - "Next Clue" returns all views to board

4. **Dynamic Episode Loading**
   - Views fetch real episode data from API (no mock data)
   - Categories filtered by round (single/double/final)
   - Board displays correct 6 categories for current round

5. **WebSocket Integration**
   - Automatic reconnection with exponential backoff
   - Type-safe message handling
   - Broadcast architecture (all clients get updates)
   - Real-time buzzer state management (locked/unlocked)

6. **UI Polish**
   - Fixed-height category headers with dynamic font scaling
   - Responsive design for different screen sizes
   - Player join screen with validation
   - **Full-screen clue modal** with Jeopardy blue background image
   - **ITC Korinna bold font** for authentic Jeopardy look
   - **Red pulsing outline** on active clue when buzzer enabled
   - All clue text displayed in uppercase
   - **Collapsible manual score adjustments** section on host view
   - Board and scores left-aligned on host view
   - Reorganized host controls (clue actions at top, game management at bottom)

7. **Session Persistence (NEW!)**
   - **Browser refresh support** - Players and host maintain sessions across refreshes
   - **Session recovery modal** - Shows "Continue as [Name]" or "Start New Session" on rejoin
   - **localStorage-based** - Persists across browser restarts
   - **Backend validation** - Sessions validated before reconnection
   - **Automatic cleanup** - Invalid sessions cleared and redirected to lobby
   - Works for both host and players

8. **Game Reset (NEW!)**
   - **Full game reset** - Clears all scores, revealed clues, resets to single jeopardy
   - **Broadcast to all clients** - All views update immediately
   - **Redis state reset** - Scores, game state, and buzzer all cleared
   - Host can reset game at any time via Game Controls section

9. **Manual Score Adjustments (NEW!)**
   - **WebSocket broadcasting** - Manual score adjustments sync to all clients
   - **Real-time updates** - PlayerView and BoardView receive score changes instantly
   - **Session sync maintained** - Score adjustments no longer break player sessions
   - Host can add/subtract points with +/- buttons

### 🚧 Known Issues / TODO

1. **Daily Double & Final Jeopardy**
   - Wagering UI exists but not connected
   - Need WebSocket handlers for wager submission
   - Need host controls for revealing DD/FJ

2. **Score Persistence to Database**
   - Scores live in Redis but not saved to DB on game end
   - GameParticipant model has `score` field but it's only updated on game completion
   - Need to implement final score persistence when game ends

3. **Round Switching**
   - Host can click "Start Round" buttons
   - Revealed_clues are cleared when switching rounds
   - Need to track revealed clues per round (currently resets entire list)

4. **Player Roster**
   - No dedicated visual player list/roster on host view (only shows in scores)
   - Consider adding a dedicated player management section

5. **Error Handling**
   - Limited error feedback to users
   - Need better handling of connection failures
   - Need reconnection status indicators

---

## Project Structure

```
jeopardy_v2/
├── backend/              # Django project settings
│   ├── settings.py      # CORS, Channels, DB config
│   ├── asgi.py          # WebSocket routing
│   └── urls.py          # Main URL routing
├── games/               # Core game logic app
│   ├── models.py        # Episode, Game, GameParticipant, etc.
│   ├── consumers.py     # WebSocket consumer (handles messages)
│   ├── engine.py        # GameStateManager (Redis operations)
│   └── routing.py       # WebSocket URL patterns
├── api/                 # REST API app
│   ├── views.py         # API endpoints (ViewSets)
│   ├── serializers.py   # DRF serializers
│   └── urls.py          # API routing
├── users/               # Player management
│   └── models.py        # Player model
├── frontend/            # React application
│   └── src/
│       ├── views/       # Page components
│       │   ├── GameLobby/    # Game creation
│       │   ├── HostView/     # Host control interface
│       │   ├── PlayerView/   # Player buzzer interface
│       │   └── BoardView/    # Display-only board
│       ├── components/  # Reusable UI components
│       │   ├── Board/        # ClueCard, Board, ClueModal
│       │   ├── Host/         # BuzzerQueue, GameControls, ClueDetail, etc.
│       │   ├── Player/       # BuzzButton, WagerInput, etc.
│       │   └── SessionConfirmation/  # Session recovery modal
│       ├── services/    # API and WebSocket clients
│       │   ├── api.ts           # REST API wrapper
│       │   ├── websocket.ts     # WebSocket client
│       │   └── sessionManager.ts # localStorage session management
│       └── types/       # TypeScript definitions
├── manage.py            # Django management
├── .env                 # Environment variables
├── STARTUP_GUIDE.md     # How to run the servers
└── claude.md            # This file
```

---

## Important Files

### Backend

**games/consumers.py** - WebSocket message handling
- Handles: `buzz`, `reveal_clue`, `enable_buzzer`, `judge_answer`, `next_clue`, `reset_game`, `adjust_score`
- Broadcasts: `buzz_result`, `clue_revealed`, `buzzer_enabled`, `answer_judged`, `return_to_board`, `player_joined`, `game_reset`, `score_adjusted`
- **IMPORTANT**: `get_participants()` method already has `@database_sync_to_async` decorator - don't wrap it again!

**games/engine.py** - Redis game state management
- `GameStateManager` class
- Atomic buzzer logic with Lua scripts (prevents race conditions)
- Score management (get_scores, update_score, set_score)
- State synchronization (get_state, update_state)
- Game reset (reset_game, reset_buzzer)
- Buzzer lock/unlock for reading control

**api/views.py** - REST API endpoints
- `EpisodeViewSet` - Episode CRUD + search/random
- `GameViewSet` - Game creation, join (supports rejoin), start, state, validate, validatePlayer
- `PlayerViewSet` - Player management (guest creation)

**backend/settings.py** - Key configurations
- `CORS_ALLOWED_ORIGINS` - Frontend URL (port 5173)
- `CHANNEL_LAYERS` - Redis config for Channels
- `DATABASES` - PostgreSQL connection

### Frontend

**services/api.ts** - REST API client
- `episodeAPI` - list, get, random, search
- `gameAPI` - list, get, create, join, start, getState, validate, validatePlayer
- `playerAPI` - list, get, createGuest

**services/sessionManager.ts** - Session persistence (NEW!)
- `saveSession()` - Save session to localStorage
- `getSession()` - Retrieve current session
- `clearSession()` - Clear session on logout/invalid
- `hasSession()` - Check if session exists
- `updateSession()` - Update existing session
- Stores: playerId, gameId, playerNumber, role, displayName, timestamp

**services/websocket.ts** - WebSocket client
- `GameWebSocket` class
- Auto-reconnection logic
- Type-safe message handling

**views/HostView/HostView.tsx** - Main game controller
- Loads episode data from API (does NOT initialize players to avoid race conditions)
- Controls game flow (reveal clues, enable buzzer, judge answers)
- Shows buzzer queue
- Manual score adjustments (broadcasts via WebSocket)
- Game management (reset game, end game, round switching)
- **Session persistence** - Saves host session, validates on refresh
- Players initialized from WebSocket `connection_established` message with Redis scores

**views/PlayerView/PlayerView.tsx** - Player interface
- Join screen with name input
- Buzz button (space bar supported)
- Score display (updates from WebSocket broadcasts)
- **Session persistence** - Saves player session, shows recovery modal on refresh
- **Session validation** - Checks game and player still exist before reconnecting
- Wager/answer inputs (not connected yet)

**views/BoardView/BoardView.tsx** - Display-only view
- For projection on screen
- No interactive controls
- Shows board, scores, clues
- Updates from WebSocket broadcasts (clue revealed, score adjusted, game reset)

---

## Development Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+ (running on port 5432)
- Redis 6+ (running on port 6379)

### Environment Variables (.env file)
```
DB_PASSWORD=jeopardy_user
SECRET_KEY=#$8hdi13=umt+gycl69v*67!u=n@oy#-u2i0ko)!rgt)qv*2^d
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

### Database Setup
```bash
# In PostgreSQL shell
CREATE DATABASE jeopardy_v2;
CREATE USER jeopardy_user WITH PASSWORD 'jeopardy_user';
GRANT ALL PRIVILEGES ON DATABASE jeopardy_v2 TO jeopardy_user;
```

### Running the Servers

**Terminal 1 - Backend:**
```bash
source venv/bin/activate
python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Access Points:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api
- Django Admin: http://localhost:8000/admin
- WebSocket: ws://localhost:8000/ws/game/{game_id}/

### Verify Services
```bash
# Check Node.js
node --version

# Check Redis
redis-cli ping  # Should return PONG

# Check PostgreSQL
pg_isready  # Should say "accepting connections"
```

---

## API Endpoints

### Episodes
- `GET /api/episodes/` - List episodes (paginated)
- `GET /api/episodes/{id}/` - Get episode with categories/clues
- `GET /api/episodes/random/` - Get random episode
- `GET /api/episodes/search/?season=1&episode=5` - Search episodes

### Games
- `GET /api/games/` - List games
- `POST /api/games/` - Create game (body: `{episode: id, settings: {...}}`)
- `GET /api/games/{game_id}/` - Get game details
- `POST /api/games/{game_id}/join/` - Join game (body: `{display_name: "Alice"}`) - Supports rejoining
- `POST /api/games/{game_id}/start/` - Start game
- `GET /api/games/{game_id}/state/` - Get game state
- `GET /api/games/{game_id}/validate/` - Validate game exists (returns `{valid: boolean}`)
- `POST /api/games/{game_id}/validate_player/` - Validate player in game (body: `{player_id: 1}`)

### Players
- `GET /api/players/` - List players
- `POST /api/players/create_guest/` - Create guest (body: `{display_name: "Alice"}`)

---

## WebSocket Messages

### Client → Server

**buzz**
```json
{
  "type": "buzz",
  "player_number": 1,
  "timestamp": 1699999999999
}
```

**reveal_clue**
```json
{
  "type": "reveal_clue",
  "clue_id": 12345
}
```

**judge_answer**
```json
{
  "type": "judge_answer",
  "player_number": 1,
  "correct": true,
  "value": 400
}
```

**next_clue**
```json
{
  "type": "next_clue"
}
```

**enable_buzzer**
```json
{
  "type": "enable_buzzer"
}
```

**reset_game** (NEW!)
```json
{
  "type": "reset_game"
}
```

**adjust_score** (NEW!)
```json
{
  "type": "adjust_score",
  "player_number": 1,
  "adjustment": 100
}
```

### Server → Client

**connection_established** (Updated!)
```json
{
  "type": "connection_established",
  "game_id": "uuid",
  "state": {...},
  "scores": {"1": 0, "2": 0, "3": 0},
  "players": {"1": "Alice", "2": "Bob", "3": "Charlie"}
}
```

**buzz_result**
```json
{
  "type": "buzz_result",
  "player_number": 1,
  "accepted": true,
  "winner": 1,
  "position": 1,
  "server_timestamp": 1699999999999999
}
```

**clue_revealed**
```json
{
  "type": "clue_revealed",
  "clue": {
    "id": 12345,
    "question": "This element has symbol Au",
    "answer": "What is Gold?",
    "value": 400,
    "is_daily_double": false,
    "category": "SCIENCE"
  }
}
```

**answer_judged**
```json
{
  "type": "answer_judged",
  "player_number": 1,
  "correct": true,
  "value": 400,
  "new_score": 400
}
```

**return_to_board**
```json
{
  "type": "return_to_board",
  "scores": {1: 400, 2: 0, 3: 0},
  "revealed_clues": [12345, 12346]
}
```

**player_joined**
```json
{
  "type": "player_joined",
  "player_number": 1,
  "player_name": "Alice"
}
```

**buzzer_enabled**
```json
{
  "type": "buzzer_enabled",
  "clue_id": 12345
}
```

**game_reset** (NEW!)
```json
{
  "type": "game_reset",
  "scores": {"1": 0, "2": 0, "3": 0},
  "players": {"1": "Alice", "2": "Bob", "3": "Charlie"}
}
```

**score_adjusted** (NEW!)
```json
{
  "type": "score_adjusted",
  "player_number": 1,
  "adjustment": 100,
  "new_score": 500
}
```

---

## Redis Data Structure

**Game State** - `game:{game_id}:state` (hash)
```
episode_id: "12345"
status: "active"
current_round: "single"
current_clue: "67890" (or empty string)
revealed_clues: "[12345, 12346]" (JSON array)
daily_doubles: "[12347]" (JSON array)
```

**Scores** - `game:{game_id}:scores` (hash)
```
1: "400"
2: "-200"
3: "600"
```

**Buzzer** - `game:{game_id}:buzzer` (hash)
```
count: "3"
locked: "true"
1_timestamp: "1699999999999999"
2_timestamp: "1700000000000001"
3_timestamp: "1700000000000002"
```

**Buzzer Order** - `game:{game_id}:buzzer:order` (list)
```
["1", "2", "3"]
```

**Expiration:** All game keys expire after 24 hours

---

## Common Tasks

### Add a New WebSocket Message Type

1. **Define type in TypeScript** (`frontend/src/types/WebSocket.ts`)
2. **Add handler in consumer** (`games/consumers.py`)
   - Add to `handlers` dict in `receive_json()`
   - Create `async def handle_message_name()` method
3. **Add broadcast handler** if needed
   - Create `async def message_name()` method (receives group_send)
4. **Update frontend** to send/receive the message

### Add a New API Endpoint

1. **Add action to ViewSet** (`api/views.py`)
   - Use `@action(detail=True/False, methods=['get'/'post'])`
2. **Add to API client** (`frontend/src/services/api.ts`)
3. **Update types** if needed (`frontend/src/types/Game.ts`)

### Fix a Bug in Game State

1. **Check Redis state** - Use `redis-cli` to inspect keys
2. **Check GameStateManager** (`games/engine.py`) - Look at get/update/reset methods
3. **Check consumer** (`games/consumers.py`) - Look at message handlers
4. **Check frontend** - Look at WebSocket message handlers in views

---

## Testing Flow

### Create and Play a Game

1. **Start servers** (backend + frontend)
2. **Open lobby** - http://localhost:5173/lobby
3. **Create game** - Click "Quick Play"
4. **Open host view** - Click "Join as Host" or copy host link
5. **Open player view** - Copy player link, open in new tab/window
6. **Join as player** - Enter name, click "Join Game"
7. **Play game:**
   - Host clicks a clue
   - Player buzzes in (space bar or button)
   - Host judges answer (correct/incorrect)
   - Host clicks "Next Clue"
8. **Check board view** - Open in another tab to see display-only mode

### Debug WebSocket Issues

1. **Open browser console** (F12)
2. **Look for log messages:**
   - `[HostView] Loading game data...`
   - `[PlayerView] WebSocket connected...`
   - `[BoardView] Received message: {...}`
3. **Check backend logs** for WebSocket connections/errors
4. **Check Redis** - `redis-cli` then `KEYS game:*`

---

## Database Models

### Episode
- `season_number`, `episode_number`, `air_date`
- Has many Categories

### Category
- `name`, `round_type` (single/double/final), `position`
- Belongs to Episode
- Has many Clues

### Clue
- `question`, `answer`, `value`, `position`, `is_daily_double`
- Belongs to Category

### Game
- `game_id` (UUID), `episode`, `host`, `status`, `current_round`, `settings`
- Has many GameParticipants
- Has many GameActions (audit log)

### GameParticipant
- `game`, `player`, `player_number`, `score`, `final_wager`
- Links Player to Game

### Player
- `display_name`, `guest_session`, `total_games`, `total_score`

---

## Next Steps / Priorities

### High Priority

1. **Daily Double Implementation**
   - Add wager submission via WebSocket
   - Update host view to handle DD flow
   - Update player view to show wager input
   - Detect DD clues and trigger special flow

2. **Final Jeopardy Implementation**
   - All players wager simultaneously
   - Text input for answers
   - Host reviews all answers
   - Special UI for FJ reveal

3. **Score Persistence to Database**
   - Update GameParticipant scores in DB when game ends
   - Add game completion handler
   - Save final scores and game statistics

### Medium Priority

4. **Round Management Improvements**
   - Track revealed clues per round (not just global list)
   - Better visual indication of current round
   - Prevent revealing clues from wrong round

5. **UI Polish**
   - Dedicated player roster section on host view
   - Better error messages and user feedback
   - Loading states for all async operations
   - Sound effects for buzzer
   - Animations for score changes

6. **Testing & Bug Fixes**
   - Test with 3 players simultaneously
   - Test reconnection handling after network issues
   - Test edge cases (all players buzz, no one buzzes, timeout scenarios)
   - Performance testing with multiple concurrent games

### Completed ✅

- ✅ Session persistence with browser refresh support
- ✅ Game reset functionality
- ✅ Manual score adjustments with broadcasting
- ✅ Host refresh without losing player scores
- ✅ Collapsible UI sections
- ✅ Board layout improvements

---

## Troubleshooting

### "Failed to load game data" in console
- Check if backend is running
- Check CORS configuration in `backend/settings.py`
- Verify game_id exists in database

### "WebSocket connection failed"
- Check if Redis is running (`redis-cli ping`)
- Check backend logs for Channels errors
- Verify game_id exists

### Categories showing "SCIENCE, HISTORY, GEOGRAPHY"
- Frontend fell back to mock data
- Check console for API errors
- Verify episode has categories in database

### Players not showing up
- Check if player joined successfully (API call)
- Check if WebSocket is connected (console logs)
- Verify `player_joined` message is being broadcast

### Buzzer not working
- Check if clue is revealed (canBuzz should be true)
- Check WebSocket connection
- Check Redis buzzer state (`redis-cli HGETALL game:{game_id}:buzzer`)

### Session not persisting on refresh
- Check browser console for session validation logs
- Verify localStorage has session data (DevTools > Application > Local Storage)
- Check backend logs for validation endpoint calls
- Ensure game_id and player_id are valid

### Score adjustments not syncing to other views
- Check if WebSocket is connected on all views
- Look for `score_adjusted` broadcast in browser console
- Verify Redis scores are updating (`redis-cli HGET game:{game_id}:scores {player_number}`)
- Ensure backend was restarted after code changes

### "sync_to_async can only be applied to sync functions" error
- This means a method with `@database_sync_to_async` decorator is being wrapped again
- Check consumers.py - `get_participants()` already has the decorator, don't wrap it
- Remove the extra `database_sync_to_async()` call

---

## Git Status

- **Main branch:** `main`
- **Current branch:** `main`
- **Status:** Clean working directory
- **Recent commits:**
  - bc620cbb: First Commit
  - 54dcc926: Create jeopardy_web_scraper.py
  - df0b751b: all_Code

---

## Contact & Resources

- Django Channels Docs: https://channels.readthedocs.io/
- Django REST Framework: https://www.django-rest-framework.org/
- React Router: https://reactrouter.com/
- Redis Commands: https://redis.io/commands/

---

**Last Updated:** 2025-11-12
**Current Phase:** Frontend Integration - Player join working, buzzer functional, basic game flow complete
