// Websocket message types
//
//




// Base message type
export interface BaseMessage {
	type: string;
	timestamp?: number;
}

//Outgoing messages (client -> server)

export interface BuzzMessage extends BaseMessage {
	type: 'buzz';
	player_number: number;
	timestamp: number; // client timestamp in milliseconds
}

export interface RevealClueMessage extends BaseMessage {
	type: 'reveal_clue';
	clue_id: number;
}

export interface JudgeAnswerMessage extends BaseMessage {
	type: 'judge_answer';
	player_number: number;
	correct: boolean;
	value: number;
}


export interface NextClueMessage extends BaseMessage {
	type: 'next_clue';
}

export interface PlayerJoinMessage extends BaseMessage {
	type: 'player_join';
	player_name: string;
	player_number: number;
}

export interface ResetGameMessage extends BaseMessage {
	type: 'reset_game';
}

// Incoming messages (server -> client)

export interface ConnectionEstablishedMessage extends BaseMessage {
	type: 'connection_established';
	game_id: string;
	state: any; // GameState
	scores: { [key: number]: number };
}

export interface BuzzResultMessage extends BaseMessage {
	type: 'buzz_result';
	player_number: number;
	accepted: boolean;
	winner: number | null;
	position: number;
	server_timestamp: number;
}

export interface ClueRevealedMessage extends BaseMessage {
	type: 'clue_revealed';
	clue: {
		id: number;
		question: string;
		answer: string;
		value: number;
		is_daily_double: boolean;
		category?: string;  // Optional category name
	};
}

export interface AnswerJudgedMessage extends BaseMessage {
	type: 'answer_judged';
	player_number: number;
	correct: boolean;
	value: number;
	new_score: number;
}

export interface ReturnToBoardMessage extends BaseMessage {
	type: 'return_to_board';
	scores: { [key: number]: number };
	revealed_clues: number[];
}

export interface ErrorMessage extends BaseMessage {
	type: 'error';
	message: string;
}

export interface PlayerJoinedMessage extends BaseMessage {
	type: 'player_joined';
	player_number: number;
	player_name: string;
}

export interface GameResetMessage extends BaseMessage {
	type: 'game_reset';
	scores: { [key: number]: number };
	players: { [key: number]: string };
}

// Union type of all possible messages
export type IncomingMessage =
	| ConnectionEstablishedMessage
	| BuzzResultMessage
	| ClueRevealedMessage
	| AnswerJudgedMessage
	| ReturnToBoardMessage
	| PlayerJoinedMessage
	| GameResetMessage
	| ErrorMessage;

export type OutgoingMessage =
	| BuzzMessage
	| RevealClueMessage
	| JudgeAnswerMessage
	| NextClueMessage
	| PlayerJoinMessage
	| ResetGameMessage;
	




