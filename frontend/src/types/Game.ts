// Game types - matches Django models + Redis state




export interface Player {
	  id: number;
	    display_name: string;
	      total_games: number;
	        total_score: number;
		  average_score: number;
}

export interface GameParticipant {
	  id: number;
	    player: number;  // player ID
	      player_name: string;
	        player_number: number;  // 1, 2, or 3
		  score: number;
		    final_wager: number | null;
		      joined_at: string;
}

export interface Game {
	  game_id: string;  // UUID
	    episode: number;  // episode ID
	      episode_display: string;  // e.g., "S1E5"
	        host: number;  // player ID
		  host_name: string;
		    status: 'waiting' | 'active' | 'completed';
		      current_round: 'single' | 'double' | 'final';
		        settings: Record<string, any>;
			  created_at: string;
			    started_at: string | null;
			      ended_at: string | null;
			        participants: GameParticipant[];
}


// For creating a game (only needs these fields)
export interface CreateGameRequest {
	episode: number;
	host: number;
	settings?: Record<string, any>;
}

// For joining a game
export interface JoinGameRequest {
	player_id?: number;
	display_name?: string;
}

// Game state from Redis
export interface GameState {
	episode_id: string;
	status: string;
	current_round: 'single' | 'double' | 'final';
	current_clue: string | null; //clue ID
	revealed_clues: number[]; // list of revealed clue IDs
	daily_doubles: number[]; // list of daily double clue IDs
}

// Player scores from Redis
export interface Scores {
	[playerNumber: number]: number; // { 1: 100, 2: -200, 3: 0 }
}

