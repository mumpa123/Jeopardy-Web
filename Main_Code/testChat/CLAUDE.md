# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multiplayer Jeopardy! game web application built with Django and Django Channels. It allows a host, multiple players, and a display board to interact in real-time through WebSockets. The game uses historical Jeopardy! episode data stored in CSV files.

## Architecture

### Three-Role System

The application supports three distinct user roles, all rendered through `chat/templates/chat/game.html`:

1. **Host** (`/chat/host/<season>/<episode>/`): Controls the game, selects clues, judges answers, manages scoring
2. **Player** (`/chat/player/<name>/<number>/`): Buzzes in, submits answers, sees a simplified interface
3. **Board** (`/chat/board/<season>/<episode>/`): Display-only view shown to audience, renders clues and game state

All three roles connect to the same WebSocket room ("chat") and receive/send messages to synchronize game state.

### Real-Time Communication

- **WebSocket Consumer**: `chat/consumers.py` - `ChatConsumer` handles all WebSocket connections
- **Channel Layer**: Uses Redis (configured in `testChat/settings.py` on port 6379) for pub/sub messaging
- **ASGI Application**: `testChat/asgi.py` configures protocol routing for HTTP and WebSocket

### Data Structure

Game data is stored in CSV files at `chat/jeopardy_clue_data/season_X/episode_Y.csv`. Each CSV has a single row with pipe-delimited (`|`) fields in this order:

- Positions 0-5: Single Jeopardy categories (6 categories)
- Positions 6-35: Single Jeopardy clues (30 clues)
- Positions 36-65: Single Jeopardy answers (30 answers)
- Positions 66-71: Double Jeopardy categories (6 categories)
- Positions 72-101: Double Jeopardy clues (30 clues)
- Positions 102-131: Double Jeopardy answers (30 answers)
- Position 132: Final Jeopardy category
- Position 133: Final Jeopardy clue
- Position 134: Final Jeopardy answer

Clues are parsed in `chat/views.py` in the `host()` and `board()` views.

### Game Flow

1. Host loads `/chat/host/<season>/<episode>/` which parses the CSV and loads all game data
2. Players navigate to `/chat/player/<name>/<number>/` (player numbers 1-3)
3. Board loads `/chat/board/<season>/<episode>/` which also parses CSV data
4. All clients connect to WebSocket at `ws://host/ws/chat/test/`
5. Players click "Ready" button, which sends `{"type": "ready"}` message to host
6. Host clicks "SINGLE JEOPARDY" to start, which broadcasts board state to all clients
7. Host selects clues by clicking values, triggering `{"type": "clue_for_board"}` messages
8. Players buzz in by clicking "BUZZ!" button, sending `{"type": "buzz"}` with player info
9. Host marks answers correct/incorrect, updating scores locally and sending feedback
10. Host clicks "NEXT CLUE" to return to board, broadcasting updated scores and cleared clues
11. Process repeats for Double Jeopardy and Final Jeopardy rounds

### Message Types

The WebSocket protocol uses JSON messages with a `type` field. Key message types:

- `buzz`: Player buzzes in (includes player_name and player_num)
- `buzzed`: Confirmation that a buzz was accepted
- `ready`: Player signals readiness (includes player_name and player_num)
- `clue_for_board`: Host sends clue to display (includes game type, clue_num, dd flag)
- `return_to_board`: Returns to board view with updated scores and cleared clues
- `read`: Host finished reading clue, allows buzzing
- `give_red`: Signal incorrect answer with red border on board
- `single`/`double`/`final`: Round transition messages
- `final_clue`: Display Final Jeopardy clue
- `final_wager`: Player submits Final Jeopardy wager

## Common Commands

### Development Server

```bash
python manage.py runserver
# Or to allow network access:
python manage.py runserver 0.0.0.0:8000
```

### Database Management

```bash
# Apply migrations
python manage.py migrate

# Create migrations after model changes
python manage.py makemigrations

# Create superuser for admin panel
python manage.py createsuperuser
```

### Redis Dependency

The application requires Redis running on `127.0.0.1:6379` for Django Channels. Start Redis before running the server:

```bash
redis-server
```

## Key Files

- `chat/views.py`: Contains CSV parsing logic for game data (lines 10-174)
- `chat/templates/chat/game.html`: Single template for all three roles, with embedded JavaScript
- `chat/consumers.py`: WebSocket consumer handling real-time messaging
- `testChat/settings.py`: Django settings including ASGI_APPLICATION and CHANNEL_LAYERS configuration
- `testChat/asgi.py`: ASGI routing configuration (note: line 18 has incorrect setting name "mysite.settings")

## Important Notes

- The game uses Daphne as the ASGI server (listed first in INSTALLED_APPS)
- All game state is managed client-side in JavaScript; no server-side game state persistence
- The `Player` model in `chat/models.py` exists but is not used in the current implementation
- Daily Double locations are randomly selected client-side when starting Single/Double Jeopardy
- Score management is entirely handled by the host interface
- The SECRET_KEY in `testChat/settings.py` is exposed and should be changed for production
- ALLOWED_HOSTS includes a hardcoded IP address (192.168.1.33)

## Testing

The project uses Django's built-in test framework. Tests would be written in `chat/tests.py`:

```bash
# Run all tests
python manage.py test

# Run specific test file
python manage.py test chat

# Run specific test class or method
python manage.py test chat.tests.TestClassName.test_method_name
```

## Static Files

Static files are served from `chat/static/` and include:

- Custom CSS files (`board_style.css`, `main_clue.css`, `player.css`, `styles.css`)
- Custom fonts (Korinna font family)
- Audio files for game sounds (DD, Final Jeopardy, think music)
- Images (blank Jeopardy board, Daily Double image)

Static files URL is configured as `'chat/static/'` in settings.
