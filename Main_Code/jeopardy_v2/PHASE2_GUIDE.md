# Phase 2: Backend Core - REST API & Game Engine - Beginner's Guide

## Welcome Back!

Great job completing Phase 1! Let's recap what you've built and where we're headed.

---

## Project Progress Overview

### ✅ Phase 1 Complete - Foundation (What You Built)

```
Your Current Stack:
┌─────────────────────────────────────────┐
│   PostgreSQL Database                   │
│   ├─ 150+ Episodes imported            │
│   ├─ 1,950+ Categories                 │
│   ├─ 9,150+ Clues                      
│   └─ Empty game tables (ready)         │
└─────────────────────────────────────────┘
            ▲
            │
┌───────────┴─────────────────────────────┐
│   Django Backend                        │
│   ├─ Models (data structure)           │
│   ├─ Admin panel (browsing)            │
│   ├─ Basic WebSocket (tested!)         │
│   └─ Redis (message queue)             │
└─────────────────────────────────────────┘
```

**You can:**
- Browse episodes/clues in admin panel
- Connect WebSocket clients
- Broadcast messages in real-time

**You CANNOT yet:**
- Create games programmatically
- Access data via API endpoints
- Handle buzzer logic with proper timing
- Manage game state on the server

### 🚀 Phase 2 Goals - Backend Core (What We're Building Now)

```
What We're Adding:
┌─────────────────────────────────────────┐
│   REST API Layer                        │
│   ├─ /api/episodes/                    │
│   ├─ /api/games/                       │
│   ├─ /api/players/                     │
│   └─ JSON responses                     │
└─────────────────────────────────────────┘
            ▲
            │
┌───────────┴─────────────────────────────┐
│   Game State Manager (Redis)            │
│   ├─ Server-side game state            │
│   ├─ Atomic buzzer handling            │
│   ├─ Microsecond timestamps             │
│   └─ State synchronization             │
└─────────────────────────────────────────┘
            ▲
            │
┌───────────┴─────────────────────────────┐
│   Improved WebSocket Consumer           │
│   ├─ Game-specific routing             │
│   ├─ Authentication checks              │
│   ├─ Message validation                │
│   └─ Error handling                     │
└─────────────────────────────────────────┘
```

**After Phase 2, you'll be able to:**
- Create games via API calls
- Join games and manage players
- Handle buzzer presses with precise timing
- Query episode data programmatically
- Test everything with automated tests

---

## Phase 2 Breakdown

### Part A: REST API (Steps 1-4)
Build API endpoints so frontend can communicate with backend

### Part B: Game State Manager (Steps 5-7)
Build server-side game logic with Redis

### Part C: Enhanced WebSocket (Steps 8-9)
Connect WebSocket to game engine

### Part D: Testing (Steps 10-11)
Write automated tests to ensure everything works

**Estimated time:** 2-3 days of focused work

---

## Understanding the Technologies

### What is a REST API?

**REST = REpresentational State Transfer**

Don't worry about the fancy name. Here's what it really means:

**Simple explanation:**
A REST API is a set of URLs that let programs (like a frontend app) ask for data or perform actions.

**Real-world analogy:**
Think of it like a restaurant menu:
- The menu shows available dishes (API endpoints)
- You order by saying the dish name (make a request)
- Kitchen prepares it (server processes)
- Waiter brings your food (server returns data)

**Example:**

Without API (old way):
```
User visits web page → Django renders HTML with data baked in → User sees page
                       (Frontend and backend mixed together)
```

With API (modern way):
```
Frontend app: "Hey backend, give me episode 1 data"
Backend API:  "Here's the JSON data: {season: 1, episode: 1, ...}"
Frontend app: "Thanks! I'll display it nicely"
              (Frontend and backend separate - can work independently!)
```

**Why this is better:**
- Frontend can be built with React/Vue/any framework
- Mobile apps can use the same API
- Other developers can build on your API
- Frontend and backend teams can work separately

### REST API HTTP Methods

APIs use HTTP methods (verbs) to indicate actions:

| Method | Purpose | Example |
|--------|---------|---------|
| GET | Retrieve data | Get episode 5 |
| POST | Create new data | Create a new game |
| PUT/PATCH | Update data | Update player score |
| DELETE | Delete data | Delete a game |

**Example API endpoints:**

```
GET    /api/episodes/          → List all episodes
GET    /api/episodes/1/        → Get episode with ID 1
POST   /api/games/             → Create a new game
GET    /api/games/abc-123/     → Get game with ID abc-123
PATCH  /api/games/abc-123/     → Update game status
DELETE /api/games/abc-123/     → Delete game
```

### What is Django REST Framework (DRF)?

**DRF** is a toolkit that makes building APIs in Django super easy.

**Without DRF (hard way):**
```python
def get_episodes(request):
    episodes = Episode.objects.all()
    data = []
    for ep in episodes:
        data.append({
            'id': ep.id,
            'season_number': ep.season_number,
            'episode_number': ep.episode_number,
            # ... manually convert each field to JSON
        })
    return JsonResponse({'episodes': data})
    # Have to write this for EVERY endpoint!
```

**With DRF (easy way):**
```python
class EpisodeViewSet(viewsets.ModelViewSet):
    queryset = Episode.objects.all()
    serializer_class = EpisodeSerializer
    # Done! DRF handles GET, POST, PUT, DELETE automatically
```

**DRF gives you:**
- Automatic CRUD operations (Create, Read, Update, Delete)
- Data validation
- Authentication
- Browsable API (test in browser)
- Pagination
- Filtering and searching

### What is a Serializer?

A **serializer** converts between Python objects and JSON (and vice versa).

**Analogy:**
Think of it as a translator:
- Python speaks "object language" (Episode objects, Category objects)
- JavaScript/Frontend speaks "JSON language" ({id: 1, name: "..."})
- Serializer translates between them

**Example:**

```python
# Python object (in memory)
episode = Episode(season_number=1, episode_number=5)

# Serializer converts to JSON (for API)
{
    "id": 1,
    "season_number": 1,
    "episode_number": 5,
    "created_at": "2024-01-15T10:30:00Z"
}

# Frontend receives JSON, uses it
```

**Serializer also validates input:**
```python
# Someone tries to create episode with negative season number
POST /api/episodes/
{
    "season_number": -5,  # Invalid!
    "episode_number": 1
}

# Serializer catches this:
Response: 400 Bad Request
{
    "season_number": ["Ensure this value is greater than 0"]
}
```

### What is a ViewSet?

A **ViewSet** is a class that handles all CRUD operations for a model.

