from django.contrib import admin
from .models import Episode, Category, Clue, Game, GameParticipant, GameAction, ClueReveal

# Register your models here.



@admin.register(Episode)
class EpisodeAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'season_number', 'episode_number', 'air_date', 'total_clues', 'created_at')
    list_filter = ('season_number', 'created_at')
    search_fields = ('season_number', 'episode_number')
    ordering = ('season_number', 'episode_number')

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'episode', 'round_type', 'position')
    list_filter = ('round_type', 'episode__season_number')
    search_fields = ('name', 'episode__season_number')
    ordering = ('episode', 'round_type', 'position')

@admin.register(Clue)
class ClueAdmin(admin.ModelAdmin):
    list_display = ('category', 'value', 'position', 'is_daily_double', 'question_preview')
    list_filter = ('is_daily_double', 'value', 'category__round_type')
    search_fields = ('question', 'answer', 'category__name')

    def question_preview(self, obj):
        """Show first 50 characters of question"""
        return obj.question[:50] + '...' if len(obj.question) > 50 else obj.question
    question_preview.short_description = 'Question Preview'

@admin.register(Game)
class GameAdmin(admin.ModelAdmin):
    list_display = ('game_id', 'episode', 'host', 'status', 'current_round', 'created_at')
    list_filter = ('status', 'current_round', 'created_at')
    search_fields = ('game_id', 'host__display_name')
    readonly_fields = ('game_id', 'created_at', 'started_at', 'ended_at')

    fieldsets = (
            ('Game Information', {
                'fields': ('game_id', 'episode', 'host', 'status', 'current_round')
            }),
            ('Settings', {
                'fields': ('settings',)
            }),
            ('Timestamps', {
                'fields': ('created_at', 'started_at', 'ended_at'),
                'classes': ('collapse',)
            }),
        )

@admin.register(GameParticipant)
class GameParticipantAdmin(admin.ModelAdmin):
    list_display = ('player', 'game', 'player_number', 'score', 'joined_at')
    list_filter = ('player_number', 'joined_at')
    search_fields = ('player__display_name', 'game__game_id')
    ordering = ('game', 'player_number')

@admin.register(GameAction)
class GameActionAdmin(admin.ModelAdmin):
    list_display = ('game', 'participant', 'action_type', 'timestamp')
    list_filter = ('action_type', 'timestamp')
    search_fields = ('game__game_id', 'participant__player__display_name')
    readonly_fields = ('timestamp', 'server_timestamp_us')
    ordering = ('-timestamp',)

@admin.register(ClueReveal)
class ClueRevealAdmin(admin.ModelAdmin):
    list_display = ('game', 'clue', 'buzz_winner', 'correct', 'revealed_at')
    list_filter = ('correct', 'revealed_at')
    search_fields = ('game__game_id', 'clue__question')
    ordering = ('-revealed_at',)


