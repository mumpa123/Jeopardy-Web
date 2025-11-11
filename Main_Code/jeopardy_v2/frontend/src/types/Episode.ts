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
