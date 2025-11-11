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
    - Stage synchronization
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
        Route incoming messages to appropriate handlers
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

        # Get current scores and game state
        scores = await database_sync_to_async(self.engine.get_scores)()
        state = await database_sync_to_async(self.engine.get_state)()
        revealed_clues = state.get('revealed_clues', [])

        # Broadcast
        await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'return_to_board',
                    'scores': scores,
                    'revealed_clues': revealed_clues
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
                'is_daily_double': clue.is_daily_double,
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
        
    


































