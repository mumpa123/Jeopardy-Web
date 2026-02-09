
import requests
import json
import time

BASE_URL = 'http://127.0.0.1:8000/api'

print("=== Integration Test ===\n")

# 1. Get a random episode
print("1. Getting random episode...")
response = requests.get(f"{BASE_URL}/episodes/random/")
episode = response.json()
print(f"Episode: S{episode['season_number']}E{episode['episode_number']}")
print(f"Categories: {len(episode['categories'])}\n")

# 2. Create Host player
print("2. Creating host player...")
response = requests.post(f"{BASE_URL}/players/", json={
    "display_name": "Alex Trebek"
    })
host = response.json()
print(f"Host created: {host['display_name']} (ID: {host['id']})\n")

# 3. Create game
print("3. Creating game...")
response = requests.post(f"{BASE_URL}/games/", json={
    "episode": episode['id'],
    "host": host['id'],
    "settings": {}
})
game = response.json()
print(f"Game created: {game['game_id']}\n")

# 4. Create and join players
print("4. Adding players...")
players = []
for i, name in enumerate(["Ken", "Brad", "James"], 1):
    response = requests.post(
            f"{BASE_URL}/games/{game['game_id']}/join/",
            json={"display_name": name}
    )
    player = response.json()
    print(f"Player {i} joined: {name}")
    players.append(player)
print()

# 5. Start game
print("5. Starting game...")
response = requests.post(f"{BASE_URL}/games/{game['game_id']}/start/")
game = response.json()
print(f"Game status: {game['status']}\n")

# 6. Get game state
print("6. Getting game state...")
response = requests.get(f"{BASE_URL}/games/{game['game_id']}/state/")
state = response.json()
print(f"Participants: {len(state['participants'])}")
for p in state['participants']:
    print(f" - {p['player_name']} (Player {p['player_number']}): ${p['score']}")

print("\n=== Integration test complete! ===")
