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

const API_BASE_URL = 'http://192.168.1.16:8000/api';

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

list: async (): Promise<Game[]> => {
       return apiFetch<Game[]>('/games/');
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
};

// Combined API export

export const api = {
	games: gameAPI,
	players: playerAPI,
	episodes: episodeAPI,
};



























