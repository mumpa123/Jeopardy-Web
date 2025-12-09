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

        # Initialize game state in Redis if not already initialized
        state = await database_sync_to_async(self.engine.get_state)()
        if not state or 'episode_id' not in state:
            print(f"[connect] Initializing Redis state for game {self.game_id}")
            participants = await self.get_participants()
            player_numbers = [p['player_number'] for p in participants]

            # Select Daily Doubles for this episode
            daily_doubles = await self.select_daily_doubles(self.game['episode_id'])

            await database_sync_to_async(self.engine.initialize_game)(
                self.game['episode_id'],
                player_numbers,
                daily_doubles
            )
            print(f"[connect] Game state initialized with episode_id: {self.game['episode_id']} and {len(daily_doubles)} Daily Doubles")

        # Join room group
        await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
        )

        await self.accept()

        # Send current game state
        state = await database_sync_to_async(self.engine.get_state)()
        scores = await database_sync_to_async(self.engine.get_scores)()
        participants = await self.get_participants()
        current_player = await database_sync_to_async(self.engine.get_current_player)()

        # Convert integer keys to strings for JSON serialization
        scores_str = {str(k): v for k, v in scores.items()}

        # Build players dict with names
        players_dict = {str(p['player_number']): p['player_name'] for p in participants}

        await self.send_json({
            'type': 'connection_established',
            'game_id': self.game_id,
            'state': state,
            'scores': scores_str,
            'players': players_dict,
            'current_player': current_player
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
                'enable_buzzer': self.handle_enable_buzzer,
                'judge_answer': self.handle_judge_answer,
                'next_clue': self.handle_next_clue,
                'reset_game': self.handle_reset_game,
                'adjust_score': self.handle_adjust_score,
                'start_round': self.handle_start_round,
                'reveal_daily_double': self.handle_reveal_daily_double,
                'submit_wager': self.handle_submit_wager,
                'show_dd_clue': self.handle_show_dd_clue,
                'submit_dd_answer': self.handle_submit_dd_answer,
                'judge_dd_answer': self.handle_judge_dd_answer,
                'start_final_jeopardy': self.handle_start_final_jeopardy,
                'submit_fj_wager': self.handle_submit_fj_wager,
                'reveal_fj_clue': self.handle_reveal_fj_clue,
                'start_fj_timer': self.handle_start_fj_timer,
                'submit_fj_answer': self.handle_submit_fj_answer,
                'judge_fj_answer': self.handle_judge_fj_answer,
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
        unlock_token = content.get('unlock_token')  # Token received from buzzer_enabled broadcast

        # Process buzz through game engine with unlock token validation
        result = await database_sync_to_async(self.engine.handle_buzz)(
                player_number,
                client_timestamp,
                unlock_token
        )

        # Log to database
        await self.log_action('buzz', {
            'player_number': player_number,
            'result': result
        })

        # Get player name
        participants = await self.get_participants()
        player_name = next(
            (p['player_name'] for p in participants if p['player_number'] == player_number),
            f"Player {player_number}"
        )

        # Broadcast result to all clients
        await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'buzz_result',
                    'player_number': player_number,
                    'player_name': player_name,
                    'accepted': result['accepted'],
                    'winner': result['winner'],
                    'position': result['position'],
                    'server_timestamp': result['server_timestamp_us'],
                    'cooldown': result.get('cooldown', False),
                    'cooldown_remaining': result.get('cooldown_remaining', 0.0)
                }
            )

    async def handle_reveal_clue(self, content):
        """
        Handle host revealing a clue.
        Checks if it's a Daily Double.
        """
        clue_id = content.get('clue_id')

        # Update game engine
        await database_sync_to_async(self.engine.reveal_clue)(clue_id)

        # Lock buzzer until host finishes reading
        await database_sync_to_async(self.engine.lock_buzzer)()

        # Get clue data
        clue_data = await self.get_clue_data(clue_id)

        # Check if this is a Daily Double
        daily_doubles = await database_sync_to_async(self.engine.get_daily_doubles)()
        is_daily_double = clue_id in daily_doubles

        if is_daily_double:
            # Get current player (who gets to wager)
            current_player = await database_sync_to_async(self.engine.get_current_player)()

            # If no current player set, default to player 1
            if current_player is None:
                current_player = 1
                await database_sync_to_async(self.engine.set_current_player)(1)

            # Set DD state to 'detected'
            await database_sync_to_async(self.engine.set_dd_state)({
                'stage': 'detected',
                'player_number': current_player
            })

            # Send DD detection to all clients (host UI will handle differently)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'daily_double_detected',
                    'clue_id': clue_id,
                    'player_number': current_player
                }
            )
        else:
            # Normal clue - broadcast to all clients
            await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'clue_revealed',
                        'clue': clue_data
                    }
                )

    async def handle_enable_buzzer(self, content):
        """
        Handle host enabling the buzzer after finishing reading the clue.
        """
        # Unlock buzzer and get the unlock token
        unlock_token = await database_sync_to_async(self.engine.unlock_buzzer)()

        # Get current clue ID from state
        state = await database_sync_to_async(self.engine.get_state)()
        clue_id = state.get('current_clue')

        # Broadcast buzzer enabled to all clients with unlock token
        await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'buzzer_enabled',
                    'clue_id': int(clue_id) if clue_id else 0,
                    'unlock_token': unlock_token
                }
            )

    async def handle_judge_answer(self, content):
        """
        Handle host judging an answer.
        """
        player_number = content.get('player_number')
        correct = content.get('correct')
        value = content.get('value')

        # Update score in Redis
        delta = value if correct else -value
        new_score = await database_sync_to_async(
                self.engine.update_score
        )(player_number, delta)

        # Persist to database immediately
        await self.update_participant_score(player_number, new_score)

        # If answer is correct, set this player as current player (for Daily Doubles)
        if correct:
            await database_sync_to_async(self.engine.set_current_player)(player_number)

        # Get current player to send to frontend
        current_player = await database_sync_to_async(self.engine.get_current_player)()

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
                    'new_score': new_score,
                    'current_player': current_player
                }
            )

    async def handle_next_clue(self, content):
        """
        Handle returning to board (next clue).
        """
        print(f"[handle_next_clue] Processing next_clue request")

        # Reset buzzer
        await database_sync_to_async(self.engine.reset_buzzer)()

        # Clear current clue from state
        await database_sync_to_async(self.engine.update_state)({'current_clue': ''})

        # Clear DD state if any
        await database_sync_to_async(self.engine.clear_dd_state)()

        # Get current scores and game state
        scores = await database_sync_to_async(self.engine.get_scores)()
        state = await database_sync_to_async(self.engine.get_state)()
        revealed_clues = state.get('revealed_clues', [])

        print(f"[handle_next_clue] Scores: {scores}")
        print(f"[handle_next_clue] Revealed clues: {revealed_clues}")

        # Convert integer keys to strings for JSON serialization
        scores_str = {str(k): v for k, v in scores.items()}

        # Broadcast
        broadcast_data = {
            'type': 'return_to_board',
            'scores': scores_str,
            'revealed_clues': revealed_clues
        }
        print(f"[handle_next_clue] Broadcasting: {broadcast_data}")

        await self.channel_layer.group_send(
                self.room_group_name,
                broadcast_data
            )

        print(f"[handle_next_clue] Broadcast sent to group: {self.room_group_name}")

    async def handle_reset_game(self, content):
        """
        Handle resetting the game.
        Clears all scores, revealed clues, and resets to single jeopardy round.
        """
        print(f"[handle_reset_game] Processing reset_game request")

        # Reset game state in Redis
        reset_scores = await database_sync_to_async(self.engine.reset_game)()

        # Reset scores in database as well
        for player_number, score in reset_scores.items():
            await self.update_participant_score(player_number, score)

        # Get player names from database
        participants = await self.get_participants()
        players_dict = {str(p['player_number']): p['player_name'] for p in participants}

        # Convert integer keys to strings for JSON serialization
        scores_str = {str(k): v for k, v in reset_scores.items()}

        print(f"[handle_reset_game] Reset scores: {scores_str}")
        print(f"[handle_reset_game] Players: {players_dict}")

        # Broadcast game reset to all clients
        broadcast_data = {
            'type': 'game_reset',
            'scores': scores_str,
            'players': players_dict
        }

        await self.channel_layer.group_send(
            self.room_group_name,
            broadcast_data
        )

        print(f"[handle_reset_game] Broadcast sent to group: {self.room_group_name}")

    async def handle_adjust_score(self, content):
        """
        Handle manual score adjustment by host.
        """
        player_number = content.get('player_number')
        adjustment = content.get('adjustment')

        print(f"[handle_adjust_score] Player {player_number} adjustment: {adjustment}")

        # Update score in Redis
        new_score = await database_sync_to_async(
            self.engine.update_score
        )(player_number, adjustment)

        # Persist to database immediately
        await self.update_participant_score(player_number, new_score)

        # Log action
        await self.log_action('adjust_score', {
            'player_number': player_number,
            'adjustment': adjustment,
            'new_score': new_score
        })

        # Broadcast result to all clients
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'score_adjusted',
                'player_number': player_number,
                'adjustment': adjustment,
                'new_score': new_score
            }
        )

        print(f"[handle_adjust_score] Broadcast sent - new score: {new_score}")

    async def handle_start_round(self, content):
        """
        Handle host starting a new round (single, double, or final).
        Updates game state and broadcasts to all clients.
        """
        round_type = content.get('round')

        print(f"[handle_start_round] Starting round: {round_type}")

        # Update game state in Redis
        await database_sync_to_async(self.engine.update_state)({
            'current_round': round_type
        })

        # Clear revealed clues when switching rounds
        state = await database_sync_to_async(self.engine.get_state)()
        revealed_clues = []

        # Update revealed clues to empty list
        await database_sync_to_async(self.engine.update_state)({
            'revealed_clues': revealed_clues
        })

        # When starting Double Jeopardy, give control to the lowest-scoring player
        if round_type == 'double':
            scores = await database_sync_to_async(self.engine.get_scores)()
            if scores:
                # Find player with lowest score
                lowest_player = min(scores.items(), key=lambda x: x[1])[0]
                await database_sync_to_async(self.engine.set_current_player)(lowest_player)
                print(f"[handle_start_round] Set player {lowest_player} (lowest scorer) as current player for Double Jeopardy")

        # Get current player to send to frontend
        current_player = await database_sync_to_async(self.engine.get_current_player)()

        # Log action
        await self.log_action('start_round', {
            'round': round_type
        })

        # Broadcast round change to all clients
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'round_changed',
                'round': round_type,
                'revealed_clues': revealed_clues,
                'current_player': current_player
            }
        )

        print(f"[handle_start_round] Round changed to {round_type}, broadcast sent")

    async def handle_reveal_daily_double(self, content):
        """
        Handle host revealing the Daily Double to all players.
        This happens after DD is detected and host clicks "Reveal Daily Double".
        NOTE: This just allows player to wager - clue is NOT shown yet.
        """
        print(f"[handle_reveal_daily_double] Processing reveal DD request")

        # Get DD state
        dd_state = await database_sync_to_async(self.engine.get_dd_state)()
        player_number = dd_state.get('player_number')

        # Get player name
        participants = await self.get_participants()
        player_name = next(
            (p['player_name'] for p in participants if p['player_number'] == player_number),
            f"Player {player_number}"
        )

        # Update DD state to 'revealed'
        await database_sync_to_async(self.engine.set_dd_state)({
            'stage': 'revealed',
            'player_number': player_number
        })

        # Broadcast DD reveal to all clients (NO clue data yet!)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'daily_double_revealed',
                'player_number': player_number,
                'player_name': player_name
            }
        )

        print(f"[handle_reveal_daily_double] Broadcast sent - player {player_number}")

    async def handle_submit_wager(self, content):
        """
        Handle player submitting Daily Double wager.
        """
        player_number = content.get('player_number')
        wager = content.get('wager')

        print(f"[handle_submit_wager] Player {player_number} wager: ${wager}")

        # Get current round and score
        state = await database_sync_to_async(self.engine.get_state)()
        round_type = state.get('current_round', 'single')
        scores = await database_sync_to_async(self.engine.get_scores)()
        player_score = scores.get(player_number, 0)

        # Validate wager
        validation = await database_sync_to_async(
            self.engine.validate_dd_wager
        )(player_number, wager, round_type, player_score)

        if not validation['valid']:
            # Send error back to player
            await self.send_json({
                'type': 'error',
                'message': validation['error']
            })
            return

        # Update DD state with wager
        await database_sync_to_async(self.engine.set_dd_state)({
            'stage': 'wagering',
            'player_number': player_number,
            'wager': wager
        })

        # Log action
        await self.log_action('submit_wager', {
            'player_number': player_number,
            'wager': wager
        })

        # Broadcast wager submitted
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'wager_submitted',
                'player_number': player_number,
                'wager': wager
            }
        )

        print(f"[handle_submit_wager] Wager accepted and broadcast")

    async def handle_show_dd_clue(self, content):
        """
        Handle host revealing the DD clue AFTER wager has been submitted.
        This is when host clicks "Show Clue" button.
        """
        print(f"[handle_show_dd_clue] Processing show DD clue request")

        # Get current clue data
        state = await database_sync_to_async(self.engine.get_state)()
        clue_id = state.get('current_clue')
        clue_data = await self.get_clue_data(clue_id) if clue_id else None

        if not clue_data:
            print(f"[handle_show_dd_clue] ERROR: No clue data found")
            return

        # Get DD state for player info
        dd_state = await database_sync_to_async(self.engine.get_dd_state)()
        player_number = dd_state.get('player_number')

        # Update DD state to 'answering'
        dd_state['stage'] = 'answering'
        await database_sync_to_async(self.engine.set_dd_state)(dd_state)

        # Broadcast clue to all clients
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'dd_clue_shown',
                'player_number': player_number,
                'clue': clue_data
            }
        )

        print(f"[handle_show_dd_clue] Clue broadcast to all clients")

    async def handle_submit_dd_answer(self, content):
        """
        Handle player submitting their Daily Double answer (text).
        """
        player_number = content.get('player_number')
        answer = content.get('answer', '')

        print(f"[handle_submit_dd_answer] Player {player_number} answer: {answer}")

        # Update DD state with answer
        dd_state = await database_sync_to_async(self.engine.get_dd_state)()
        dd_state['stage'] = 'answering'
        dd_state['answer'] = answer
        await database_sync_to_async(self.engine.set_dd_state)(dd_state)

        # Log action
        await self.log_action('submit_dd_answer', {
            'player_number': player_number,
            'answer': answer
        })

        # Broadcast answer submitted (host can see it)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'dd_answer_submitted',
                'player_number': player_number,
                'answer': answer
            }
        )

        print(f"[handle_submit_dd_answer] Answer broadcast to host")

    async def handle_judge_dd_answer(self, content):
        """
        Handle host judging a Daily Double answer.
        """
        player_number = content.get('player_number')
        correct = content.get('correct')

        print(f"[handle_judge_dd_answer] Player {player_number} correct: {correct}")

        # Get DD state for wager amount
        dd_state = await database_sync_to_async(self.engine.get_dd_state)()
        wager = dd_state.get('wager', 0)

        # Update score in Redis (+/- wager amount)
        delta = wager if correct else -wager
        new_score = await database_sync_to_async(
            self.engine.update_score
        )(player_number, delta)

        # Persist to database immediately
        await self.update_participant_score(player_number, new_score)

        # If correct, set this player as current player
        if correct:
            await database_sync_to_async(self.engine.set_current_player)(player_number)

        # Update DD state to 'judged'
        dd_state['stage'] = 'judged'
        await database_sync_to_async(self.engine.set_dd_state)(dd_state)

        # Log action
        await self.log_action('judge_dd_answer', {
            'player_number': player_number,
            'correct': correct,
            'wager': wager,
            'new_score': new_score
        })

        # Broadcast result
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'dd_answer_judged',
                'player_number': player_number,
                'correct': correct,
                'wager': wager,
                'new_score': new_score
            }
        )

        print(f"[handle_judge_dd_answer] Result broadcast - new score: {new_score}")

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
        print(f"[return_to_board] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[return_to_board] Sent to WebSocket client")

    async def player_joined(self, event):
        """Receive player joined broadcast."""
        await self.send_json(event)

    async def buzzer_enabled(self, event):
        """Receive buzzer enabled broadcast."""
        await self.send_json(event)

    async def game_reset(self, event):
        """Receive game reset broadcast."""
        print(f"[game_reset] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[game_reset] Sent to WebSocket client")

    async def score_adjusted(self, event):
        """Receive score adjusted broadcast."""
        print(f"[score_adjusted] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[score_adjusted] Sent to WebSocket client")

    async def round_changed(self, event):
        """Receive round changed broadcast."""
        print(f"[round_changed] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[round_changed] Sent to WebSocket client")

    async def daily_double_detected(self, event):
        """Receive daily double detected broadcast."""
        print(f"[daily_double_detected] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[daily_double_detected] Sent to WebSocket client")

    async def daily_double_revealed(self, event):
        """Receive daily double revealed broadcast."""
        print(f"[daily_double_revealed] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[daily_double_revealed] Sent to WebSocket client")

    async def wager_submitted(self, event):
        """Receive wager submitted broadcast."""
        print(f"[wager_submitted] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[wager_submitted] Sent to WebSocket client")

    async def dd_clue_shown(self, event):
        """Receive DD clue shown broadcast."""
        print(f"[dd_clue_shown] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[dd_clue_shown] Sent to WebSocket client")

    async def dd_answer_submitted(self, event):
        """Receive DD answer submitted broadcast."""
        print(f"[dd_answer_submitted] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[dd_answer_submitted] Sent to WebSocket client")

    async def dd_answer_judged(self, event):
        """Receive DD answer judged broadcast."""
        print(f"[dd_answer_judged] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[dd_answer_judged] Sent to WebSocket client")

    # Final Jeopardy handlers

    async def handle_start_final_jeopardy(self, content):
        """
        Handle host starting Final Jeopardy.
        Shows the category to all players.
        """
        print(f"[handle_start_final_jeopardy] Starting Final Jeopardy")

        # Get Final Jeopardy clue (round_type = 'final')
        state = await database_sync_to_async(self.engine.get_state)()
        episode_id = state.get('episode_id')

        # Convert episode_id to int (it's stored as string in Redis)
        if episode_id:
            episode_id = int(episode_id)

        print(f"[handle_start_final_jeopardy] Episode ID: {episode_id}")

        # Get the Final Jeopardy category and clue
        fj_data = await self.get_final_jeopardy_data(episode_id)

        print(f"[handle_start_final_jeopardy] FJ data retrieved: {fj_data}")

        if not fj_data:
            print(f"[handle_start_final_jeopardy] ERROR: No Final Jeopardy clue found")
            await self.send_json({
                'type': 'error',
                'message': 'No Final Jeopardy clue found for this episode'
            })
            return

        # Update game state to final round
        await database_sync_to_async(self.engine.update_state)({'current_round': 'final'})

        # Initialize FJ state in Redis
        await database_sync_to_async(self.engine.set_fj_state)({
            'stage': 'category_shown',
            'clue_id': fj_data['clue_id'],
            'category': fj_data['category']
        })

        print(f"[handle_start_final_jeopardy] Broadcasting category: {fj_data['category']}")

        # Broadcast category to all clients
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'fj_category_shown',
                'category': fj_data['category']
            }
        )

        print(f"[handle_start_final_jeopardy] Broadcast sent successfully")

    async def handle_submit_fj_wager(self, content):
        """
        Handle player submitting Final Jeopardy wager.
        """
        player_number = content.get('player_number')
        wager = content.get('wager')

        print(f"[handle_submit_fj_wager] Player {player_number} wager: ${wager}")

        # Get player's current score
        scores = await database_sync_to_async(self.engine.get_scores)()
        player_score = scores.get(player_number, 0)

        # Validate wager (must be between 0 and player's score, or 0 if negative)
        max_wager = max(0, player_score)
        if wager < 0 or wager > max_wager:
            await self.send_json({
                'type': 'error',
                'message': f'Invalid wager. Must be between $0 and ${max_wager}'
            })
            return

        # Store wager in Redis FJ state
        await database_sync_to_async(self.engine.set_fj_wager)(player_number, wager)

        # Broadcast wager submitted
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'fj_wager_submitted',
                'player_number': player_number,
                'wager': wager
            }
        )

        print(f"[handle_submit_fj_wager] Wager accepted and broadcast")

    async def handle_reveal_fj_clue(self, content):
        """
        Handle host revealing Final Jeopardy clue.
        Shows the clue but does NOT start the timer yet.
        """
        print(f"[handle_reveal_fj_clue] Revealing FJ clue")

        # Get FJ state
        fj_state = await database_sync_to_async(self.engine.get_fj_state)()
        clue_id = fj_state.get('clue_id')

        # Get clue data
        clue_data = await self.get_clue_data(clue_id) if clue_id else None

        if not clue_data:
            print(f"[handle_reveal_fj_clue] ERROR: No clue data found")
            return

        # Update FJ state (clue revealed, waiting for timer)
        fj_state['stage'] = 'clue_revealed'
        await database_sync_to_async(self.engine.set_fj_state)(fj_state)

        # Broadcast clue (WITHOUT timer start)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'fj_clue_revealed',
                'clue': clue_data
            }
        )

        print(f"[handle_reveal_fj_clue] Clue revealed, waiting for host to start timer")

    async def handle_start_fj_timer(self, content):
        """
        Handle host starting Final Jeopardy timer after reading the clue.
        This starts the 30-second timer and plays the music.
        """
        print(f"[handle_start_fj_timer] Starting FJ timer")

        # Update FJ state
        fj_state = await database_sync_to_async(self.engine.get_fj_state)()
        fj_state['stage'] = 'timer_running'
        await database_sync_to_async(self.engine.set_fj_state)(fj_state)

        # Broadcast timer start
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'fj_timer_started',
                'timer_duration': 30  # 30 seconds
            }
        )

        print(f"[handle_start_fj_timer] Timer started, music should be playing")

    async def handle_submit_fj_answer(self, content):
        """
        Handle player submitting Final Jeopardy answer.
        """
        player_number = content.get('player_number')
        answer = content.get('answer', '')

        print(f"[handle_submit_fj_answer] Player {player_number} answer: {answer}")

        # Store answer in Redis
        await database_sync_to_async(self.engine.set_fj_answer)(player_number, answer)

        # Broadcast to host only (not to other players)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'fj_answer_submitted',
                'player_number': player_number,
                'answer': answer
            }
        )

        print(f"[handle_submit_fj_answer] Answer stored and broadcast to host")

    async def handle_judge_fj_answer(self, content):
        """
        Handle host judging a Final Jeopardy answer.
        """
        player_number = content.get('player_number')
        correct = content.get('correct')

        print(f"[handle_judge_fj_answer] Judging player {player_number}: {'correct' if correct else 'incorrect'}")

        # Get wager
        wager = await database_sync_to_async(self.engine.get_fj_wager)(player_number)

        # Calculate score change
        score_change = wager if correct else -wager

        # Update score in Redis
        new_score = await database_sync_to_async(self.engine.update_score)(player_number, score_change)

        # Persist to database immediately
        await self.update_participant_score(player_number, new_score)

        # Mark as judged
        await database_sync_to_async(self.engine.set_fj_judged)(player_number, correct)

        # Broadcast result
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'fj_answer_judged',
                'player_number': player_number,
                'correct': correct,
                'wager': wager,
                'new_score': new_score
            }
        )

        print(f"[handle_judge_fj_answer] Judgment broadcast - new score: {new_score}")

        # Check if all players have been judged - if so, auto-complete the game
        await self.check_and_complete_game()

    async def handle_end_game(self, content):
        """
        Manually end the game (host control).
        Sets status to 'completed' and broadcasts game_completed event.
        """
        from django.utils import timezone

        print(f"[handle_end_game] Host manually ending game")

        # Get the game
        game = await database_sync_to_async(
            Game.objects.select_related('episode').get
        )(game_id=self.game_id)

        # Check if already completed
        if game.status == 'completed':
            print(f"[handle_end_game] Game already completed")
            return

        # Get final scores from Redis and save to database
        scores = await database_sync_to_async(self.engine.get_scores)()
        print(f"[handle_end_game] Final scores from Redis: {scores}")
        await self.save_final_scores_to_db(scores)

        # Update game status to completed
        game.status = 'completed'
        game.ended_at = timezone.now()
        await database_sync_to_async(game.save)()

        # Broadcast game completed
        # Convert integer keys to strings for MessagePack compatibility
        final_scores = {str(k): v for k, v in scores.items()}

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_completed',
                'final_scores': final_scores,
                'reason': 'manual_end'
            }
        )

        print(f"[handle_end_game] Game manually ended and marked as completed")

    async def handle_abandon_game(self, content):
        """
        Abandon the game (host control).
        Sets status to 'abandoned' and broadcasts game_abandoned event.
        """
        from django.utils import timezone

        print(f"[handle_abandon_game] Host abandoning game")

        # Get the game
        game = await database_sync_to_async(
            Game.objects.select_related('episode').get
        )(game_id=self.game_id)

        # Check if already completed or abandoned
        if game.status in ['completed', 'abandoned']:
            print(f"[handle_abandon_game] Game already {game.status}")
            return

        # Get final scores from Redis and save to database
        scores = await database_sync_to_async(self.engine.get_scores)()
        print(f"[handle_abandon_game] Final scores from Redis: {scores}")
        await self.save_final_scores_to_db(scores)

        # Update game status to abandoned
        game.status = 'abandoned'
        game.ended_at = timezone.now()
        await database_sync_to_async(game.save)()

        # Broadcast game abandoned
        # Convert integer keys to strings for MessagePack compatibility
        final_scores = {str(k): v for k, v in scores.items()}

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_abandoned',
                'final_scores': final_scores
            }
        )

        print(f"[handle_abandon_game] Game abandoned")

    # Broadcast receivers for Final Jeopardy

    async def fj_category_shown(self, event):
        """Receive FJ category shown broadcast."""
        print(f"[fj_category_shown] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[fj_category_shown] Sent to WebSocket client")

    async def fj_wager_submitted(self, event):
        """Receive FJ wager submitted broadcast."""
        print(f"[fj_wager_submitted] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[fj_wager_submitted] Sent to WebSocket client")

    async def fj_clue_revealed(self, event):
        """Receive FJ clue revealed broadcast."""
        print(f"[fj_clue_revealed] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[fj_clue_revealed] Sent to WebSocket client")

    async def fj_timer_started(self, event):
        """Receive FJ timer started broadcast."""
        print(f"[fj_timer_started] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[fj_timer_started] Sent to WebSocket client")

    async def fj_answer_submitted(self, event):
        """Receive FJ answer submitted broadcast."""
        print(f"[fj_answer_submitted] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[fj_answer_submitted] Sent to WebSocket client")

    async def fj_answer_judged(self, event):
        """Receive FJ answer judged broadcast."""
        print(f"[fj_answer_judged] Received broadcast event: {event}")
        await self.send_json(event)
        print(f"[fj_answer_judged] Sent to WebSocket client")

    async def game_completed(self, event):
        """Receive game completed broadcast."""
        print(f"[game_completed] Game has been completed")
        await self.send_json(event)

    async def game_abandoned(self, event):
        """Receive game abandoned broadcast."""
        print(f"[game_abandoned] Game has been abandoned")
        await self.send_json(event)

    # Helper methods

    async def check_and_complete_game(self):
        """
        Check if all Final Jeopardy answers have been judged.
        If so, automatically complete the game.
        """
        from django.utils import timezone

        # Get all participants
        participants = await self.get_participants()
        total_players = len(participants)

        if total_players == 0:
            return  # No players, don't complete

        # Get all judged results
        judged_results = await database_sync_to_async(self.engine.get_all_fj_judged)()
        judged_count = len(judged_results)

        print(f"[check_and_complete_game] {judged_count}/{total_players} players judged")

        # If all players have been judged, complete the game
        if judged_count >= total_players:
            print(f"[check_and_complete_game] All players judged - completing game")

            # Get final scores from Redis
            scores = await database_sync_to_async(self.engine.get_scores)()
            print(f"[check_and_complete_game] Final scores from Redis: {scores}")

            # Save scores to database
            await self.save_final_scores_to_db(scores)

            # Update game status to completed
            game = await database_sync_to_async(
                Game.objects.select_related('episode').get
            )(game_id=self.game_id)

            game.status = 'completed'
            game.ended_at = timezone.now()
            await database_sync_to_async(game.save)()

            # Broadcast game completed
            # Convert integer keys to strings for MessagePack compatibility
            final_scores = {str(k): v for k, v in scores.items()}

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'game_completed',
                    'final_scores': final_scores
                }
            )

            print(f"[check_and_complete_game] Game marked as completed")

    @database_sync_to_async
    def update_participant_score(self, player_number, score):
        """
        Update a single participant's score in the database.

        Args:
            player_number: Player number (1, 2, 3, etc.)
            score: New score value
        """
        try:
            participant = GameParticipant.objects.get(
                game__game_id=self.game_id,
                player_number=player_number
            )
            participant.score = score
            participant.save()
            print(f"[update_participant_score] Updated player {player_number} score to {score} in database")
        except GameParticipant.DoesNotExist:
            print(f"[update_participant_score] WARNING: No participant found for player {player_number}")

    @database_sync_to_async
    def save_final_scores_to_db(self, scores):
        """
        Save final scores from Redis to GameParticipant records in database.
        Args:
            scores: dict mapping player_number (int) to score (int)
        """
        print(f"[save_final_scores_to_db] Saving scores to database: {scores}")

        for player_number, score in scores.items():
            try:
                participant = GameParticipant.objects.get(
                    game__game_id=self.game_id,
                    player_number=player_number
                )
                participant.score = score
                participant.save()
                print(f"[save_final_scores_to_db] Updated player {player_number} score to {score}")
            except GameParticipant.DoesNotExist:
                print(f"[save_final_scores_to_db] WARNING: No participant found for player {player_number}")

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
    def get_participants(self):
        """Get all participants for this game."""
        participants = GameParticipant.objects.filter(
            game__game_id=self.game_id
        ).select_related('player').order_by('player_number')

        return [
            {
                'player_number': p.player_number,
                'player_name': p.player.display_name
            }
            for p in participants
        ]

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
    def select_daily_doubles(self, episode_id):
        """
        Select Daily Doubles for the episode.
        - Single Jeopardy: 1 Daily Double
        - Double Jeopardy: 2 Daily Doubles in different categories

        Returns:
            List of clue IDs that are Daily Doubles
        """
        from .models import Clue, Category
        import random

        daily_doubles = []

        # Select 1 DD for Single Jeopardy
        single_clues = list(Clue.objects.filter(
            category__episode_id=episode_id,
            category__round_type='single'
        ).select_related('category'))

        if single_clues:
            single_dd = random.choice(single_clues)
            daily_doubles.append(single_dd.id)
            print(f"[select_daily_doubles] Single Jeopardy DD: Clue {single_dd.id} in category {single_dd.category.name}")

        # Select 2 DDs for Double Jeopardy (in different categories)
        double_categories = list(Category.objects.filter(
            episode_id=episode_id,
            round_type='double'
        ))

        if len(double_categories) >= 2:
            # Randomly select 2 different categories
            selected_categories = random.sample(double_categories, 2)

            for cat in selected_categories:
                # Get clues from this category
                cat_clues = list(Clue.objects.filter(category=cat))
                if cat_clues:
                    dd_clue = random.choice(cat_clues)
                    daily_doubles.append(dd_clue.id)
                    print(f"[select_daily_doubles] Double Jeopardy DD: Clue {dd_clue.id} in category {cat.name}")

        print(f"[select_daily_doubles] Selected {len(daily_doubles)} Daily Doubles: {daily_doubles}")
        return daily_doubles

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

    @database_sync_to_async
    def get_final_jeopardy_data(self, episode_id):
        """Get Final Jeopardy category and clue."""
        from .models import Category, Clue
        try:
            # Get the Final Jeopardy category for this episode
            category = Category.objects.filter(
                episode_id=episode_id,
                round_type='final'
            ).first()

            if not category:
                return None

            # Get the FJ clue
            clue = Clue.objects.filter(category=category).first()

            if not clue:
                return None

            return {
                'category': category.name,
                'clue_id': clue.id,
                'question': clue.question,
                'answer': clue.answer
            }
        except Exception as e:
            print(f"[get_final_jeopardy_data] Error: {e}")
            return None




































