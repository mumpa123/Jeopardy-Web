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

const API_BASE_URL = 'http://127.0.0.1:8000/api';

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

join: async (gameId: string, data: JoinGameRequest): Promies<GameParticipant> => {
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



























