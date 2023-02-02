# chat/urls.py
from django.urls import path

from . import views


urlpatterns = [
    path("", views.index, name="index"),
    path("host/<int:season_num>/<int:show_num>/", views.host, name="host"),
    path("player/<str:player_name>/<int:player_num>/", views.player, name="player"),
    path("board/<int:season_num>/<int:show_num>/", views.board, name="board"),
    path("<str:room_name>/", views.room, name="room"),
] 