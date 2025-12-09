// API service
//  Handles all HTTP requests to Django backend
//
//


import type {
	Episode,
	EpisodeListItem,
	Game,
	CreateGameRequest,
	JoinGameRequest,
	GameParticipant,
	Player
} from '../types/Game';
import type { Season, EpisodeWithHistory, GameResult } from '../types/Episode';
import { API_BASE_URL } from '../config';

// Generic fetch wrapper with error handling


async function apiFetch<T>(
	endpoint: string,
	options?: RequestInit
): Promise<T> {
	const url = `${API_BASE_URL}${endpoint}`;

	try {
		const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers,
		},
	});
		
		if (!response.ok) {
			const error = await response.json().catch(() => ({}));
			throw new Error(
				error.detail || error.error || `HTTP ${response.status}: ${response.statusText}`
			);
		}

	return await response.json();
	} catch (error) {
		console.error('API Error:', error);
		throw error;
	}
}

// Game Endpoints

export const gameAPI = {
//List all games

list: async (filters?: { status?: string; ordering?: string }): Promise<Game[]> => {
	const params = new URLSearchParams();
	if (filters?.status) params.append('status', filters.status);
	if (filters?.ordering) params.append('ordering', filters.ordering);

	const queryString = params.toString();
	const endpoint = queryString ? `/games/?${queryString}` : '/games/';

	const response = await apiFetch<any>(endpoint);

	// Handle paginated response from DRF
	// If response has a 'results' field, it's paginated
	if (response && typeof response === 'object' && 'results' in response) {
		return response.results as Game[];
	}

	// Otherwise return as-is (backwards compatibility)
	return response as Game[];
},

//Get specific game
//
get: async (gameID: string): Promise<Game> => {
	return apiFetch<Game>(`/games/${gameID}/`);
},

//Create a new game

create: async (data: CreateGameRequest): Promise<Game> => {
	return apiFetch<Game>('/games/', {
		method: 'POST',
		body: JSON.stringify(data),
	});
},

//Join a game

join: async (gameId: string, data: JoinGameRequest): Promise<GameParticipant> => {
	return apiFetch<GameParticipant>(`/games/${gameId}/join/`, {
		method: 'POST',
		body: JSON.stringify(data),
	});
	},

//Start a game

start: async (gameId: string): Promise<Game> => {
	return apiFetch<Game>(`/games/${gameId}/start/`, {
		method: 'POST',
		body: JSON.stringify({}),
	});
},

//Get game state (from Redis)

getState: async (gameId: string): Promise<any> => {
	return apiFetch<any>(`/games/${gameId}/state/`);
},

// Validate game exists

validate: async (gameId: string): Promise<{valid: boolean; status?: string}> => {
	try {
		return await apiFetch<{valid: boolean; status: string}>(`/games/${gameId}/validate/`);
	} catch (error) {
		return { valid: false };
	}
},

// Validate player in game

validatePlayer: async (gameId: string, playerId: number): Promise<{valid: boolean; player_number?: number; player_name?: string}> => {
	try {
		return await apiFetch<{valid: boolean; player_number: number; player_name: string}>(`/games/${gameId}/validate_player/?player_id=${playerId}`);
	} catch (error) {
		return { valid: false };
	}
},

// End game manually (mark as completed)

end: async (gameId: string): Promise<Game> => {
	return apiFetch<Game>(`/games/${gameId}/end/`, {
		method: 'POST',
		body: JSON.stringify({}),
	});
},

// Abandon game

abandon: async (gameId: string): Promise<Game> => {
	return apiFetch<Game>(`/games/${gameId}/abandon/`, {
		method: 'POST',
		body: JSON.stringify({}),
	});
},
};

//Player endpoints

export const playerAPI = {
	//List all players

	list: async (): Promise<Player[]> => {
		return apiFetch<Player[]>('/players/');
	},

	//Get specific player

	get: async (id: number): Promise<Player> => {
		return apiFetch<Player>(`/players/${id}/`);
	},

	//Create guest player

	createGuest: async (displayName: string): Promise<Player> => {
		return apiFetch<Player>('/players/create_guest/', {
			method: 'POST',
			body: JSON.stringify({ display_name: displayName }),
		});
	},
};

//Episode endpoints

export const episodeAPI = {
	//List all episodes

	list: async (): Promise<EpisodeListItem[]> => {
		return apiFetch<EpisodeListItem[]>('/episodes/');
	},

	//Get specific episode

	get: async (id: number): Promise<Episode> => {
		return apiFetch<Episode>(`/episodes/${id}/`);
	},

	//Get random episode

	random: async (): Promise<Episode> => {
		// Add cache-busting timestamp to prevent browser caching
		const timestamp = Date.now();
		return apiFetch<Episode>(`/episodes/random/?t=${timestamp}`);
	},

	//Search episodes

	search: async (season?: number, episode?: number): Promise<Episode[]> => {
		const params = new URLSearchParams();
		if (season) params.append('season', season.toString());
		if (episode) params.append('episode', episode.toString());
		return apiFetch<Episode[]>(`/episodes/search/?${params.toString()}`);
	},

	// Get all seasons with episode counts
	getSeasons: async (): Promise<Season[]> => {
		return apiFetch<Season[]>('/episodes/seasons/');
	},

	// Get episodes for a specific season with history
	getBySeason: async (seasonNumber: number): Promise<EpisodeWithHistory[]> => {
		return apiFetch<EpisodeWithHistory[]>(`/episodes/by_season/${seasonNumber}/`);
	},

	// Get all games for a specific episode
	getGames: async (episodeId: number): Promise<GameResult[]> => {
		return apiFetch<GameResult[]>(`/episodes/${episodeId}/games/`);
	},
};

// Combined API export

export const api = {
	games: gameAPI,
	players: playerAPI,
	episodes: episodeAPI,
};



























