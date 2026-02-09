import './GameFilters.css';

interface GameFiltersProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function GameFilters({
  currentStatus,
  onStatusChange,
  onRefresh,
  isLoading
}: GameFiltersProps) {
  return (
    <div className="game-filters">
      <div className="filter-group">
        <label htmlFor="status-filter" className="filter-label">
          Filter by Status:
        </label>
        <select
          id="status-filter"
          className="filter-select"
          value={currentStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          disabled={isLoading}
        >
          <option value="">All Games</option>
          <option value="waiting">Waiting for Players</option>
          <option value="active">Active Games</option>
          <option value="completed">Completed Games</option>
          <option value="paused">Paused Games</option>
          <option value="abandoned">Abandoned Games</option>
        </select>
      </div>

      <button
        className="refresh-button"
        onClick={onRefresh}
        disabled={isLoading}
        title="Refresh game list"
      >
        {isLoading ? (
          <span className="loading-spinner">⟳</span>
        ) : (
          <span>🔄</span>
        )}
        <span className="refresh-text">Refresh</span>
      </button>
    </div>
  );
}
