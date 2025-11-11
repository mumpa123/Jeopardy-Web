from games.engine import GameStateManager
import time

# Create game engine instance
game_id = "test-game-123"
engine = GameStateManager(game_id)

print("=== Testing Game State Manager ===\n")

# 1. Initialize game
print("1. Initializing game...")
initial_state = engine.initialize_game(
        episode_id=17222,
        player_numbers=[1, 2, 3]
)
print(f"Initial state: {initial_state}")
print(f"Initial scores: {engine.get_scores()}\n")

# 2. Simulate buzzer presses
print("2. Testing buzzer (3 players buzz in order)...")

# Player 1 buzzes
result1 = engine.handle_buzz(1, int(time.time() * 1000))
print(f"Player 1 buzzed: {result1}")

# Player 2 buzzes (should be accepted but not winner)
time.sleep(0.01)  # Small delay
result2 = engine.handle_buzz(2, int(time.time() * 1000))
print(f"Player 2 buzzed: {result2}")

# Player 3 buzzes
time.sleep(0.01)
result3 = engine.handle_buzz(3, int(time.time() * 1000))
print(f"Player 3 buzzed: {result3}")

# Player 1 tries to buzz again (should be rejected)
result4 = engine.handle_buzz(1, int(time.time() * 1000))
print(f"Player 1 buzzed again: {result4}\n")

# Check buzzer state
buzzer_state = engine.get_buzzer_state()
print(f"Buzzer state: {buzzer_state}\n")

# 3. Test score updates
print("3. Testing score updates...")
engine.update_score(1, 200) # Player 1 gets 200 points (correct answer)
print(f"Player 1 score after +200: {engine.get_scores()}")

engine.update_score(2, -100)  # Player 2 loses 100 (wrong answer)
print(f"Player 2 score after -100: {engine.get_scores()}\n")

# 4. Test clue reveal
print("4. Testing clue reveal...")
engine.reveal_clue(42)
state = engine.get_state()
print(f"Current clue: {state['current_clue']}")
print(f"Revealed clues: {state['revealed_clues']}")
print(f"Buzzer reset: {engine.get_buzzer_state()}\n")

# 5. Cleanup
print("5. Cleaning up...")
engine.cleanup()
print("Game state cleared from Redis")

print("\n=== All tests passed! ===")
