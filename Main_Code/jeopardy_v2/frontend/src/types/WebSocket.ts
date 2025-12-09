// Websocket message types
//
//




// Base message type
export interface BaseMessage {
	type: string;
	timestamp?: number;
}

// Daily Double stage type
export type DDStage = 'detected' | 'revealed' | 'wagering' | 'answering' | 'judged';

//Outgoing messages (client -> server)

export interface BuzzMessage extends BaseMessage {
	type: 'buzz';
	player_number: number;
	timestamp: number; // client timestamp in milliseconds
	unlock_token?: number | null; // token received from buzzer_enabled for validation
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

export interface EnableBuzzerMessage extends BaseMessage {
	type: 'enable_buzzer';
}

export interface PlayerJoinMessage extends BaseMessage {
	type: 'player_join';
	player_name: string;
	player_number: number;
}

export interface ResetGameMessage extends BaseMessage {
	type: 'reset_game';
}

export interface AdjustScoreMessage extends BaseMessage {
	type: 'adjust_score';
	player_number: number;
	adjustment: number;
}

export interface RevealDailyDoubleMessage extends BaseMessage {
	type: 'reveal_daily_double';
}

export interface SubmitWagerMessage extends BaseMessage {
	type: 'submit_wager';
	player_number: number;
	wager: number;
}

export interface SubmitDDAnswerMessage extends BaseMessage {
	type: 'submit_dd_answer';
	player_number: number;
	answer: string;
}

export interface JudgeDDAnswerMessage extends BaseMessage {
	type: 'judge_dd_answer';
	player_number: number;
	correct: boolean;
}

export interface ShowDDClueMessage extends BaseMessage {
	type: 'show_dd_clue';
}

export interface StartFinalJeopardyMessage extends BaseMessage {
	type: 'start_final_jeopardy';
}

export interface SubmitFJWagerMessage extends BaseMessage {
	type: 'submit_fj_wager';
	player_number: number;
	wager: number;
}

export interface RevealFJClueMessage extends BaseMessage {
	type: 'reveal_fj_clue';
}

export interface SubmitFJAnswerMessage extends BaseMessage {
	type: 'submit_fj_answer';
	player_number: number;
	answer: string;
}

export interface JudgeFJAnswerMessage extends BaseMessage {
	type: 'judge_fj_answer';
	player_number: number;
	correct: boolean;
}

export interface StartRoundMessage extends BaseMessage {
	type: 'start_round';
	round: 'single' | 'double' | 'final';
}

export interface EndGameMessage extends BaseMessage {
	type: 'end_game';
}

export interface AbandonGameMessage extends BaseMessage {
	type: 'abandon_game';
}

export interface StartFJTimerMessage extends BaseMessage {
	type: 'start_fj_timer';
}

// Incoming messages (server -> client)

export interface ConnectionEstablishedMessage extends BaseMessage {
	type: 'connection_established';
	game_id: string;
	state: any; // GameState
	scores: { [key: string]: number };
	players: { [key: string]: string };
}

export interface BuzzResultMessage extends BaseMessage {
	type: 'buzz_result';
	player_number: number;
	player_name: string;
	accepted: boolean;
	winner: number | null;
	position: number;
	server_timestamp: number;
	cooldown?: boolean; // whether this buzz was rejected due to cooldown
	cooldown_remaining?: number; // seconds remaining in cooldown
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
	scores: { [key: string]: number };
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

export interface BuzzerEnabledMessage extends BaseMessage {
	type: 'buzzer_enabled';
	clue_id: number;
	unlock_token?: number; // unique token for this unlock event
}

export interface GameResetMessage extends BaseMessage {
	type: 'game_reset';
	scores: { [key: string]: number };
	players: { [key: string]: string };
}

export interface ScoreAdjustedMessage extends BaseMessage {
	type: 'score_adjusted';
	player_number: number;
	adjustment: number;
	new_score: number;
}

export interface DailyDoubleDetectedMessage extends BaseMessage {
	type: 'daily_double_detected';
	clue_id: number;
	player_number: number;
}

export interface DailyDoubleRevealedMessage extends BaseMessage {
	type: 'daily_double_revealed';
	player_number: number;
	player_name: string;
	clue?: {  // Made optional since clue is now shown separately
		id: number;
		question: string;
		answer: string;
		value: number;
		is_daily_double: boolean;
		category?: string;
	};
}

export interface WagerSubmittedMessage extends BaseMessage {
	type: 'wager_submitted';
	player_number: number;
	wager: number;
}

export interface DDAnswerSubmittedMessage extends BaseMessage {
	type: 'dd_answer_submitted';
	player_number: number;
	answer: string;
}

export interface DDAnswerJudgedMessage extends BaseMessage {
	type: 'dd_answer_judged';
	player_number: number;
	correct: boolean;
	wager: number;
	new_score: number;
}

export interface DDClueShownMessage extends BaseMessage {
	type: 'dd_clue_shown';
	player_number: number;
	clue: {
		id: number;
		question: string;
		answer: string;
		value: number;
		is_daily_double: boolean;
		category?: string;
	};
}

export interface FJCategoryShownMessage extends BaseMessage {
	type: 'fj_category_shown';
	category: string;
}

export interface FJWagerSubmittedMessage extends BaseMessage {
	type: 'fj_wager_submitted';
	player_number: number;
	wager: number;
}

export interface FJClueRevealedMessage extends BaseMessage {
	type: 'fj_clue_revealed';
	clue: {
		id: number;
		question: string;
		answer: string;
		value?: number;
		is_daily_double: boolean;
		category?: string;
	};
	timer_duration: number;  // 30 seconds
}

export interface FJAnswerSubmittedMessage extends BaseMessage {
	type: 'fj_answer_submitted';
	player_number: number;
	answer: string;
}

export interface FJAnswerJudgedMessage extends BaseMessage {
	type: 'fj_answer_judged';
	player_number: number;
	correct: boolean;
	wager: number;
	new_score: number;
}

export interface RoundChangedMessage extends BaseMessage {
	type: 'round_changed';
	round: 'single' | 'double' | 'final';
	revealed_clues: number[];
}

export interface FJTimerStartedMessage extends BaseMessage {
	type: 'fj_timer_started';
	timer_duration: number;
}

export interface GameCompletedMessage extends BaseMessage {
	type: 'game_completed';
	final_scores: { [key: string]: number };
	reason?: string;
}

export interface GameAbandonedMessage extends BaseMessage {
	type: 'game_abandoned';
	final_scores: { [key: string]: number };
}

// Union type of all possible messages
export type IncomingMessage =
	| ConnectionEstablishedMessage
	| BuzzResultMessage
	| ClueRevealedMessage
	| AnswerJudgedMessage
	| ReturnToBoardMessage
	| PlayerJoinedMessage
	| BuzzerEnabledMessage
	| GameResetMessage
	| ScoreAdjustedMessage
	| DailyDoubleDetectedMessage
	| DailyDoubleRevealedMessage
	| WagerSubmittedMessage
	| DDClueShownMessage
	| DDAnswerSubmittedMessage
	| DDAnswerJudgedMessage
	| FJCategoryShownMessage
	| FJWagerSubmittedMessage
	| FJClueRevealedMessage
	| FJTimerStartedMessage
	| FJAnswerSubmittedMessage
	| FJAnswerJudgedMessage
	| RoundChangedMessage
	| GameCompletedMessage
	| GameAbandonedMessage
	| ErrorMessage;

export type OutgoingMessage =
	| BuzzMessage
	| RevealClueMessage
	| JudgeAnswerMessage
	| NextClueMessage
	| EnableBuzzerMessage
	| PlayerJoinMessage
	| ResetGameMessage
	| AdjustScoreMessage
	| RevealDailyDoubleMessage
	| SubmitWagerMessage
	| ShowDDClueMessage
	| SubmitDDAnswerMessage
	| JudgeDDAnswerMessage
	| StartFinalJeopardyMessage
	| SubmitFJWagerMessage
	| RevealFJClueMessage
	| StartFJTimerMessage
	| SubmitFJAnswerMessage
	| JudgeFJAnswerMessage
	| StartRoundMessage
	| EndGameMessage
	| AbandonGameMessage;
	