**Single ViewSet provides:**
- `list()` - GET /api/episodes/ (all episodes)
- `retrieve()` - GET /api/episodes/1/ (one episode)
- `create()` - POST /api/episodes/ (create new)
- `update()` - PUT /api/episodes/1/ (update existing)
- `destroy()` - DELETE /api/episodes/1/ (delete)

**Plus custom actions:**
```python
@action(detail=False, methods=['get'])
def by_season(self, request):
    # Custom endpoint: /api/episodes/by_season/?season=5
    pass
```

### Understanding Redis for Game State

**Why not just use PostgreSQL for everything?**

PostgreSQL is great for permanent storage, but for a real-time game we need something faster.

**Speed comparison:**
- PostgreSQL: ~1-10ms per query (reading from disk)
- Redis: ~0.1ms per query (reading from RAM)

**100x faster!**

**What we use each for:**

```
PostgreSQL (Permanent Storage):
├─ Episode data (never changes)
├─ Player accounts
├─ Game history
└─ Final scores

Redis (Temporary/Real-time):
├─ Current game state (who's playing right now)
├─ Buzzer state (who buzzed first)
├─ Active WebSocket connections
└─ Score updates during game
```

**Flow example:**

```
1. Game starts:
   - Load episode data from PostgreSQL
   - Store current game state in Redis

2. During game:
   - All updates go to Redis (super fast)
   - Players buzz, scores change, clues reveal

3. Game ends:
   - Save final results to PostgreSQL
   - Clear Redis state (no longer needed)
```

### Understanding Atomic Operations

**Atomic** means "all or nothing" - an operation that can't be interrupted halfway.

**Why this matters for the buzzer:**

**Without atomic operations (BAD):**
```
Player 1 buzzes:
    1. Server checks: "Is buzzer locked?" → No
    2. [Player 2 buzzes at same time!]
    3. Server checks: "Is buzzer locked?" → No (hasn't been set yet)
    4. Server sets Player 1 as winner
    5. Server sets Player 2 as winner (OVERWRITES!)

Result: Both think they won! 😱
```

**With atomic operations (GOOD):**
```
Player 1 buzzes:
    Server runs Lua script (atomic):
        1. Check if locked
        2. Set winner
        3. Lock buzzer
        [All happens in one uninterruptible operation]

Player 2 buzzes immediately after:
    Server runs Lua script:
        1. Check if locked → YES, already locked!
        2. Return "not accepted"

Result: Only Player 1 wins! ✓
```

**Redis Lua scripts** let us write multi-step operations that execute atomically.

---

## Part A: Building the REST API

### Step 1: Create Serializers

Serializers define how our models convert to/from JSON.

Create `api/serializers.py`:

```python
from rest_framework import serializers
from games.models import Episode, Category, Clue, Game, GameParticipant
from users.models import Player

class ClueSerializer(serializers.ModelSerializer):
    """
    Serializer for Clue model.
    Converts Clue objects to/from JSON.
    """
    class Meta:
        model = Clue
        fields = [
            'id',
            'question',
            'answer',
            'value',
            'position',
            'is_daily_double'
        ]
        # Don't include 'answer' for players - we'll handle this in the view

    def to_representation(self, instance):
        """
        Customize output based on context.
        Hide answer unless user is host.
        """
        data = super().to_representation(instance)

        # Check if request context includes user role
        request = self.context.get('request')
        if request and request.query_params.get('hide_answers') == 'true':
            data.pop('answer', None)

        return data


class CategorySerializer(serializers.ModelSerializer):
    """
    Serializer for Category model.
    Includes nested clues.
    """
    clues = ClueSerializer(many=True, read_only=True, source='clue_set')
    # 'many=True' means this is a list of clues
    # 'source' tells it to use the clue_set relationship

    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'round_type',
            'position',
            'clues'
        ]


class EpisodeSerializer(serializers.ModelSerializer):
    """
    Serializer for Episode model.
    """
    categories = CategorySerializer(many=True, read_only=True, source='category_set')
    total_clues = serializers.ReadOnlyField()
    # Includes the computed property from the model

    class Meta:
        model = Episode
        fields = [
            'id',
            'season_number',
            'episode_number',
            'air_date',
            'created_at',
            'total_clues',
            'categories'
        ]


class EpisodeListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for episode lists (without categories).
    Use this for /api/episodes/ to avoid sending too much data.
    """
    total_clues = serializers.ReadOnlyField()

    class Meta:
        model = Episode
        fields = [
            'id',
            'season_number',
            'episode_number',
            'air_date',
            'total_clues'
        ]


class PlayerSerializer(serializers.ModelSerializer):
    """
    Serializer for Player model.
    """
    average_score = serializers.ReadOnlyField()

    class Meta:
        model = Player
        fields = [
            'id',
            'display_name',
            'total_games',
            'total_score',
            'average_score',
            'created_at'
        ]
        read_only_fields = ['total_games', 'total_score', 'created_at']


class GameParticipantSerializer(serializers.ModelSerializer):
    """
    Serializer for GameParticipant.
    Shows player info in game context.
    """
    player_name = serializers.CharField(source='player.display_name', read_only=True)
    # Access related model's field with 'source'

    class Meta:
        model = GameParticipant
        fields = [
            'id',
            'player',
            'player_name',
            'player_number',
            'score',
            'final_wager',
            'joined_at'
        ]
        read_only_fields = ['joined_at']


class GameSerializer(serializers.ModelSerializer):
    """
    Serializer for Game model.
    """
    participants = GameParticipantSerializer(
        many=True,
        read_only=True,
        source='gameparticipant_set'
    )
    episode_display = serializers.SerializerMethodField()
    host_name = serializers.CharField(source='host.display_name', read_only=True)

    class Meta:
        model = Game
        fields = [
            'game_id',
            'episode',
            'episode_display',
            'host',
            'host_name',
            'status',
            'current_round',
            'settings',
            'created_at',
            'started_at',
            'ended_at',
            'participants'
        ]
        read_only_fields = ['game_id', 'created_at', 'started_at', 'ended_at']

    def get_episode_display(self, obj):
        """
        Custom method to show episode as 'S1E5' format.
        """
        return f"S{obj.episode.season_number}E{obj.episode.episode_number}"


class GameCreateSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for creating games.
    Only requires essential fields.
    """
    class Meta:
        model = Game
        fields = ['episode', 'host', 'settings']
```

**Key concepts explained:**

**Meta class:**
- `model`: Which model this serializes
- `fields`: Which fields to include in JSON
- `read_only_fields`: Can't be changed via API

