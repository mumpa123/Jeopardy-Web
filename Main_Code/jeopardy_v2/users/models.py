from django.db import models
from django.contrib.auth.models import User
import uuid



# Create your models here.



class Player(models.Model):
    """
    Represents a player in the game.
    Can be linked to a User account or be a guest.
    """
    # Link to Django's built-in User model (optional - for registered users)
    user = models.OneToOneField(
            User,
            on_delete=models.CASCADE,
            null=True,
            blank=True,
            help_text="Link to user account if player is registered"
        )

    # Display name shown in game
    display_name = models.CharField(
            max_length=50,
            help_text="Name displayed during gameplay"
        )

    # For guest players (not registered)
    guest_session = models.UUIDField(
            null=True,
            blank=True,
            default=uuid.uuid4,
            help_text="Unique identifier for guest players"
        )
    # Statistics
    total_games = models.IntegerField(
            default=0,
            help_text="Total number of games played"
        )

    total_score = models.BigIntegerField(
            default=0,
            help_text="Cumulative score across all games"
        )

    created_at = models.DateTimeField(
            auto_now_add=True,
            help_text="When this player was created"
        )
    
    class Meta:
        ordering = ['-created_at'] # Newest players first
        verbose_name = 'Player'
        verbose_name_plural = 'Players'

    def __str__(self):
        """String representation shown in admin panel"""
        return self.display_name
    
    @property
    def average_score(self):
        """Calculate average score per game"""
        if self.total_games == 0:
            return 0
        return self.total_score / self.total_games


