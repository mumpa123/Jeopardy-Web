/**
 * Application Configuration
 *
 * Priority order:
 * 1. Environment variables (set by update_ip.py script)
 * 2. Current browser hostname (for localhost development)
 *
 * When accessing from other devices, run `python update_ip.py` first
 * to configure the server's network IP address.
 */

// Get API host from environment variable, or use current browser hostname
const API_HOST = import.meta.env.VITE_API_HOST || window.location.hostname;
const API_PORT = import.meta.env.VITE_API_PORT || '8000';

// Get WebSocket host from environment variable, or use current browser hostname
const WS_HOST = import.meta.env.VITE_WS_HOST || window.location.hostname;
const WS_PORT = import.meta.env.VITE_WS_PORT || '8000';

// Construct base URLs
export const API_BASE_URL = `http://${API_HOST}:${API_PORT}/api`;
export const WS_BASE_URL = `ws://${WS_HOST}:${WS_PORT}/ws`;

// Log configuration on startup (helpful for debugging)
console.log('[Config] API Base URL:', API_BASE_URL);
console.log('[Config] WebSocket Base URL:', WS_BASE_URL);

// Warn if using window.location.hostname (may not work for cross-device access)
if (!import.meta.env.VITE_API_HOST) {
  console.log('[Config] Using browser hostname. Run "python update_ip.py" for cross-device access.');
}