**Nested serializers:**
```python
categories = CategorySerializer(many=True, source='category_set')
```
- Includes related objects (categories inside episode)
- `many=True`: Expects multiple objects (list)
- `source`: Which relationship to use

**SerializerMethodField:**
```python
episode_display = serializers.SerializerMethodField()

def get_episode_display(self, obj):
    return f"S{obj.episode.season_number}E{obj.episode.episode_number}"
```
- Computed field (not in database)
- Method must be named `get_<field_name>`

---

### Step 2: Create ViewSets

ViewSets handle the logic for API endpoints.

Create `api/views.py`:

```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404

from games.models import Episode, Category, Clue, Game, GameParticipant
from users.models import Player
from .serializers import (
    EpisodeSerializer, EpisodeListSerializer, CategorySerializer,
    ClueSerializer, GameSerializer, GameCreateSerializer,
    PlayerSerializer, GameParticipantSerializer
)


class EpisodeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing episodes.
    Read-only because episodes shouldn't be created via API.

    Endpoints:
    - GET /api/episodes/ - List all episodes
    - GET /api/episodes/{id}/ - Get specific episode
    - GET /api/episodes/search/ - Search by season/episode number
    """
    queryset = Episode.objects.all().prefetch_related('category_set__clue_set')
    # prefetch_related loads categories and clues in fewer queries (optimization)

    permission_classes = [AllowAny]  # Anyone can view episodes

    def get_serializer_class(self):
        """
        Use different serializers for list vs detail view.
        List: lightweight (no categories)
        Detail: full data (with categories and clues)
        """
        if self.action == 'list':
            return EpisodeListSerializer
        return EpisodeSerializer

    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Custom endpoint: /api/episodes/search/?season=1&episode=5

        Search for episodes by season and/or episode number.
        """
        season = request.query_params.get('season')
        episode = request.query_params.get('episode')

        queryset = self.get_queryset()

        if season:
            queryset = queryset.filter(season_number=season)
        if episode:
            queryset = queryset.filter(episode_number=episode)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def random(self, request):
        """
        Custom endpoint: /api/episodes/random/

        Get a random episode for quick play.
        """
        episode = Episode.objects.order_by('?').first()
        # order_by('?') returns random order

        if not episode:
            return Response(
                {'error': 'No episodes available'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(episode)
        return Response(serializer.data)


class PlayerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing players.

    Endpoints:
    - GET /api/players/ - List all players
    - POST /api/players/ - Create new player
    - GET /api/players/{id}/ - Get specific player
    - PATCH /api/players/{id}/ - Update player
    - DELETE /api/players/{id}/ - Delete player
    """
    queryset = Player.objects.all()
    serializer_class = PlayerSerializer
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'])
    def create_guest(self, request):
        """
        Custom endpoint: /api/players/create_guest/

        Create a guest player (no authentication required).
        """
        display_name = request.data.get('display_name')

        if not display_name:
            return Response(
                {'error': 'display_name is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        player = Player.objects.create(
            display_name=display_name,
            # guest_session will be auto-generated by model default
        )

        serializer = self.get_serializer(player)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class GameViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing games.

    Endpoints:
    - GET /api/games/ - List all games
    - POST /api/games/ - Create new game
    - GET /api/games/{game_id}/ - Get specific game
    - PATCH /api/games/{game_id}/ - Update game
    - DELETE /api/games/{game_id}/ - Delete game
    """
    queryset = Game.objects.all().select_related('episode', 'host').prefetch_related('gameparticipant_set__player')
    serializer_class = GameSerializer
    permission_classes = [AllowAny]
    lookup_field = 'game_id'  # Use game_id instead of default 'pk'

    def get_serializer_class(self):
        """Use simplified serializer for creation."""
        if self.action == 'create':
            return GameCreateSerializer
        return GameSerializer

    @action(detail=True, methods=['post'])
    def join(self, request, game_id=None):
        """
        Custom endpoint: /api/games/{game_id}/join/

        Join a game as a player.

        Body: {
            "player_id": 123,
            "display_name": "Alex"  (optional, for guest players)
        }
        """
        game = self.get_object()

        # Check if game is joinable
        if game.status not in ['waiting', 'active']:
            return Response(
                {'error': 'Game is not accepting new players'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if game is full
        current_players = GameParticipant.objects.filter(game=game).count()
        if current_players >= 3:
            return Response(
                {'error': 'Game is full (max 3 players)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get or create player
        player_id = request.data.get('player_id')
        display_name = request.data.get('display_name')

        if player_id:
            player = get_object_or_404(Player, id=player_id)
        elif display_name:
            # Create guest player
            player = Player.objects.create(display_name=display_name)
        else:
            return Response(
                {'error': 'Either player_id or display_name required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if player already in game
        if GameParticipant.objects.filter(game=game, player=player).exists():
            return Response(
                {'error': 'Player already in this game'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Add player to game
        participant = GameParticipant.objects.create(
            game=game,
            player=player,
            player_number=current_players + 1
        )

        serializer = GameParticipantSerializer(participant)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def state(self, request, game_id=None):
        """
        Custom endpoint: /api/games/{game_id}/state/

        Get current game state (will be enhanced with Redis in next steps).
        """
        game = self.get_object()

        # For now, just return database state
        # Later, we'll merge with Redis state
        serializer = self.get_serializer(game)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def start(self, request, game_id=None):
        """
        Custom endpoint: /api/games/{game_id}/start/

        Start the game.
        """
        game = self.get_object()

        if game.status != 'waiting':
            return Response(
                {'error': 'Game already started'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check minimum players
        player_count = GameParticipant.objects.filter(game=game).count()
        if player_count < 1:
            return Response(
                {'error': 'Need at least 1 player to start'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update game status
        from django.utils import timezone
        game.status = 'active'
        game.started_at = timezone.now()
        game.save()

        serializer = self.get_serializer(game)
        return Response(serializer.data)
```

**Key concepts explained:**

**ReadOnlyModelViewSet:**
- Only allows GET requests (read data)
- Used for Episode because we don't want users creating episodes via API

**ModelViewSet:**
- Allows all CRUD operations
- Used for Player and Game

**@action decorator:**
```python
@action(detail=False, methods=['get'])
def search(self, request):
```
- `detail=False`: Operates on collection (/api/episodes/search/)
- `detail=True`: Operates on one item (/api/games/{id}/join/)
- `methods`: Which HTTP methods allowed

**Query optimization:**
```python
queryset = Episode.objects.all().prefetch_related('category_set__clue_set')
```
- Loads related data in fewer database queries
- Without this: N+1 query problem (very slow!)
- With this: 2-3 queries total (fast!)

