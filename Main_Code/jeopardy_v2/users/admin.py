from django.contrib import admin
from .models import Player

# Register your models here.


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    """
    Configure how Player model appears in admin panel
    """

    # Fields to display in list view
    list_display = ('display_name', 'total_games', 'total_score', 'average_score', 'created_at')

    # Add filters in sidebar
    list_filter = ('created_at',)

    # Add search functionality
    search_fields = ('display_name', 'user__username')

    # Fields that can't be edited
    readonly_fields = ('created_at', 'guest_session', 'average_score')

    # Organize fields into sections
    fieldsets = (
            ('Basic Information', {
                'fields': ('display_name', 'user', 'guest_session')
            }),
            ('Statistics', {
                'fields': ('total_games', 'total_score', 'average_score')
            }),
            ('Metadata', {
                'fields': ('created_at',),
                'classes': ('collapse',) # Collapsible section
            }),
        )


