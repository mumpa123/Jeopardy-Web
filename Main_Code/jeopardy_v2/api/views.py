
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Count, Max, Q
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from games.models import Episode, Category, Clue, Game, GameParticipant
from games.engine import GameStateManager
from users.models import Player
from .serializers import (
        EpisodeSerializer, EpisodeListSerializer, CategorySerializer,
        ClueSerializer, GameSerializer, GameCreateSerializer,
        PlayerSerializer, GameParticipantSerializer,
        SeasonSerializer, EpisodeWithHistorySerializer, GameResultSerializer
)


class EpisodeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing episodes.
    Read-only because episodes shouldn't be created via API.

    Endpoints:
    - GET /api/episodes/ - List all episodes
    - Get /api/episodes/{id}/ - Get specific episode
    - Get /api/episodes/search/ - Search by season/episode number
    """
    queryset = Episode.objects.all().prefetch_related('category_set__clue_set')
    # prefetch_related loads categories and clues in fewer queries (optimization)

    permission_classes = [AllowAny] # Anyone can view episodes

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

    @action(detail=False, methods=['get'])
    def seasons(self, request):
        """
        Custom endpoint: /api/episodes/seasons/

        Get list of all seasons with episode counts and total games played.
        """
        # Aggregate data by season
        seasons_data = Episode.objects.values('season_number').annotate(
            episode_count=Count('id')
        ).order_by('season_number')

        # Add game counts for each season
        result = []
        for season_data in seasons_data:
            season_num = season_data['season_number']

            # Count total games for this season
            total_games = Game.objects.filter(
                episode__season_number=season_num
            ).count()

            result.append({
                'season_number': season_num,
                'episode_count': season_data['episode_count'],
                'total_games_played': total_games
            })

        serializer = SeasonSerializer(result, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='by_season/(?P<season_number>[0-9]+)')
    def by_season(self, request, season_number=None):
        """
        Custom endpoint: /api/episodes/by_season/{season_number}/

        Get all episodes for a specific season with game history summary.
        """
        # Get episodes for this season
        episodes = Episode.objects.filter(
            season_number=season_number
        ).annotate(
            games_played=Count('game'),
            last_played=Max('game__created_at')
        ).order_by('episode_number')

        if not episodes.exists():
            return Response(
                {'error': f'No episodes found for season {season_number}'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = EpisodeWithHistorySerializer(episodes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def games(self, request, pk=None):
        """
        Custom endpoint: /api/episodes/{id}/games/

        Get all games played for a specific episode with full results.
        """
        episode = self.get_object()

        # Get all games for this episode, ordered by most recent first
        games = Game.objects.filter(
            episode=episode
        ).prefetch_related(
            'gameparticipant_set__player'
        ).order_by('-created_at')

        serializer = GameResultSerializer(games, many=True)
        return Response(serializer.data)


class PlayerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing players.

    Endpoints:
    - GET /api/players/ - List all players
    - POST /api/plaers/ - Create new player
    - GET /api/players/{id}/ - Get specific player
    - PATCH /api/players/{id}/ - Update player
    - DELTE /api/players/{id}/ - Delte player
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
    - GET /api/games/ - List all games (supports ?status= and ?ordering= filters)
    - POST /api/games/ - Create new game
    - GET /api/games/{game_id}/ - Get specific game
    - PATCH /api/games/{game_id}/ - Update game
    - DELETE /api/games/{game_id}/ - Delete game
    """
    queryset = Game.objects.all().select_related('episode', 'host').prefetch_related('gameparticipant_set__player')
    serializer_class = GameSerializer
    permission_classes = [AllowAny]
    lookup_field = 'game_id' # Use game_id instead of default 'pk'

    def get_serializer_class(self):
        """Use simplified serializer for creation."""
        if self.action == 'create':
            return GameCreateSerializer
        return GameSerializer

    def list(self, request, *args, **kwargs):
        """
        Override list to support filtering by status and custom ordering.

        Query Parameters:
        - status: Filter by game status (waiting, active, completed, etc.)
        - ordering: Order by field (e.g., -created_at for newest first)
        """
        queryset = self.get_queryset()

        # Filter by status if provided
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Apply ordering if provided (default: newest first)
        ordering = request.query_params.get('ordering', '-created_at')
        if ordering:
            queryset = queryset.order_by(ordering)

        # Paginate and serialize
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        """
        Override create to return full game data with game_id.
        Input: GameCreateSerializer (minimal fields)
        Output: GameSerializer (all fields including game_id)
        """
        import random
        from games.models import Clue
        from games.engine import GameStateManager

        # Validate input with GameCreateSerializer
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Save the game
        game = serializer.save()

        # Randomly select Daily Doubles for this game
        # 1 DD for single jeopardy, 2 DDs for double jeopardy
        episode = game.episode

        # Get all clues for single jeopardy round
        single_jeopardy_clues = list(
            Clue.objects.filter(
                category__episode=episode,
                category__round_type='single'
            ).values_list('id', flat=True)
        )

        # Get all clues for double jeopardy round
        double_jeopardy_clues = list(
            Clue.objects.filter(
                category__episode=episode,
                category__round_type='double'
            ).values_list('id', flat=True)
        )

        # Randomly select DDs
        daily_double_ids = []
        if single_jeopardy_clues:
            # Select 1 random DD from single jeopardy
            daily_double_ids.append(random.choice(single_jeopardy_clues))

        if double_jeopardy_clues and len(double_jeopardy_clues) >= 2:
            # Select 2 random DDs from double jeopardy
            daily_double_ids.extend(random.sample(double_jeopardy_clues, 2))
        elif double_jeopardy_clues:
            # If less than 2 clues, select what we can
            daily_double_ids.extend(random.sample(double_jeopardy_clues, len(double_jeopardy_clues)))

        # Initialize game engine and set Daily Doubles
        engine = GameStateManager(str(game.game_id))
        engine.set_daily_doubles(daily_double_ids)

        print(f"[Game Create] Selected Daily Doubles: {daily_double_ids}")

        # Return full game data using GameSerializer
        output_serializer = GameSerializer(game)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def join(self, request, game_id=None):
        """
        Custom endpoint: /api/games/{game_id}/join/

        Join a game as a player.

        Body: {
            "player_id": 123,
            "display_name": "Alex" (optional, for guest players)
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
        if current_players >= 6:
            return Response(
                    {'error': 'Game is full (max 6 players)'},
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

        # Check if player already in game (support rejoin)
        existing_participant = GameParticipant.objects.filter(game=game, player=player).first()
        if existing_participant:
            # Player is rejoining - return existing participant
            serializer = GameParticipantSerializer(existing_participant)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # Add player to game (new player)
        participant = GameParticipant.objects.create(
                game=game,
                player=player,
                player_number=current_players + 1
        )

        # Initialize score in Redis
        engine = GameStateManager(game_id)
        engine.set_score(participant.player_number, 0)

        # Broadcast player joined via WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"game_{game_id}",
            {
                'type': 'player_joined',
                'player_number': participant.player_number,
                'player_name': player.display_name
            }
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
        serializer  = self.get_serializer(game)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def validate(self, request, game_id=None):
        """
        Custom endpoint: /api/games/{game_id}/validate/

        Lightweight validation to check if game exists and get status.
        Used for session persistence validation.
        """
        try:
            game = self.get_object()
            return Response({
                'valid': True,
                'status': game.status
            })
        except:
            return Response({
                'valid': False
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['get'])
    def validate_player(self, request, game_id=None):
        """
        Custom endpoint: /api/games/{game_id}/validate_player/?player_id=123

        Check if a player is in this game.
        Used for session persistence validation.
        """
        game = self.get_object()
        player_id = request.query_params.get('player_id')

        if not player_id:
            return Response(
                {'error': 'player_id query parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            participant = GameParticipant.objects.get(game=game, player_id=player_id)
            return Response({
                'valid': True,
                'player_number': participant.player_number,
                'player_name': participant.player.display_name
            })
        except GameParticipant.DoesNotExist:
            return Response({
                'valid': False
            })

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

    @action(detail=True, methods=['post'])
    def end(self, request, game_id=None):
        """
        Custom endpoint: /api/games/{game_id}/end/

        Manually end the game (mark as completed).
        Host control to finish the game before all judging is complete.
        """
        from django.utils import timezone
        game = self.get_object()

        if game.status in ['completed', 'abandoned']:
            return Response(
                {'error': f'Game already {game.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update game status
        game.status = 'completed'
        game.ended_at = timezone.now()
        game.save()

        serializer = self.get_serializer(game)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def abandon(self, request, game_id=None):
        """
        Custom endpoint: /api/games/{game_id}/abandon/

        Abandon the game (mark as abandoned).
        Host control to cancel/abort the game.
        """
        from django.utils import timezone
        game = self.get_object()

        if game.status in ['completed', 'abandoned']:
            return Response(
                {'error': f'Game already {game.status}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update game status
        game.status = 'abandoned'
        game.ended_at = timezone.now()
        game.save()

        serializer = self.get_serializer(game)
        return Response(serializer.data)















































