from django.db import models
from users.models import Player
import uuid


# Create your models here.

class Episode(models.Model):
    """
    Represents a single Jeopardy! episode with all its clues.
    One episode = one game board (Single, Double, Final Jeopardy)
    """

    season_number = models.IntegerField(
            help_text="Season number (e.g., 1, 2, 3)"
        )
    
    episode_number = models.IntegerField(
            help_text="Episode number within season"
        )
    
    air_date = models.DateField(
            null=True,
            blank=True,
            help_text="Original air date (if known)"
        )

    created_at = models.DateTimeField(
            auto_now_add=True
        )

    class Meta:
        # Ensure no duplicate episodes
        unique_together = ('season_number', 'episode_number')
        ordering = ['season_number', 'episode_number']
        verbose_name = 'Episode'
        verbose_name_plural = 'Episodes'

    def __str__(self):
        return f"S{self.season_number}E{self.episode_number}"

    @property
    def total_clues(self):
        """Count all clues in this episode"""
        return Clue.objects.filter(category__episode=self).count()

class Category(models.Model):
    """
    Represents a category on the game board.
    Each episode has 6 categories for Single, 6 for Double, 1 for Final.
    """
    ROUND_CHOICES = [
            ('single', 'Single Jeopardy'),
            ('double', 'Double Jeopardy'),
            ('final', 'Final Jeopardy'),
        ]

    episode = models.ForeignKey(
            Episode,
            on_delete=models.CASCADE,
            help_text="Which episode this category belongs to"
        )

    name = models.CharField(
            max_length=200,
            help_text="Category name (e.g., 'POTENT POTABLES')"
        )

    round_type = models.CharField(
            max_length=20,
            choices=ROUND_CHOICES,
            help_text="Which round this category appears in"
        )

    position = models.IntegerField(
            help_text="Position on board (0-5 for regular rounds)"
        )

    class Meta:
        ordering = ['episode', 'round_type', 'position']
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'

    def __str__(self):
        return f"{self.episode} - {self.name}"


class Clue(models.Model):
    """
    Represents a single clue (question/answer pair).
    Each category has 5 clues (except Final which has 1).
    """
    category = models.ForeignKey(
            Category,
            on_delete=models.CASCADE,
            help_text="Which category this clue belongs to"
        )

    question = models.TextField(
            help_text="The clue text (what's read to players)"
        )

    answer = models.TextField(
            help_text="The correct answer"
        )

    value = models.IntegerField(
            help_text="Point value (200, 400, 600, 800, 1000, or 400, 800, etc.)"
        )

    position = models.IntegerField(
            help_text="Position within category (0-4)"
        )

    is_daily_double = models.BooleanField(
            default=False,
            help_text="Is this clue a Daily Double?"
        )

    class Meta:
        ordering = ['category', 'position']
        verbose_name = 'Clue',
        verbose_name_plural = 'Clues'

    def __str__(self):
        return f"{self.category.name} - ${self.value}"
    
class Game(models.Model):
    """
    Represents a single game instance.
    Multiple people can play the same episode simultaneously in different games.
    """
    STATUS_CHOICES = [
            ('waiting', 'Waiting for Players'),
            ('active', 'Game in Progress'),
            ('paused', 'Paused'),
            ('completed', 'Completed'),
            ('abandoned', 'Abandoned'),
        ]

    ROUND_CHOICES = [
            ('single', 'Single Jeopardy'),
            ('double', 'Double Jeopardy'),
            ('final', 'Final Jeopardy'),
        ]

    # Unique identifier for this game
    game_id = models.UUIDField(
            default=uuid.uuid4,
            unique=True,
            db_index=True,
            editable=False,
            help_text="Unique game identifier (used in URLs)"
        )

    episode = models.ForeignKey(
            Episode,
            on_delete=models.PROTECT, # Can't delete episode if games exist
            help_text="Which episode this game users"
        )

    host = models.ForeignKey(
            Player,
            on_delete=models.SET_NULL,
            null=True,
            related_name='hosted_games',
            help_text="Player who is hosting this game"
        )

    status = models.CharField(
            max_length=20,
            choices=STATUS_CHOICES,
            default='waiting',
            help_text="Current game status"
        )

    current_round = models.CharField(
            max_length=20,
            choices=ROUND_CHOICES,
            default='single',
            help_text="Which round the game is currently in"
        )

    settings = models.JSONField(
            default=dict,
            blank=True,
            help_text="Game configuration (optional rules, timing, etc.)"
        )

    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Game'
        verbose_name_plural = 'Games'

    def __str__(self):
        return f"Game {self.game_id} ({self.status})"

    @property
    def is_completed(self):
        """Check if game finished normally"""
        return self.status == 'completed'

    def get_winner(self):
        """
        Get the winning player (highest score).
        Returns GameParticipant or None if no participants.
        """
        participants = self.gameparticipant_set.all().order_by('-score')
        return participants.first() if participants.exists() else None

    def get_ranked_scores(self):
        """
        Get all participants ranked by score (highest to lowest).
        Returns list of dicts with player info and ranking.
        """
        participants = self.gameparticipant_set.select_related('player').order_by('-score')

        ranked = []
        current_rank = 1
        prev_score = None

        for i, participant in enumerate(participants, 1):
            # Handle ties - same score gets same rank
            if prev_score is not None and participant.score != prev_score:
                current_rank = i

            ranked.append({
                'player_number': participant.player_number,
                'player_name': participant.player.display_name,
                'player_id': participant.player.id,
                'score': participant.score,
                'rank': current_rank
            })

            prev_score = participant.score

        return ranked

