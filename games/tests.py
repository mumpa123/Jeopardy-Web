
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

        # Add 200 points toplayer 1
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
        self.assertIn(42, state['revealed_clues'])

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





















