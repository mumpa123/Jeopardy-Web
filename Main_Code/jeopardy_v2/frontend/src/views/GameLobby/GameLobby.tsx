import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { SeasonSelector } from '../../components/EpisodeBrowser/SeasonSelector';
import { EpisodeSelector } from '../../components/EpisodeBrowser/EpisodeSelector';
import { api } from '../../services/api';
import type { Game, Episode } from '../../types/Game';
import './GameLobby.css';

export function GameLobby() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdGame, setCreatedGame] = useState<Game | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [hostName, setHostName] = useState('');
  const [showSeasonSelector, setShowSeasonSelector] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);

  const handleCreateRandomGame = async () => {
    setLoading(true);
    setError(null);

    try {
      // Get a random episode
      const episode = await api.episodes.random();
      setSelectedEpisode(episode);

      // Create the game
      const game = await api.games.create({
        episode: episode.id,
        settings: {
          buzzer_window_ms: 5000,
          daily_double_wager_time_ms: 30000,
          final_jeopardy_wager_time_ms: 60000
        }
      });

      setCreatedGame(game);
    } catch (err) {
      console.error('Failed to create game:', err);
      setError('Failed to create game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShowSeasonSelector = () => {
    setShowSeasonSelector(true);
    setSelectedSeason(null);
  };

  const handleSelectSeason = (seasonNumber: number) => {
    setSelectedSeason(seasonNumber);
  };

  const handleBackToSeasons = () => {
    setSelectedSeason(null);
  };

  const handleSelectEpisode = async (episodeId: number) => {
    setLoading(true);
    setError(null);

    try {
      // Fetch the full episode data
      const episode = await api.episodes.get(episodeId);
      setSelectedEpisode(episode);

      // Create the game with selected episode
      const game = await api.games.create({
        episode: episodeId,
        settings: {
          buzzer_window_ms: 5000,
          daily_double_wager_time_ms: 30000,
          final_jeopardy_wager_time_ms: 60000
        }
      });

      setCreatedGame(game);
      setShowSeasonSelector(false);
      setSelectedSeason(null);
    } catch (err) {
      console.error('Failed to create game:', err);
      setError('Failed to create game. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinAsHost = () => {
    if (createdGame) {
      navigate(`/host/${createdGame.game_id}`);
    }
  };

  const handleJoinAsPlayer = (playerNumber: number) => {
    if (createdGame) {
      const playerName = prompt(`Enter your name for Player ${playerNumber}:`) || `Player${playerNumber}`;
      navigate(`/player/${createdGame.game_id}/${playerName}/${playerNumber}`);
    }
  };

  const handleOpenBoard = () => {
    if (createdGame) {
      navigate(`/board/${createdGame.game_id}`);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="game-lobby">
      <Header title="Game Lobby" subtitle="Create or join a Jeopardy game" />

      <div className="lobby-content">
        {!createdGame && !showSeasonSelector && (
          <div className="create-game-section">
            <h2>Create New Game</h2>

            <div className="create-options">
              <button
                className="create-button random"
                onClick={handleCreateRandomGame}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Quick Play (Random Episode)'}
              </button>

              <button
                className="create-button choose"
                onClick={handleShowSeasonSelector}
                disabled={loading}
              >
                Choose Specific Episode
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}
          </div>
        )}

        {showSeasonSelector && !selectedSeason && (
          <SeasonSelector onSelectSeason={handleSelectSeason} />
        )}

        {showSeasonSelector && selectedSeason && (
          <EpisodeSelector
            seasonNumber={selectedSeason}
            onSelectEpisode={handleSelectEpisode}
            onBack={handleBackToSeasons}
          />
        )}

        {createdGame && (
          <div className="game-created">
            <h2>Game Created Successfully!</h2>

            <div className="game-info">
              <div className="info-row">
                <strong>Game ID:</strong>
                <code>{createdGame.game_id}</code>
                <button
                  className="copy-button"
                  onClick={() => copyToClipboard(createdGame.game_id)}
                >
                  Copy
                </button>
              </div>

              {selectedEpisode && (
                <div className="info-row">
                  <strong>Episode:</strong>
                  <span>Season {selectedEpisode.season_number} - Episode {selectedEpisode.episode_number}</span>
                </div>
              )}

              <div className="info-row">
                <strong>Status:</strong>
                <span className="status-badge">{createdGame.status}</span>
              </div>
            </div>

            <div className="join-section">
              <h3>Join the Game</h3>

              <div className="join-buttons">
                <button
                  className="join-button host"
                  onClick={handleJoinAsHost}
                >
                  Join as Host
                </button>

                <button
                  className="join-button player"
                  onClick={() => handleJoinAsPlayer(1)}
                >
                  Join as Player 1
                </button>

                <button
                  className="join-button player"
                  onClick={() => handleJoinAsPlayer(2)}
                >
                  Join as Player 2
                </button>

                <button
                  className="join-button player"
                  onClick={() => handleJoinAsPlayer(3)}
                >
                  Join as Player 3
                </button>

                <button
                  className="join-button board"
                  onClick={handleOpenBoard}
                >
                  Open Board View
                </button>
              </div>
            </div>

            <div className="share-section">
              <h3>Share with Others</h3>
              <p>Share these links with other players:</p>

              <div className="share-links">
                <div className="share-link">
                  <strong>Host:</strong>
                  <input
                    type="text"
                    value={`${window.location.origin}/host/${createdGame.game_id}`}
                    readOnly
                  />
                  <button onClick={() => copyToClipboard(`${window.location.origin}/host/${createdGame.game_id}`)}>
                    Copy
                  </button>
                </div>

                <div className="share-link">
                  <strong>Player:</strong>
                  <input
                    type="text"
                    value={`${window.location.origin}/player/${createdGame.game_id}/PlayerName/1`}
                    readOnly
                  />
                  <button onClick={() => copyToClipboard(`${window.location.origin}/player/${createdGame.game_id}/PlayerName/1`)}>
                    Copy
                  </button>
                </div>

                <div className="share-link">
                  <strong>Board:</strong>
                  <input
                    type="text"
                    value={`${window.location.origin}/board/${createdGame.game_id}`}
                    readOnly
                  />
                  <button onClick={() => copyToClipboard(`${window.location.origin}/board/${createdGame.game_id}`)}>
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <button
              className="create-another-button"
              onClick={() => {
                setCreatedGame(null);
                setSelectedEpisode(null);
                setShowSeasonSelector(false);
                setSelectedSeason(null);
                setError(null);
              }}
            >
              Create Another Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
