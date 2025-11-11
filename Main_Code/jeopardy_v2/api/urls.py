
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EpisodeViewSet, PlayerViewSet, GameViewSet

# Create router
router = DefaultRouter()

# Register Viewsets
router.register(r'episodes', EpisodeViewSet, basename='episode')
router.register(r'players', PlayerViewSet, basename='player')
router.register(r'games', GameViewSet, basename='game')

# URL patterns
urlpatterns = [
        path('', include(router.urls)),
]


