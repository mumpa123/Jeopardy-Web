import time
import json
import random
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
        self.current_player_key = f"game:{self.game_id}:current_player"
        self.dd_state_key = f"game:{self.game_id}:dd_state"
        self.fj_state_key = f"game:{self.game_id}:fj_state"
        self.cooldown_key = f"game:{self.game_id}:buzz_cooldowns"
        self.attempted_players_key = f"game:{self.game_id}:attempted_players"

        # Buzz cooldown duration in seconds
        self.BUZZ_COOLDOWN_SECONDS = 2

    def initialize_game(self, episode_id: int, player_numbers: List[int], daily_doubles: List[int] = None) -> Dict:
        """
        Initialize game state in Redis when game starts.

        Args:
            episode_id: ID of the episode being played
            player_numbers: List of player numbers [1, 2, 3]
            daily_doubles: List of clue IDs that are Daily Doubles

        Returns
            Initial game state dict
        """
        initial_state = {
                'episode_id': str(episode_id),
                'status': 'active',
                'current_round': 'single',
                'current_clue': '',  # Empty string instead of None
                'revealed_clues': json.dumps([]),  # JSON serialize lists
                'daily_doubles': json.dumps(daily_doubles or []), # JSON serialize lists
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
        Clears all buzz data and attempted players.
        """
        self.redis.delete(self.buzzer_key)
        self.redis.delete(f"{self.buzzer_key}:order")
        self.redis.delete(self.attempted_players_key)

    def reset_game(self) -> Dict:
        """
        Reset the entire game state.
        Clears all scores, revealed clues, and resets round to single.
        Used when host clicks "Reset Game".

        Returns:
            Dict with reset scores
        """
        # Reset game state
        reset_state = {
            'current_round': 'single',
            'current_clue': '',
            'revealed_clues': json.dumps([]),
        }
        self.redis.hset(self.state_key, mapping=reset_state)

        # Reset all scores to 0
        scores = self.get_scores()
        for player_number in scores.keys():
            self.redis.hset(self.scores_key, player_number, 0)

        # Reset buzzer
        self.reset_buzzer()

        # Clear DD state and current player
        self.clear_dd_state()
        self.redis.delete(self.current_player_key)

        # Return reset scores
        return {player_num: 0 for player_num in scores.keys()}

    def lock_buzzer(self) -> None:
        """
        Lock the buzzer so players cannot buzz.
        Used when clue is first revealed before host finishes reading.
        """
        self.redis.hset(self.buzzer_key, 'locked', 'true')

    def unlock_buzzer(self) -> int:
        """
        Unlock the buzzer so players can buzz.
        Used when host clicks "Finished Reading".

        Returns:
            unlock_token: A unique token for this unlock event
        """
        # Generate a unique unlock token (microsecond timestamp)
        unlock_token = int(time.time() * 1_000_000)
        self.redis.hset(self.buzzer_key, 'locked', 'false')
        self.redis.hset(self.buzzer_key, 'unlock_token', str(unlock_token))
        return unlock_token

    def handle_buzz(self, player_number: int, client_timestamp: int, unlock_token: int = None) -> Dict:
        """
        Handle a player buzzing in with atomic Redis operation.

        This is the critical part that prevents race conditions!
        Uses a Lua script to ensure atomicity.

        Args:
            player_number: Which player buzzed (1, 2, or 3)
            client_timestamp: When client thinks they buzzed (milliseconds)
            unlock_token: The unlock token received by client (prevents race conditions)

        Returns:
            Dict with:
                - accepted: bool (was buzz accepted?)
                - position: int (order of buzz, 1st, 2nd, etc.)
                - winner: int or None (player_number of winner)
                - server_timestamp_us: int (servertimestamp in microseconds)
                - cooldown: bool (was buzz rejected due to cooldown?)
                - cooldown_remaining: float (seconds remaining in cooldown, if applicable)
        """
        # Get precise server timestamp
        server_timestamp_us = int(time.time() * 1_000_000)
        current_time_seconds = time.time()

        # Lua script for atomic buzz handling with token-based validation
        # This entire script runs as one atomic operation!
        lua_script = """
        local buzzer_key = KEYS[1]
        local cooldown_key = KEYS[2]
        local attempted_key = KEYS[3]
        local player = ARGV[1]
        local timestamp = ARGV[2]
        local current_time = tonumber(ARGV[3])
        local cooldown_duration = tonumber(ARGV[4])
        local client_unlock_token = ARGV[5]  -- Token client received from unlock broadcast

        -- Check if player has already attempted this clue
        local already_attempted = redis.call('SISMEMBER', attempted_key, player)
        if already_attempted == 1 then
            return {0, -3, -1, 0}  -- Not accepted, already attempted this clue
        end

        -- Check if player is in cooldown
        local last_buzz_time = redis.call('HGET', cooldown_key, player)
        if last_buzz_time then
            local time_since_last_buzz = current_time - tonumber(last_buzz_time)
            if time_since_last_buzz < cooldown_duration then
                local remaining = cooldown_duration - time_since_last_buzz
                return {0, -2, -1, remaining}  -- Not accepted, in cooldown, remaining time
            end
        end

        -- Check if buzzer is locked (host hasn't finished reading)
        local locked = redis.call('HGET', buzzer_key, 'locked')
        if locked == 'true' then
            -- Start cooldown even for early buzz attempts
            redis.call('HSET', cooldown_key, player, current_time)
            redis.call('EXPIRE', cooldown_key, 86400)  -- 24 hour expiry
            return {0, -1, -1, cooldown_duration}  -- Not accepted, buzzer is locked, start cooldown
        end

        -- Validate unlock token (prevents race conditions)
        -- Client must provide the unlock token they received from the buzzer_enabled broadcast
        local server_unlock_token = redis.call('HGET', buzzer_key, 'unlock_token')

        -- If no unlock token exists yet, accept buzz (backward compatibility for first unlock)
        if server_unlock_token then
            -- Client must have provided a token
            if not client_unlock_token or client_unlock_token == '' or client_unlock_token == 'nil' then
                -- Buzz sent before client received unlock broadcast - reject with cooldown
                redis.call('HSET', cooldown_key, player, current_time)
                redis.call('EXPIRE', cooldown_key, 86400)
                return {0, -1, -1, cooldown_duration}  -- Not accepted, no valid unlock token
            end

            -- Tokens must match
            if client_unlock_token ~= server_unlock_token then
                -- Stale buzz from previous unlock event - reject with cooldown
                redis.call('HSET', cooldown_key, player, current_time)
                redis.call('EXPIRE', cooldown_key, 86400)
                return {0, -1, -1, cooldown_duration}  -- Not accepted, token mismatch
            end
        end

        -- Check if this player already buzzed
        local already_buzzed = redis.call('HEXISTS', buzzer_key, 'player:' .. player)
        if already_buzzed == 1 then
            return {0, -1, -1, 0}  -- Not accepted, already buzzed
        end

        -- Increment buzz count
        local count = redis.call('HINCRBY', buzzer_key, 'count', 1)

        -- Record this player's buzz
        redis.call('HSET', buzzer_key, 'player:' .. player, timestamp)
        redis.call('RPUSH', buzzer_key .. ':order', player)

        -- Update cooldown timestamp
        redis.call('HSET', cooldown_key, player, current_time)
        redis.call('EXPIRE', cooldown_key, 86400)  -- 24 hour expiry

        -- If first buzz, lock buzzer and set winner
        if count == 1 then
            redis.call('HSET', buzzer_key, 'locked', '1')
            redis.call('HSET', buzzer_key, 'winner', player)
            redis.call('HSET', buzzer_key, 'winner_timestamp', timestamp)
            return {1, count, tonumber(player), 0}  -- Accepted, first you're the winner!
        end

        -- Not first, but buzz recorded
        local winner = redis.call('HGET', buzzer_key, 'winner')
        return {1, count, tonumber(winner), 0} -- Accepted, but not winner
        """

        # Execute Lua script
        result = self.redis.eval(
                lua_script,
                3,  # Number of keys
                self.buzzer_key,  # KEYS[1]
                self.cooldown_key,  # KEYS[2]
                self.attempted_players_key,  # KEYS[3]
                player_number,    # ARGV[1]
                server_timestamp_us,  # ARGV[2]
                current_time_seconds,  # ARGV[3]
                self.BUZZ_COOLDOWN_SECONDS,  # ARGV[4]
                str(unlock_token) if unlock_token else ''  # ARGV[5]
        )

        # Determine if this was a cooldown rejection or early buzz
        is_cooldown_rejection = result[1] == -2
        is_early_buzz = result[1] == -1 and result[3] > 0  # Locked buzzer with cooldown started

        return {
                'accepted': bool(result[0]),
                'position': result[1],
                'winner': result[2] if result[2] > 0 else None,
                'server_timestamp_us': server_timestamp_us,
                'cooldown': is_cooldown_rejection or is_early_buzz,
                'cooldown_remaining': float(result[3]) if result[3] > 0 else 0.0
        }

    def mark_player_attempted(self, player_number: int) -> None:
        """
        Mark a player as having attempted the current clue.
        This prevents them from buzzing again on the same clue.

        Args:
            player_number: Which player attempted (1, 2, or 3)
        """
        self.redis.sadd(self.attempted_players_key, player_number)
        self.redis.expire(self.attempted_players_key, 86400)  # 24 hour expiry

    def clear_buzzer_for_retry(self) -> None:
        """
        Clear buzzer state for re-buzzing after incorrect answer.
        This clears buzz data but KEEPS the attempted players list.
        """
        self.redis.delete(self.buzzer_key)
        self.redis.delete(f"{self.buzzer_key}:order")
        # Note: We do NOT delete attempted_players_key - that persists for the clue

    def get_attempted_players(self) -> List[int]:
        """
        Get list of players who have attempted the current clue.

        Returns:
            List of player numbers who have attempted
        """
        attempted = self.redis.smembers(self.attempted_players_key)
        return [int(p) for p in attempted]

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

    # ===== Daily Double Methods =====

    def set_daily_doubles(self, clue_ids: List[int]) -> None:
        """
        Set the daily double clue IDs for this game.

        Args:
            clue_ids: List of clue IDs that are daily doubles
        """
        self.update_state({'daily_doubles': clue_ids})
        # Set expiry
        self.redis.expire(self.state_key, 86400)

    def get_daily_doubles(self) -> List[int]:
        """
        Get the daily double clue IDs for this game.

        Returns:
            List of clue IDs that are daily doubles
        """
        state = self.get_state()
        return state.get('daily_doubles', [])

    def set_current_player(self, player_number: int) -> None:
        """
        Set the current player in control (for Daily Doubles).
        This is the player who answered the last clue correctly.

        Args:
            player_number: Player number (1, 2, 3, etc.)
        """
        self.redis.set(self.current_player_key, player_number)
        self.redis.expire(self.current_player_key, 86400)

    def get_current_player(self) -> Optional[int]:
        """
        Get the current player in control.

        Returns:
            Player number or None if not set
        """
        player = self.redis.get(self.current_player_key)
        return int(player) if player else None

    def set_dd_state(self, state_dict: Dict) -> None:
        """
        Set Daily Double state (wager, stage, player).

        Args:
            state_dict: Dict with DD state fields
                - wager: int (wager amount)
                - stage: str (detected, revealed, wagering, answering, judged)
                - player_number: int
                - answer: str (optional, submitted answer)
        """
        # Convert all values to strings for Redis
        processed = {k: str(v) for k, v in state_dict.items()}
        self.redis.hset(self.dd_state_key, mapping=processed)
        self.redis.expire(self.dd_state_key, 86400)

    def get_dd_state(self) -> Dict:
        """
        Get Daily Double state.

        Returns:
            Dict with DD state fields (empty if no DD active)
        """
        state = self.redis.hgetall(self.dd_state_key)
        if not state:
            return {}

        # Convert numeric fields back to int
        result = {}
        for key, value in state.items():
            if key in ['wager', 'player_number']:
                result[key] = int(value)
            else:
                result[key] = value
        return result

    def clear_dd_state(self) -> None:
        """
        Clear Daily Double state after DD is completed.
        """
        self.redis.delete(self.dd_state_key)

    def validate_dd_wager(self, player_number: int, wager: int, round_type: str, score: int) -> Dict:
        """
        Validate a Daily Double wager.

        Args:
            player_number: Player making the wager
            wager: Wager amount
            round_type: 'single' or 'double'
            score: Player's current score

        Returns:
            Dict with:
                - valid: bool
                - error: str (if invalid)
                - min_wager: int
                - max_wager: int
        """
        min_wager = 5
        max_clue_value = 1000 if round_type == 'single' else 2000

        # Max wager is either the max clue value or current score, whichever is higher
        # Even with $0 or negative score, player can wager up to max clue value
        max_wager = max(max_clue_value, score) if score > 0 else max_clue_value

        if wager < min_wager:
            return {
                'valid': False,
                'error': f'Wager must be at least ${min_wager}',
                'min_wager': min_wager,
                'max_wager': max_wager
            }

        if wager > max_wager:
            return {
                'valid': False,
                'error': f'Wager cannot exceed ${max_wager}',
                'min_wager': min_wager,
                'max_wager': max_wager
            }

        return {
            'valid': True,
            'min_wager': min_wager,
            'max_wager': max_wager
        }

    # Final Jeopardy state management

    def set_fj_state(self, state: Dict) -> None:
        """Set Final Jeopardy state."""
        self.redis.hset(self.fj_state_key, mapping={
            k: json.dumps(v) if isinstance(v, (dict, list)) else str(v)
            for k, v in state.items()
        })
        self.redis.expire(self.fj_state_key, 86400)  # 24 hour expiry

    def get_fj_state(self) -> Dict:
        """Get Final Jeopardy state."""
        state = self.redis.hgetall(self.fj_state_key)
        if not state:
            return {}
        # Parse JSON values
        parsed = {}
        for k, v in state.items():
            try:
                parsed[k] = json.loads(v)
            except (json.JSONDecodeError, TypeError):
                parsed[k] = v
        return parsed

    def set_fj_wager(self, player_number: int, wager: int) -> None:
        """Store player's Final Jeopardy wager."""
        key = f"{self.fj_state_key}:wagers"
        self.redis.hset(key, player_number, wager)
        self.redis.expire(key, 86400)

    def get_fj_wager(self, player_number: int) -> int:
        """Get player's Final Jeopardy wager."""
        key = f"{self.fj_state_key}:wagers"
        wager = self.redis.hget(key, player_number)
        return int(wager) if wager else 0

    def get_all_fj_wagers(self) -> Dict[int, int]:
        """Get all Final Jeopardy wagers."""
        key = f"{self.fj_state_key}:wagers"
        wagers = self.redis.hgetall(key)
        return {int(k): int(v) for k, v in wagers.items()}

    def set_fj_answer(self, player_number: int, answer: str) -> None:
        """Store player's Final Jeopardy answer."""
        key = f"{self.fj_state_key}:answers"
        self.redis.hset(key, player_number, answer)
        self.redis.expire(key, 86400)

    def get_fj_answer(self, player_number: int) -> str:
        """Get player's Final Jeopardy answer."""
        key = f"{self.fj_state_key}:answers"
        answer = self.redis.hget(key, player_number)
        return answer if answer else ""

    def get_all_fj_answers(self) -> Dict[int, str]:
        """Get all Final Jeopardy answers."""
        key = f"{self.fj_state_key}:answers"
        answers = self.redis.hgetall(key)
        return {int(k): v for k, v in answers.items()}

    def set_fj_judged(self, player_number: int, correct: bool) -> None:
        """Mark player's Final Jeopardy answer as judged."""
        key = f"{self.fj_state_key}:judged"
        self.redis.hset(key, player_number, '1' if correct else '0')
        self.redis.expire(key, 86400)

    def get_fj_judged(self, player_number: int) -> Optional[bool]:
        """Get whether player's answer has been judged and if correct."""
        key = f"{self.fj_state_key}:judged"
        result = self.redis.hget(key, player_number)
        if result is None:
            return None
        return result == '1'

    def get_all_fj_judged(self) -> Dict[int, bool]:
        """Get all judged results."""
        key = f"{self.fj_state_key}:judged"
        results = self.redis.hgetall(key)
        return {int(k): v == '1' for k, v in results.items()}

    def cleanup(self) -> None:
        """
        Clean up game state from Redis.
        Call this when game ends.
        """
        self.redis.delete(self.state_key)
        self.redis.delete(self.buzzer_key)
        self.redis.delete(f"{self.buzzer_key}:order")
        self.redis.delete(self.scores_key)
        self.redis.delete(self.current_player_key)
        self.redis.delete(self.dd_state_key)
        self.redis.delete(self.fj_state_key)
        self.redis.delete(f"{self.fj_state_key}:wagers")
        self.redis.delete(f"{self.fj_state_key}:answers")
        self.redis.delete(f"{self.fj_state_key}:judged")
        self.redis.delete(self.cooldown_key)
        self.redis.delete(self.attempted_players_key)








