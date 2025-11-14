/**
 * Session Manager Service
 *
 * Handles session persistence using localStorage for the Jeopardy game.
 * Stores player/host session data to survive page refreshes.
 * Uses namespaced keys to prevent session conflicts when testing multiple roles in same browser.
 */

const SESSION_KEY_PREFIX = 'jeopardy_session';

export interface SessionData {
  playerId: number;
  guestSession: string;
  gameId: string;
  playerNumber: number;
  role: 'host' | 'player' | 'board';
  displayName: string;
  timestamp: number;
}

/**
 * Generate a namespaced localStorage key for a session
 * Format: jeopardy_session_{role}_{gameId}
 */
function getSessionKey(role: 'host' | 'player' | 'board', gameId: string): string {
  return `${SESSION_KEY_PREFIX}_${role}_${gameId}`;
}

/**
 * Save session data to localStorage
 */
export function saveSession(data: SessionData): void {
  try {
    const sessionData = {
      ...data,
      timestamp: Date.now()
    };
    const key = getSessionKey(data.role, data.gameId);
    localStorage.setItem(key, JSON.stringify(sessionData));
    console.log('[SessionManager] Session saved:', sessionData, 'key:', key);
  } catch (error) {
    console.error('[SessionManager] Failed to save session:', error);
  }
}

/**
 * Get session data from localStorage for a specific role and game
 */
export function getSession(role?: 'host' | 'player' | 'board', gameId?: string): SessionData | null {
  try {
    // If role and gameId provided, use namespaced key
    if (role && gameId) {
      const key = getSessionKey(role, gameId);
      const data = localStorage.getItem(key);
      if (!data) {
        return null;
      }
      const session = JSON.parse(data) as SessionData;
      console.log('[SessionManager] Session retrieved:', session, 'key:', key);
      return session;
    }

    // Legacy support: check for old non-namespaced key
    // This handles migration from old sessions
    const legacyData = localStorage.getItem(SESSION_KEY_PREFIX);
    if (legacyData) {
      const session = JSON.parse(legacyData) as SessionData;
      console.log('[SessionManager] Legacy session retrieved:', session);
      // Migrate to new format
      saveSession(session);
      // Remove old key
      localStorage.removeItem(SESSION_KEY_PREFIX);
      return session;
    }

    return null;
  } catch (error) {
    console.error('[SessionManager] Failed to get session:', error);
    return null;
  }
}

/**
 * Check if a valid session exists for a specific role and game
 */
export function hasSession(role?: 'host' | 'player' | 'board', gameId?: string): boolean {
  const session = getSession(role, gameId);
  return session !== null;
}

/**
 * Clear session data from localStorage for a specific role and game
 */
export function clearSession(role: 'host' | 'player' | 'board', gameId: string): void {
  try {
    const key = getSessionKey(role, gameId);
    localStorage.removeItem(key);
    console.log('[SessionManager] Session cleared:', key);
  } catch (error) {
    console.error('[SessionManager] Failed to clear session:', error);
  }
}

/**
 * Update specific fields in the session
 */
export function updateSession(updates: Partial<SessionData>): void {
  // Need role and gameId to know which session to update
  if (!updates.role || !updates.gameId) {
    console.error('[SessionManager] Cannot update session without role and gameId');
    return;
  }
  const currentSession = getSession(updates.role, updates.gameId);
  if (currentSession) {
    saveSession({ ...currentSession, ...updates });
  }
}

/**
 * Check if session is for a specific game
 */
export function isSessionForGame(role: 'host' | 'player' | 'board', gameId: string): boolean {
  const session = getSession(role, gameId);
  return session !== null && session.gameId === gameId;
}

/**
 * Check if session is for a specific role
 */
export function isSessionForRole(role: 'host' | 'player' | 'board', gameId: string): boolean {
  const session = getSession(role, gameId);
  return session !== null && session.role === role;
}