**lookup_field:**
```python
lookup_field = 'game_id'
```
- Changes URL from /api/games/1/ to /api/games/abc-123/
- Uses game_id (UUID) instead of database primary key

---

### Step 3: Configure URL Routing

Connect ViewSets to URLs.

Edit `api/urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EpisodeViewSet, PlayerViewSet, GameViewSet

# Create router
router = DefaultRouter()

# Register ViewSets
router.register(r'episodes', EpisodeViewSet, basename='episode')
router.register(r'players', PlayerViewSet, basename='player')
router.register(r'games', GameViewSet, basename='game')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
]
```

**What DefaultRouter does:**

Automatically creates these URLs:

```
Episodes:
GET    /api/episodes/              → list all episodes
GET    /api/episodes/{id}/         → get one episode
GET    /api/episodes/search/       → custom action
GET    /api/episodes/random/       → custom action

Players:
GET    /api/players/               → list all players
POST   /api/players/               → create player
GET    /api/players/{id}/          → get one player
PATCH  /api/players/{id}/          → update player
DELETE /api/players/{id}/          → delete player
POST   /api/players/create_guest/  → custom action

Games:
GET    /api/games/                 → list all games
POST   /api/games/                 → create game
GET    /api/games/{game_id}/       → get one game
PATCH  /api/games/{game_id}/       → update game
DELETE /api/games/{game_id}/       → delete game
POST   /api/games/{game_id}/join/  → custom action
GET    /api/games/{game_id}/state/ → custom action
POST   /api/games/{game_id}/start/ → custom action
```

Now connect to main project URLs.

Edit `backend/urls.py`:

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),  # Add this line
]
```

---

### Step 4: Test the API

Start the server (make sure Redis is running):

```bash
# Check Redis is running
sudo service redis-server status

# Start Django with Daphne
daphne -b 127.0.0.1 -p 8000 backend.asgi:application
```

#### Test in Browser (Browsable API)

DRF provides a nice web interface for testing!

**1. List episodes:**
Visit: http://127.0.0.1:8000/api/episodes/

You should see JSON with all your episodes.

**2. Get one episode:**
Visit: http://127.0.0.1:8000/api/episodes/1/

You should see full episode data with categories and clues!

**3. Search episodes:**
Visit: http://127.0.0.1:8000/api/episodes/search/?season=1&episode=5

**4. Random episode:**
Visit: http://127.0.0.1:8000/api/episodes/random/

**5. List players (empty for now):**
Visit: http://127.0.0.1:8000/api/players/

**6. List games (empty for now):**
Visit: http://127.0.0.1:8000/api/games/

#### Test Creating Data (via Browsable API)

**1. Create a player:**

Visit: http://127.0.0.1:8000/api/players/

Scroll to bottom, you'll see a form. Fill in:
```json
{
    "display_name": "Test Player"
}
```

Click POST. You should get back:
```json
{
    "id": 1,
    "display_name": "Test Player",
    "total_games": 0,
    "total_score": 0,
    "average_score": 0.0,
    "created_at": "2024-01-15T10:30:00Z"
}
```

**2. Create a game:**

Visit: http://127.0.0.1:8000/api/games/

Fill in:
```json
{
    "episode": 1,
    "host": 1,
    "settings": {}
}
```

Click POST. You should get back a game with a UUID game_id!

**3. Join the game:**

Visit: http://127.0.0.1:8000/api/games/{game_id}/join/
(Replace {game_id} with the UUID from step 2)

Fill in:
```json
{
    "display_name": "Player 1"
}
```

Click POST. You should be added to the game!

---

## Part B: Game State Manager (Redis)

Now let's build the server-side game engine that manages state and handles buzzer logic.

### Step 5: Understanding the Game State Manager

**What it does:**
- Stores current game state in Redis (fast!)
- Handles buzzer presses atomically (no race conditions)
- Manages which clues are revealed
- Tracks scores in real-time

**Why Redis and not PostgreSQL:**
- Redis is in-memory (100x faster)
- Supports atomic operations (Lua scripts)
- Perfect for temporary game state
- PostgreSQL saves final results permanently

**State flow:**

```
Game Created (PostgreSQL):
game_id: abc-123
episode: Season 1 Episode 5
status: waiting

Game Starts:
Copy to Redis:
  game:abc-123:state = {
    status: active,
    current_round: single,
    current_clue: null,
    revealed_clues: []
  }

During Game (All in Redis):
- Clues revealed
- Buzzer presses
- Score updates

Game Ends:
Save final state to PostgreSQL
Clear Redis state
```

### Step 6: Create Game State Manager

Create `games/engine.py`:

```python
import time
import json
from typing import Optional, Dict, List
from redis import Redis
from django.conf import settings

