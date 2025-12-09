export interface Clue {
  id: number;
  question: string;
  answer: string;
  value: number;
  position: number;
  is_daily_double: boolean;
}

export interface Category {
  id: number;
  name: string;
  round_type: 'single' | 'double' | 'final';
  position: number;
  clues: Clue[];
}

export interface Episode {
  id: number;
  season_number: number;
  episode_number: number;
  air_date: string;
  total_clues: number;
  categories: Category[];
}

export interface EpisodeListItem {
  id: number;
  season_number: number;
  episode_number: number;
  air_date: string;
  total_clues: number;
}

export interface Season {
  season_number: number;
  episode_count: number;
  total_games_played: number;
}

export interface EpisodeWithHistory extends EpisodeListItem {
  games_played: number;
  last_played: string | null;
}

export interface RankedScore {
  player_number: number;
  player_name: string;
  player_id: number;
  score: number;
  rank: number;
}

export interface GameResult {
  game_id: string;
  episode: number;
  episode_display: string;
  status: 'waiting' | 'active' | 'paused' | 'completed' | 'abandoned';
  created_at: string;
  started_at: string | null;
  ended_at: string | null;
  ranked_scores: RankedScore[];
}
