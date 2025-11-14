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

        # Check if request context include user role
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
    # Inclues the computed property from the model

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
                'air_date',
                'episode_number',
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
        Custm method to show episode as 'S1E5' format.
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



