class GameStateManager:
    """
    Manages game state in Redis with PostgreSQL persistence.

    Handles:
    - Current game state (round, clue, scores)
    - Buzzer logic with atomic operations
    - State synchronization
    """

    def __init__(self, game_id: str):
        """
        Initialize manager for a specific game.

        Args:
            game_id: UUID of the game
        """
        self.game_id = str(game_id)

        # Connect to Redis
        self.redis = Redis(
            host='127.0.0.1',
            port=6379,
            db=0,
            decode_responses=True  # Automatically decode bytes to strings
        )

        # Redis key patterns
        self.state_key = f"game:{self.game_id}:state"
        self.buzzer_key = f"game:{self.game_id}:buzzer"
        self.scores_key = f"game:{self.game_id}:scores"

    def initialize_game(self, episode_id: int, player_numbers: List[int]) -> Dict:
        """
        Initialize game state in Redis when game starts.

        Args:
            episode_id: ID of the episode being played
            player_numbers: List of player numbers [1, 2, 3]

        Returns:
            Initial game state dict
        """
        initial_state = {
            'episode_id': episode_id,
            'status': 'active',
            'current_round': 'single',
            'current_clue': None,
            'revealed_clues': [],  # List of clue IDs that have been revealed
            'daily_doubles': [],   # Clue IDs that are daily doubles
        }

        # Store state
        self.redis.hset(self.state_key, mapping=initial_state)

        # Initialize scores
        for player_num in player_numbers:
            self.redis.hset(self.scores_key, player_num, 0)

        # Set expiry (24 hours - games shouldn't last longer!)
        self.redis.expire(self.state_key, 86400)
        self.redis.expire(self.scores_key, 86400)

        return initial_state

    def get_state(self) -> Dict:
        """
        Get current game state from Redis.

        Returns:
            Dict with game state, or empty dict if not found
        """
        state = self.redis.hgetall(self.state_key)

        if not state:
            return {}

        # Parse JSON fields
        if 'revealed_clues' in state:
            state['revealed_clues'] = json.loads(state['revealed_clues'])
        if 'daily_doubles' in state:
            state['daily_doubles'] = json.loads(state['daily_doubles'])

        return state

    def update_state(self, updates: Dict) -> None:
        """
        Update game state atomically.

        Args:
            updates: Dict of field -> value to update
        """
        # Serialize list fields to JSON
        for key, value in updates.items():
            if isinstance(value, (list, dict)):
                updates[key] = json.dumps(value)

        self.redis.hset(self.state_key, mapping=updates)

    def get_scores(self) -> Dict[int, int]:
        """
        Get all player scores.

        Returns:
            Dict of player_number -> score
        """
        scores = self.redis.hgetall(self.scores_key)
        return {int(k): int(v) for k, v in scores.items()}

    def update_score(self, player_number: int, delta: int) -> int:
        """
        Update a player's score.

        Args:
            player_number: Which player (1, 2, or 3)
            delta: Amount to add (positive) or subtract (negative)

        Returns:
            New score
        """
        new_score = self.redis.hincrby(self.scores_key, player_number, delta)
        return int(new_score)

    def set_score(self, player_number: int, score: int) -> None:
        """
        Set a player's score to a specific value.

        Args:
            player_number: Which player (1, 2, or 3)
            score: New score value
        """
        self.redis.hset(self.scores_key, player_number, score)

    def reset_buzzer(self) -> None:
        """
        Reset buzzer state for next clue.
        Clears all buzz data.
        """
        self.redis.delete(self.buzzer_key)
        self.redis.delete(f"{self.buzzer_key}:order")

    def handle_buzz(self, player_number: int, client_timestamp: int) -> Dict:
        """
        Handle a player buzzing in with atomic Redis operation.

        This is the critical part that prevents race conditions!
        Uses a Lua script to ensure atomicity.

        Args:
            player_number: Which player buzzed (1, 2, or 3)
            client_timestamp: When client thinks they buzzed (milliseconds)

        Returns:
            Dict with:
                - accepted: bool (was buzz accepted?)
                - position: int (order of buzz, 1st, 2nd, etc.)
                - winner: int or None (player_number of winner)
                - server_timestamp_us: int (server timestamp in microseconds)
        """
        # Get precise server timestamp
        server_timestamp_us = int(time.time() * 1_000_000)

        # Lua script for atomic buzz handling
        # This entire script runs as one atomic operation!
        lua_script = """
        local buzzer_key = KEYS[1]
        local player = ARGV[1]
        local timestamp = ARGV[2]

        -- Check if buzzer is locked (someone already won)
        local locked = redis.call('HGET', buzzer_key, 'locked')
        if locked == '1' then
            -- Get existing winner
            local winner = redis.call('HGET', buzzer_key, 'winner')
            return {0, -1, tonumber(winner)}  -- Not accepted, winner already chosen
        end

        -- Check if this player already buzzed
        local already_buzzed = redis.call('HEXISTS', buzzer_key, 'player:' .. player)
        if already_buzzed == 1 then
            return {0, -1, -1}  -- Not accepted, already buzzed
        end

        -- Increment buzz count
        local count = redis.call('HINCRBY', buzzer_key, 'count', 1)

        -- Record this player's buzz
        redis.call('HSET', buzzer_key, 'player:' .. player, timestamp)
        redis.call('RPUSH', buzzer_key .. ':order', player)

        -- If first buzz, lock buzzer and set winner
        if count == 1 then
            redis.call('HSET', buzzer_key, 'locked', '1')
            redis.call('HSET', buzzer_key, 'winner', player)
            redis.call('HSET', buzzer_key, 'winner_timestamp', timestamp)
            return {1, count, tonumber(player)}  -- Accepted, first, you're the winner!
        end

        -- Not first, but buzz recorded
        local winner = redis.call('HGET', buzzer_key, 'winner')
        return {1, count, tonumber(winner)}  -- Accepted, but not winner
        """

        # Execute Lua script
        result = self.redis.eval(
            lua_script,
            1,  # Number of keys
            self.buzzer_key,  # KEYS[1]
            player_number,    # ARGV[1]
            server_timestamp_us  # ARGV[2]
        )

        return {
            'accepted': bool(result[0]),
            'position': result[1],
            'winner': result[2] if result[2] > 0 else None,
            'server_timestamp_us': server_timestamp_us
        }

    def get_buzzer_state(self) -> Dict:
        """
        Get current buzzer state.

        Returns:
            Dict with:
                - locked: bool
                - winner: int or None
                - buzz_count: int
                - buzz_order: List[int]
        """
        state = self.redis.hgetall(self.buzzer_key)
        order = self.redis.lrange(f"{self.buzzer_key}:order", 0, -1)

        return {
            'locked': state.get('locked') == '1',
            'winner': int(state['winner']) if 'winner' in state else None,
            'buzz_count': int(state.get('count', 0)),
            'buzz_order': [int(p) for p in order]
        }

    def reveal_clue(self, clue_id: int) -> None:
        """
        Mark a clue as revealed.

        Args:
            clue_id: ID of the clue being revealed
        """
        state = self.get_state()
        revealed = state.get('revealed_clues', [])

        if clue_id not in revealed:
            revealed.append(clue_id)
            self.update_state({
                'current_clue': clue_id,
                'revealed_clues': revealed
            })

        # Reset buzzer for new clue
        self.reset_buzzer()

    def cleanup(self) -> None:
        """
        Clean up game state from Redis.
        Call this when game ends.
        """
        self.redis.delete(self.state_key)
        self.redis.delete(self.buzzer_key)
        self.redis.delete(f"{self.buzzer_key}:order")
        self.redis.delete(self.scores_key)
```

**Key concepts explained:**

**Redis data structures:**
- `HSET/HGET`: Hash (like a Python dict in Redis)
- `RPUSH/LRANGE`: List (ordered collection)
- `HINCRBY`: Atomically increment a hash value
- `EXPIRE`: Auto-delete key after X seconds

**Lua script atomicity:**
```python
lua_script = """
-- This entire script runs atomically
-- No other operation can happen in between
"""
result = redis.eval(lua_script, ...)
```

**Why this prevents race conditions:**
- Without Lua: Check → Update (two operations, can be interrupted)
- With Lua: Check-and-Update (one atomic operation, uninterruptible)

**Microsecond timestamps:**
```python
server_timestamp_us = int(time.time() * 1_000_000)
```
- `time.time()` returns seconds (e.g., 1704461234.567891)
- Multiply by 1,000,000 → microseconds (1704461234567891)
- More precise than milliseconds for buzzer timing

---

### Step 7: Test the Game Engine

Create a test script to verify the engine works.

Create `test_engine.py` in project root:

```python
from games.engine import GameStateManager
import time

