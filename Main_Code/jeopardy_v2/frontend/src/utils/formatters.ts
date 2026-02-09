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
    4: '#9b59b6',  // Purple
    5: '#2ecc71',  // Green
    6: '#e91e63',  // Pink
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

/**
 * Clean HTML tags from clue/category text and replace broken media with placeholders
 * Preserves text content and basic formatting (bold, italic, etc.)
 */
export function cleanClueText(text: string): string {
  if (!text) return text;

  let cleaned = text;

  // Replace standalone image/video/audio tags with placeholders
  cleaned = cleaned.replace(/<img[^>]*>/gi, ' [missing image] ');
  cleaned = cleaned.replace(/<video[^>]*>.*?<\/video>/gi, ' [missing video] ');
  cleaned = cleaned.replace(/<audio[^>]*>.*?<\/audio>/gi, ' [missing audio] ');

  // For links to media files, extract the link text and add a placeholder
  // Pattern: <a href="...image.jpg">Link Text</a> -> Link Text [missing image]
  cleaned = cleaned.replace(/<a[^>]*href[^>]*\.(jpg|jpeg|png|gif|bmp|svg|webp)[^>]*>(.*?)<\/a>/gi, (match, ext, linkText) => {
    return linkText ? `${linkText} [missing image]` : '[missing image]';
  });

  cleaned = cleaned.replace(/<a[^>]*href[^>]*\.(mp4|webm|avi|mov|wmv|flv)[^>]*>(.*?)<\/a>/gi, (match, ext, linkText) => {
    return linkText ? `${linkText} [missing video]` : '[missing video]';
  });

  cleaned = cleaned.replace(/<a[^>]*href[^>]*\.(mp3|wav|ogg|m4a)[^>]*>(.*?)<\/a>/gi, (match, ext, linkText) => {
    return linkText ? `${linkText} [missing audio]` : '[missing audio]';
  });

  // Remove any remaining anchor tags but keep their text content
  cleaned = cleaned.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1');

  // Keep basic formatting tags (bold, italic, underline, em, strong)
  // These will be preserved as HTML
  // Remove all other HTML tags except formatting ones
  cleaned = cleaned.replace(/<(?!\/?(?:b|i|u|em|strong|br)\b)[^>]+>/gi, '');

  // Decode common HTML entities
  cleaned = cleaned.replace(/&nbsp;/g, ' ');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&apos;/g, "'");

  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}
