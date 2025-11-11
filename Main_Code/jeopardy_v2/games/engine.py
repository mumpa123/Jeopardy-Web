import time
import json
from typing import Optional, Dict, List
from redis import Redis
from django.conf import settings

class GameStateManager:
    """
    Manages game state in Redis with PostgreSQL persistence.

    Handls:
    - Current game state (round, clue, score)
    - Buzzer logic with atomic operations
    - State synchronization
    """

    def __init__(self, game_id: str):
        """
        Initialize manager for a specific game.

        Args:
        game_id: UUID of the game
        """
        self.game_id = str(game_id)

        # Connect to Redis
        self.redis = Redis(
                host='127.0.0.1',
                port=6379,
                db=0,
                decode_responses=True  # Automatically decode bytes to strings
        )

        # Redis key patterns 
        self.state_key = f"game:{self.game_id}:state"
        self.buzzer_key = f"game:{self.game_id}:buzzer"
        self.scores_key = f"game:{self.game_id}:scores"

    def initialize_game(self, episode_id: int, player_numbers: List[int]) -> Dict:
        """
        Initialize game state in Redis when game starts.

        Args:
            episode_id: ID of the episode being played
            player_numbers: List of player numbers [1, 2, 3]

        Returns
            Initial game state dict
        """
        initial_state = {
                'episode_id': str(episode_id),
                'status': 'active',
                'current_round': 'single',
                'current_clue': '',  # Empty string instead of None
                'revealed_clues': json.dumps([]),  # JSON serialize lists
                'daily_doubles': json.dumps([]), # JSON serialize lists
        }

        # Store state
        self.redis.hset(self.state_key, mapping=initial_state) 

        # Initialize scores
        for player_num in player_numbers:
            self.redis.hset(self.scores_key, player_num, 0)

        # Set expiry (24 hours - games shouldn't last longer!)
        self.redis.expire(self.state_key, 86400)
        self.redis.expire(self.scores_key, 86400)

        return initial_state

    def get_state(self) -> Dict:
        """
        Get current game state from Redis.

        Returns:
            Dict with game state, or empty dict if not found
        """
        state = self.redis.hgetall(self.state_key)

        if not state:
            return {}

        # Parse JSON fields
        if 'revealed_clues' in state:
            state['revealed_clues'] = json.loads(state['revealed_clues'])
        if 'daily_doubles' in state:
            state['daily_doubles'] = json.loads(state['daily_doubles'])

        # Convert empty string back to None for current_clue
        if 'current_clue' in state and state['current_clue'] == '':
            state['current_clue'] = None

        return state

    def update_state(self, updates: Dict) -> None:
        """
        Update game state atomically.

        Args:
            updates: Dict of field -> value to update
        """
        # Serialize list/dict fields to JSON and convert None to empty string
        processed_updates = {}
        for key, value in updates.items():
            if value is None:
                processed_updates[key] = ''
            elif isinstance(value, (list, dict)):
                processed_updates[key] = json.dumps(value)
            else:
                processed_updates[key] = str(value)

        self.redis.hset(self.state_key, mapping=processed_updates)


    def get_scores(self) -> Dict[int, int]:
        """
        Get all player scores.

        Returns:
            Dict of player_number -> score
        """
        scores = self.redis.hgetall(self.scores_key)
        return {int(k): int(v) for k, v in scores.items()}

    def update_score(self, player_number: int, delta: int) -> int:
        """
        Update a player's score.

        Args:
            player_number: Which player (1, 2, or 3)
            delta: Amount to add (positive) or subtract (negative)

        Returns:
            New score
        """
        new_score = self.redis.hincrby(self.scores_key, player_number, delta)
        return int(new_score)


    def set_score(self, player_number: int, score: int) -> None:
        """
        Set a player's score to a specific value.

        Args:
            player_number: Which player (1, 2, or 3)
            score: New score value
        """
        self.redis.hset(self.scores_key, player_number, score)

    def reset_buzzer(self) -> None:
        """
        Reset buzzer state for next clue.
        Clears all buzz data.
        """
        self.redis.delete(self.buzzer_key)
        self.redis.delete(f"{self.buzzer_key}:order")

    def handle_buzz(self, player_number: int, client_timestamp: int) -> Dict:
        """
        Handle a player buzzing in with atomic Redis operation.

        This is the critical part that prevents race conditions!
        Uses a Lua script to ensure atomicity.

        Args:
            player_number: Which player buzzed (1, 2, or 3)
            client_timestamp: When client thinks they buzzed (milliseconds)

        Returns:
            Dict with:
                - accepted: bool (was buzz accepted?)
                - position: int (order of buzz, 1st, 2nd, etc.)
                - winner: int or None (player_number of winner)
                - server_timestamp_us: int (servertimestamp in microseconds)
        """
        # Get precise server timestamp
        server_timestamp_us = int(time.time() * 1_000_000)

        # Lua script for atomic buzz handling
        # This entire script runs as one atomic operation!
        lua_script = """
        local buzzer_key = KEYS[1]
        local player = ARGV[1]
        local timestamp = ARGV[2]

        -- Check if this player already buzzed
        local already_buzzed = redis.call('HEXISTS', buzzer_key, 'player:' .. player)
        if already_buzzed == 1 then
            return {0, -1, -1}  -- Not accepted, already buzzed
        end

        -- Increment buzz count
        local count = redis.call('HINCRBY', buzzer_key, 'count', 1)

        -- Record this player's buzz
        redis.call('HSET', buzzer_key, 'player:' .. player, timestamp)
        redis.call('RPUSH', buzzer_key .. ':order', player)

        -- If first buzz, lock buzzer and set winner
        if count == 1 then
            redis.call('HSET', buzzer_key, 'locked', '1')
            redis.call('HSET', buzzer_key, 'winner', player)
            redis.call('HSET', buzzer_key, 'winner_timestamp', timestamp)
            return {1, count, tonumber(player)}  -- Accepted, first you're the winner!
        end


        -- Not first, but buzz recorded
        local winner = redis.call('HGET', buzzer_key, 'winner')
        return {1, count, tonumber(winner)} -- Accepted, but not winner
        """

        # Execute Lua script
        result = self.redis.eval(
                lua_script,
                1,  # Number of keys
                self.buzzer_key,  # KEYS[1]
                player_number,    # ARGV[1]
                server_timestamp_us  # ARGV[2]
        )

        return {
                'accepted': bool(result[0]),
                'position': result[1],
                'winner': result[2] if result[2] > 0 else None,
                'server_timestamp_us': server_timestamp_us
        }

    def get_buzzer_state(self) -> Dict:
        """
        Get current buzzer state.

        Returns:
            Dict with:
                - locked: bool
                - winner: int or None
                - buzz_count: int
                - buzz_order: List[int]
        """
        state = self.redis.hgetall(self.buzzer_key)
        order = self.redis.lrange(f"{self.buzzer_key}:order", 0, -1)

        return {
                'locked': state.get('locked') == '1',
                'winner': int(state['winner']) if 'winner' in state else None,
                'buzz_count': int(state.get('count', 0)),
                'buzz_order': [int(p) for p in order]
        }

    def reveal_clue(self, clue_id: int) -> None:
        """
        Mark a clue as revealed.

        Args:
            clue_id: ID of the clue being revealed
        """
        state = self.get_state()
        revealed = state.get('revealed_clues', [])

        if clue_id not in revealed:
            revealed.append(clue_id)
            self.update_state({
                'current_clue': clue_id,
                'revealed_clues': revealed
            })


        # Reset buzzer for new clue
        self.reset_buzzer()

    def cleanup(self) -> None:
        """
        Clean up game state from Redis.
        Call this when game ends.
        """
        self.redis.delete(self.state_key)
        self.redis.delete(self.buzzer_key)
        self.redis.delete(f"{self.buzzer_key}:order")
        self.redis.delete(self.scores_key)