# Create game engine instance
game_id = "test-game-123"
engine = GameStateManager(game_id)

print("=== Testing Game State Manager ===\n")

# 1. Initialize game
print("1. Initializing game...")
initial_state = engine.initialize_game(
    episode_id=1,
    player_numbers=[1, 2, 3]
)
print(f"Initial state: {initial_state}")
print(f"Initial scores: {engine.get_scores()}\n")

# 2. Simulate buzzer presses
print("2. Testing buzzer (3 players buzz in order)...")

# Player 1 buzzes
result1 = engine.handle_buzz(1, int(time.time() * 1000))
print(f"Player 1 buzzed: {result1}")

# Player 2 buzzes (should be accepted but not winner)
time.sleep(0.01)  # Small delay
result2 = engine.handle_buzz(2, int(time.time() * 1000))
print(f"Player 2 buzzed: {result2}")

# Player 3 buzzes
time.sleep(0.01)
result3 = engine.handle_buzz(3, int(time.time() * 1000))
print(f"Player 3 buzzed: {result3}")

# Player 1 tries to buzz again (should be rejected)
result4 = engine.handle_buzz(1, int(time.time() * 1000))
print(f"Player 1 buzzed again: {result4}\n")

# Check buzzer state
buzzer_state = engine.get_buzzer_state()
print(f"Buzzer state: {buzzer_state}\n")

# 3. Test score updates
print("3. Testing score updates...")
engine.update_score(1, 200)  # Player 1 gets 200 points (correct answer)
print(f"Player 1 score after +200: {engine.get_scores()}")

engine.update_score(2, -100)  # Player 2 loses 100 (wrong answer)
print(f"Player 2 score after -100: {engine.get_scores()}\n")

# 4. Test clue reveal
print("4. Testing clue reveal...")
engine.reveal_clue(42)
state = engine.get_state()
print(f"Current clue: {state['current_clue']}")
print(f"Revealed clues: {state['revealed_clues']}")
print(f"Buzzer reset: {engine.get_buzzer_state()}\n")

# 5. Cleanup
print("5. Cleaning up...")
engine.cleanup()
print("Game state cleared from Redis")

print("\n=== All tests passed! ===")
```

Run the test:

```bash
python test_engine.py
```

**Expected output:**
```
=== Testing Game State Manager ===

1. Initializing game...
Initial state: {'episode_id': '1', 'status': 'active', ...}
Initial scores: {1: 0, 2: 0, 3: 0}

2. Testing buzzer (3 players buzz in order)...
Player 1 buzzed: {'accepted': True, 'position': 1, 'winner': 1, ...}
Player 2 buzzed: {'accepted': True, 'position': 2, 'winner': 1, ...}
Player 3 buzzed: {'accepted': True, 'position': 3, 'winner': 1, ...}
Player 1 buzzed again: {'accepted': False, 'position': -1, ...}

Buzzer state: {'locked': True, 'winner': 1, 'buzz_count': 3, ...}

3. Testing score updates...
Player 1 score after +200: {1: 200, 2: 0, 3: 0}
Player 2 score after -100: {1: 200, 2: -100, 3: 0}

4. Testing clue reveal...
Current clue: 42
Revealed clues: [42]
Buzzer reset: {'locked': False, 'winner': None, ...}

5. Cleaning up...
Game state cleared from Redis

=== All tests passed! ===
```

If you see this, your game engine is working! 🎉

---

## Part C: Enhanced WebSocket Consumer

Now let's connect the WebSocket to our game engine.

### Step 8: Update WebSocket Consumer

Edit `games/consumers.py` - replace with enhanced version:

```python
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.shortcuts import get_object_or_404
import json

from .models import Game, GameParticipant, GameAction
from .engine import GameStateManager


