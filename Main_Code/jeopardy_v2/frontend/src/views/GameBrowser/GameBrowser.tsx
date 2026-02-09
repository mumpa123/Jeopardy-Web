import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../components/Header/Header';
import { GameCard } from '../../components/GameBrowser/GameCard';
import { GameFilters } from '../../components/GameBrowser/GameFilters';
import { api } from '../../services/api';
import type { Game } from '../../types/Game';
import './GameBrowser.css';

export function GameBrowser() {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch games from API
  const fetchGames = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('[GameBrowser] Fetching games with filter:', statusFilter || 'none');

      const filters = statusFilter ? { status: statusFilter, ordering: '-created_at' } : { ordering: '-created_at' };
      const fetchedGames = await api.games.list(filters);

      console.log('[GameBrowser] Fetched games:', fetchedGames);
      setGames(fetchedGames);
      setFilteredGames(fetchedGames);
    } catch (err) {
      console.error('[GameBrowser] Error fetching games:', err);
      setError(err instanceof Error ? err.message : 'Failed to load games');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount
  useEffect(() => {
    fetchGames();
  }, [statusFilter]); // Re-fetch when status filter changes

  // Handle status filter change
  const handleStatusChange = (newStatus: string) => {
    console.log('[GameBrowser] Status filter changed to:', newStatus || 'All');
    setStatusFilter(newStatus);
  };

  // Handle manual refresh
  const handleRefresh = () => {
    console.log('[GameBrowser] Manual refresh triggered');
    fetchGames();
  };

  return (
    <div className="game-browser">
      <Header
        title="Browse Games"
        subtitle="Find and join active Jeopardy games"
      />

      <div className="game-browser-content">
        {/* Navigation Buttons */}
        <div className="navigation-buttons">
          <button
            className="nav-btn nav-btn-secondary"
            onClick={() => navigate('/lobby')}
          >
            ← Create New Game
          </button>
          <button
            className="nav-btn nav-btn-secondary"
            onClick={() => navigate('/')}
          >
            🏠 Home
          </button>
        </div>

        {/* Filters */}
        <GameFilters
          currentStatus={statusFilter}
          onStatusChange={handleStatusChange}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />

        {/* Game List */}
        {isLoading && games.length === 0 ? (
          <div className="loading-state">
            <div className="loading-spinner-large">⟳</div>
            <p>Loading games...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">⚠️</div>
            <h3>Error Loading Games</h3>
            <p>{error}</p>
            <button className="retry-button" onClick={handleRefresh}>
              Try Again
            </button>
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎮</div>
            <h3>No Games Found</h3>
            <p>
              {statusFilter
                ? `No ${statusFilter} games available.`
                : 'No games have been created yet.'}
            </p>
            <button
              className="create-game-button"
              onClick={() => navigate('/lobby')}
            >
              Create New Game
            </button>
          </div>
        ) : (
          <>
            <div className="games-count">
              <span className="count-number">{filteredGames.length}</span>{' '}
              {filteredGames.length === 1 ? 'game' : 'games'} found
            </div>
            <div className="games-grid">
              {filteredGames.map((game) => (
                <GameCard key={game.game_id} game={game} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