class GameParticipant(models.Model):
    """
    Links a player to a Game.
    Tracks their score and position (player 1, 2, or 3).
    """

    game = models.ForeignKey(
            Game,
            on_delete=models.CASCADE,
            help_text="Which game this participant is in"
        )
    
    player = models.ForeignKey(
            Player,
            on_delete=models.CASCADE,
            help_text="Which player this is"
        )

    player_number = models.IntegerField(
            help_text="Position (1-6)"
        )

    score = models.IntegerField(
            default=0,
            help_text="Current score in this game"
        )

    final_wager = models.IntegerField(
            null=True,
            blank=True,
            help_text="Wager amount for Final Jeopardy"
        )

    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # Each game can only have one player in each position
        unique_together = ('game', 'player_number')
        ordering = ['game', 'player_number']
        verbose_name = 'Game Participant'
        verbose_name_plural = 'Game Paticipants'

    def __str__(self):
        return f"{self.player.display_name} (Player {self.player_number}) - ${self.score}"


class GameAction(models.Model):
    """
    Audit trail: logs every action in the game.
    Used for buzzer timing, debugging, and game replay.
    """
    
    game = models.ForeignKey(
            Game,
            on_delete=models.CASCADE,
            help_text="Which game this action occurred in"
        )

    participant = models.ForeignKey(
            GameParticipant,
            on_delete=models.SET_NULL,
            null=True,
            blank=True,
            help_text="Which participant performed this action"
        )

    timestamp = models.DateTimeField(
            auto_now_add=True,
            db_index=True,
            help_text="When this action occurred"
        )

    action_type = models.CharField(
            max_length=50,
            help_text="Type of action (buzz, answer, score_change, etc.)"
        )

    data = models.JSONField(
            default=dict,
            help_text="Action-specific data stored as JSON"
        )

    server_timestamp_us = models.BigIntegerField(
            help_text="Microsecond precision timestamp for buzzer timing"
        )

    class Meta:
        ordering = ['timestamp']
        verbose_name = 'Game Action'
        verbose_name_plural = 'Game Actions'

    def __str__(self):
        return f"{self.action_type} at {self.timestamp}"

class ClueReveal(models.Model):
    """
    Tracks which clues have been revealed in a game.
    Record who buzzed, whether they got it right, etc.
    """

    game = models.ForeignKey(
            Game,
            on_delete=models.CASCADE,
            help_text="Which game this clue was revealed in"
        )

    clue = models.ForeignKey(
            Clue,
            on_delete=models.PROTECT,
            help_text="Which clue was revealed"
        )

    revealed_at = models.DateTimeField(
            auto_now_add=True,
            help_text="When the clue was revealed"
        )

    revealed_by = models.ForeignKey(
            GameParticipant,
            on_delete=models.SET_NULL,
            null=True,
            blank=True,
            help_text="Who selected this clue (host picks for them)"
        )
    
    buzz_winner = models.ForeignKey(
            GameParticipant,
            on_delete=models.SET_NULL,
            null=True,
            blank=True,
            related_name='won_buzzes',
            help_text="Who buzzed in first and got to answer"
        )

    correct = models.BooleanField(
            null=True,
            blank=True,
            help_text="Was the answer correct? (None = not answered yet)"
        )

    class Meta:
        ordering = ['revealed_at']
        verbose_name = 'Clue Reveal'
        verbose_name_plural = 'Clue Reveals'

    def __str__(self):
        return f"{self.clue} revealed in {self.game}"