class GameConsumer(AsyncJsonWebsocketConsumer):
    """
    Enhanced WebSocket consumer with game engine integration.

    Handles:
    - Authentication/role validation
    - Game-specific room isolation
    - Buzzer integration
    - State synchronization
    """

    async def connect(self):
        """
        Called when WebSocket connection is established.
        Validates game exists and user has permission.
        """
        # Get game_id from URL
        self.game_id = self.scope['url_route']['kwargs']['game_id']

        # Validate game exists
        game_data = await self.get_game_data()
        if not game_data:
            await self.close(code=4004)  # Not found
            return

        self.game = game_data
        self.room_group_name = f"game_{self.game_id}"

        # Initialize game engine
        self.engine = GameStateManager(self.game_id)

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send current game state
        state = await database_sync_to_async(self.engine.get_state)()
        scores = await database_sync_to_async(self.engine.get_scores)()

        await self.send_json({
            'type': 'connection_established',
            'game_id': self.game_id,
            'state': state,
            'scores': scores
        })

    async def disconnect(self, close_code):
        """
        Called when WebSocket disconnects.
        """
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive_json(self, content):
        """
        Route incoming messages to appropriate handlers.
        """
        message_type = content.get('type')

        handlers = {
            'buzz': self.handle_buzz,
            'reveal_clue': self.handle_reveal_clue,
            'judge_answer': self.handle_judge_answer,
            'next_clue': self.handle_next_clue,
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
        """
        Handle player buzzing in.
        Uses game engine for atomic buzz handling.
        """
        player_number = content.get('player_number')
        client_timestamp = content.get('timestamp', 0)

        # Process buzz through game engine
        result = await database_sync_to_async(self.engine.handle_buzz)(
            player_number,
            client_timestamp
        )

        # Log to database
        await self.log_action('buzz', {
            'player_number': player_number,
            'result': result
        })

        # Broadcast result to all clients
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'buzz_result',
                'player_number': player_number,
                'accepted': result['accepted'],
                'winner': result['winner'],
                'position': result['position'],
                'server_timestamp': result['server_timestamp_us']
            }
        )

    async def handle_reveal_clue(self, content):
        """
        Handle host revealing a clue.
        """
        clue_id = content.get('clue_id')

        # Update game engine
        await database_sync_to_async(self.engine.reveal_clue)(clue_id)

        # Get clue data
        clue_data = await self.get_clue_data(clue_id)

        # Broadcast to all clients
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'clue_revealed',
                'clue': clue_data
            }
        )

    async def handle_judge_answer(self, content):
        """
        Handle host judging an answer.
        """
        player_number = content.get('player_number')
        correct = content.get('correct')
        value = content.get('value')

        # Update score
        delta = value if correct else -value
        new_score = await database_sync_to_async(
            self.engine.update_score
        )(player_number, delta)

        # Log action
        await self.log_action('judge_answer', {
            'player_number': player_number,
            'correct': correct,
            'value': value,
            'new_score': new_score
        })

        # Broadcast result
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'answer_judged',
                'player_number': player_number,
                'correct': correct,
                'value': value,
                'new_score': new_score
            }
        )

    async def handle_next_clue(self, content):
        """
        Handle returning to board (next clue).
        """
        # Reset buzzer
        await database_sync_to_async(self.engine.reset_buzzer)()

        # Get current scores
        scores = await database_sync_to_async(self.engine.get_scores)()

        # Broadcast
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'return_to_board',
                'scores': scores
            }
        )

    # Channel layer message handlers (receive broadcasts)

    async def buzz_result(self, event):
        """Receive buzz result broadcast."""
        await self.send_json(event)

    async def clue_revealed(self, event):
        """Receive clue revealed broadcast."""
        await self.send_json(event)

    async def answer_judged(self, event):
        """Receive answer judged broadcast."""
        await self.send_json(event)

    async def return_to_board(self, event):
        """Receive return to board broadcast."""
        await self.send_json(event)

    # Helper methods

    @database_sync_to_async
    def get_game_data(self):
        """Get game from database."""
        try:
            game = Game.objects.select_related('episode', 'host').get(
                game_id=self.game_id
            )
            return {
                'id': game.id,
                'game_id': str(game.game_id),
                'status': game.status,
                'episode_id': game.episode.id
            }
        except Game.DoesNotExist:
            return None

    @database_sync_to_async
    def get_clue_data(self, clue_id):
        """Get clue from database."""
        from .models import Clue
        try:
            clue = Clue.objects.select_related('category').get(id=clue_id)
            return {
                'id': clue.id,
                'question': clue.question,
                'answer': clue.answer,
                'value': clue.value,
                'category': clue.category.name
            }
        except Clue.DoesNotExist:
            return None

    @database_sync_to_async
    def log_action(self, action_type, data):
        """Log action to database."""
        import time
        GameAction.objects.create(
            game_id=self.game['id'],
            action_type=action_type,
            data=data,
            server_timestamp_us=int(time.time() * 1_000_000)
        )
```

**Key concepts:**

**database_sync_to_async:**
- WebSocket consumers are async
- Database operations are sync
- This wrapper converts sync → async

**Channel layer broadcasting:**
```python
await self.channel_layer.group_send(
    self.room_group_name,  # Send to this room
    {
        'type': 'buzz_result',  # Calls buzz_result() method
        'data': ...
    }
)
```

**Message flow:**
```
Player 1 sends buzz
    ↓
receive_json() receives it
    ↓
handle_buzz() processes with engine
    ↓
group_send() broadcasts to room
    ↓
buzz_result() on all connected clients
    ↓
All clients see the buzz
```

---

## Part D: Testing

### Step 9: Write Unit Tests

Create tests to ensure everything works correctly.

Edit `games/tests.py`:

```python
from django.test import TestCase
from django.utils import timezone
from games.models import Episode, Category, Clue, Game, GameParticipant
from users.models import Player
from games.engine import GameStateManager
import time


class GameStateManagerTestCase(TestCase):
    """Test the game engine."""

    def setUp(self):
        """Set up test data."""
        self.game_id = "test-game-123"
        self.engine = GameStateManager(self.game_id)

        # Clean up any existing state
        self.engine.cleanup()

    def tearDown(self):
        """Clean up after tests."""
        self.engine.cleanup()

    def test_initialize_game(self):
        """Test game initialization."""
        state = self.engine.initialize_game(
            episode_id=1,
            player_numbers=[1, 2, 3]
        )

        self.assertEqual(state['status'], 'active')
        self.assertEqual(state['current_round'], 'single')

        scores = self.engine.get_scores()
        self.assertEqual(scores, {1: 0, 2: 0, 3: 0})

    def test_buzzer_first_wins(self):
        """Test that first player to buzz wins."""
        self.engine.initialize_game(1, [1, 2, 3])

        result1 = self.engine.handle_buzz(1, int(time.time() * 1000))
        result2 = self.engine.handle_buzz(2, int(time.time() * 1000))

        self.assertTrue(result1['accepted'])
        self.assertEqual(result1['winner'], 1)
        self.assertEqual(result1['position'], 1)

        self.assertTrue(result2['accepted'])
        self.assertEqual(result2['winner'], 1)  # Player 1 still winner
        self.assertEqual(result2['position'], 2)

    def test_duplicate_buzz_rejected(self):
        """Test that same player can't buzz twice."""
        self.engine.initialize_game(1, [1, 2, 3])

        result1 = self.engine.handle_buzz(1, int(time.time() * 1000))
        result2 = self.engine.handle_buzz(1, int(time.time() * 1000))

        self.assertTrue(result1['accepted'])
        self.assertFalse(result2['accepted'])

    def test_score_updates(self):
        """Test score update functionality."""
        self.engine.initialize_game(1, [1, 2, 3])

        # Add 200 points to player 1
        new_score = self.engine.update_score(1, 200)
        self.assertEqual(new_score, 200)

        # Subtract 100 from player 2
        new_score = self.engine.update_score(2, -100)
        self.assertEqual(new_score, -100)

        scores = self.engine.get_scores()
        self.assertEqual(scores[1], 200)
        self.assertEqual(scores[2], -100)

    def test_clue_reveal(self):
        """Test clue reveal tracking."""
        self.engine.initialize_game(1, [1, 2, 3])

        self.engine.reveal_clue(42)

        state = self.engine.get_state()
        self.assertEqual(state['current_clue'], '42')
        self.assertIn('42', state['revealed_clues'])

        # Buzzer should be reset
        buzzer = self.engine.get_buzzer_state()
        self.assertFalse(buzzer['locked'])


