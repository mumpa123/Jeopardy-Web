/**
 * Utility functions for formatting data
 */

/**
 * Format currency value
 * Example: 200 → "$200"
 */
export function formatCurrency(value: number): string {
  return `$${value.toLocaleString()}`;
}

/**
 * Format episode display
 * Example: season=1, episode=5 → "S1E5"
 */
export function formatEpisodeDisplay(season: number, episode: number): string {
  return `S${season}E${episode}`;
}

/**
 * Format date
 * Example: "2024-01-15" → "January 15, 2024"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Calculate position from category/clue indices
 * Example: category=2, clue=3 → 13 (third clue in third category)
 */
export function calculateCluePosition(categoryIndex: number, clueIndex: number): number {
  return categoryIndex * 5 + clueIndex;
}

/**
 * Get category index from clue position
 * Example: position=13 → category=2
 */
export function getCategoryFromPosition(position: number): number {
  return Math.floor(position / 5);
}

/**
 * Get clue value from position
 * Example: position=0 → $200 (first row)
 *          position=4 → $1000 (last row of single jeopardy)
 */
export function getClueValue(position: number, round: 'single' | 'double'): number {
  const row = position % 5;
  const baseValue = round === 'single' ? 200 : 400;
  return baseValue * (row + 1);
}

/**
 * Get player color for UI
 */
export function getPlayerColor(playerNumber: number): string {
  const colors = {
    1: '#3498db',  // Blue
    2: '#e74c3c',  // Red
    3: '#f39c12',  // Orange
  };
  return colors[playerNumber as keyof typeof colors] || '#95a5a6';
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