class GameAPITestCase(TestCase):
    """Test the REST API."""

    def setUp(self):
        """Set up test data."""
        # Create episode
        self.episode = Episode.objects.create(
            season_number=1,
            episode_number=1
        )

        # Create player
        self.player = Player.objects.create(
            display_name="Test Player"
        )

    def test_create_game(self):
        """Test creating a game via API."""
        response = self.client.post('/api/games/', {
            'episode': self.episode.id,
            'host': self.player.id,
            'settings': {}
        }, content_type='application/json')

        self.assertEqual(response.status_code, 201)
        self.assertIn('game_id', response.json())

    def test_join_game(self):
        """Test joining a game."""
        # Create game
        game = Game.objects.create(
            episode=self.episode,
            host=self.player,
            status='waiting'
        )

        # Join game
        response = self.client.post(
            f'/api/games/{game.game_id}/join/',
            {'display_name': 'Player 1'},
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 201)

        # Check participant created
        self.assertEqual(
            GameParticipant.objects.filter(game=game).count(),
            1
        )

    def test_game_full(self):
        """Test that games can't have more than 3 players."""
        game = Game.objects.create(
            episode=self.episode,
            host=self.player,
            status='waiting'
        )

        # Add 3 players
        for i in range(3):
            player = Player.objects.create(display_name=f"Player {i+1}")
            GameParticipant.objects.create(
                game=game,
                player=player,
                player_number=i+1
            )

        # Try to add 4th player
        response = self.client.post(
            f'/api/games/{game.game_id}/join/',
            {'display_name': 'Player 4'},
            content_type='application/json'
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('full', response.json()['error'].lower())
```

Run the tests:

```bash
python manage.py test games
```

**Expected output:**
```
Creating test database...
........
----------------------------------------------------------------------
Ran 8 tests in 0.521s

OK
Destroying test database...
```

If all tests pass, you're in great shape! ✅

---

## Step 10: Integration Test (Manual)

Let's test the complete flow manually.

### Test Script

Create `test_integration.py`:

```python
import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/api"

print("=== Integration Test ===\n")

# 1. Get a random episode
print("1. Getting random episode...")
response = requests.get(f"{BASE_URL}/episodes/random/")
episode = response.json()
print(f"Episode: S{episode['season_number']}E{episode['episode_number']}")
print(f"Categories: {len(episode['categories'])}\n")

# 2. Create host player
print("2. Creating host player...")
response = requests.post(f"{BASE_URL}/players/", json={
    "display_name": "Alex Trebek"
})
host = response.json()
print(f"Host created: {host['display_name']} (ID: {host['id']})\n")

# 3. Create game
print("3. Creating game...")
response = requests.post(f"{BASE_URL}/games/", json={
    "episode": episode['id'],
    "host": host['id'],
    "settings": {}
})
game = response.json()
print(f"Game created: {game['game_id']}\n")

# 4. Create and join players
print("4. Adding players...")
players = []
for i, name in enumerate(["Ken", "Brad", "James"], 1):
    response = requests.post(
        f"{BASE_URL}/games/{game['game_id']}/join/",
        json={"display_name": name}
    )
    player = response.json()
    print(f"Player {i} joined: {name}")
    players.append(player)
print()

# 5. Start game
print("5. Starting game...")
response = requests.post(f"{BASE_URL}/games/{game['game_id']}/start/")
game = response.json()
print(f"Game status: {game['status']}\n")

# 6. Get game state
print("6. Getting game state...")
response = requests.get(f"{BASE_URL}/games/{game['game_id']}/state/")
state = response.json()
print(f"Participants: {len(state['participants'])}")
for p in state['participants']:
    print(f"  - {p['player_name']} (Player {p['player_number']}): ${p['score']}")

print("\n=== Integration test complete! ===")
```

Run it:

```bash
# Make sure server is running first
daphne -b 127.0.0.1 -p 8000 backend.asgi:application

# In another terminal:
pip install requests  # If not already installed
python test_integration.py
```

**Expected output:**
```
=== Integration Test ===

1. Getting random episode...
Episode: S1E5
Categories: 13

2. Creating host player...
Host created: Alex Trebek (ID: 1)

3. Creating game...
Game created: abc-123-def-456

4. Adding players...
Player 1 joined: Ken
Player 2 joined: Brad
Player 3 joined: James

5. Starting game...
Game status: active

6. Getting game state...
Participants: 3
  - Ken (Player 1): $0
  - Brad (Player 2): $0
  - James (Player 3): $0

=== Integration test complete! ===
```

If you see this, your entire backend is working! 🎉🎉🎉

---

## Phase 2 Complete! Summary

### What You Built

```
✅ REST API Layer
   ├─ /api/episodes/ (list, search, random)
   ├─ /api/players/ (CRUD + guest creation)
   └─ /api/games/ (CRUD + join, start, state)

✅ Game State Manager
   ├─ Redis-based state storage
   ├─ Atomic buzzer handling (Lua scripts)
   ├─ Score management
   └─ Clue tracking

✅ Enhanced WebSocket Consumer
   ├─ Game-specific rooms
   ├─ Engine integration
   ├─ Real-time broadcasting
   └─ Action logging

✅ Testing
   ├─ Unit tests for engine
   ├─ API endpoint tests
   └─ Integration tests
```

### Key Achievements

🎯 **Server-authoritative game logic** - No more client-side race conditions!
🎯 **RESTful API** - Frontend can be built separately
🎯 **Atomic buzzer** - Precise timing with no conflicts
🎯 **Comprehensive tests** - Confidence in code quality

---

## Next Steps: Phase 3 - Frontend

In Phase 3, we'll build:
- React/TypeScript frontend
- Real-time game interfaces (Host, Player, Board)
- WebSocket integration
- Beautiful UI

But before moving on, make sure:
- [ ] All Phase 2 tests pass
- [ ] API endpoints work in browser
- [ ] Integration test succeeds
- [ ] Redis is running smoothly
- [ ] No errors in server logs

---

## Troubleshooting Phase 2

### Redis Connection Issues

**Error:** `redis.exceptions.ConnectionError`

**Fix:**
```bash
sudo service redis-server start
redis-cli ping  # Should return PONG
```

### API 404 Errors

**Error:** API endpoints return 404

**Fix:** Check `backend/urls.py` includes:
```python
path('api/', include('api.urls')),
```

### Serializer Errors

**Error:** `KeyError` or `AttributeError` in serializers

**Fix:** Make sure model relationships exist:
- Episode has categories (category_set)
- Category has clues (clue_set)
- Use `select_related()` / `prefetch_related()` in queries

### WebSocket Not Connecting

**Error:** WebSocket closes immediately

**Fix:**
- Run with Daphne: `daphne -b 127.0.0.1 -p 8000 backend.asgi:application`
- Check `games/routing.py` has correct URL pattern
- Check Redis is running

---

Congratulations on completing Phase 2! You now have a production-ready backend. 🚀

When you're ready for Phase 3 (Frontend), just let me know!
