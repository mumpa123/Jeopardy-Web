/**
 * Application Configuration
 */

const API_HOST = import.meta.env.VITE_API_HOST || window.location.hostname;
const API_PORT = import.meta.env.VITE_API_PORT || '8000';
const WS_HOST = import.meta.env.VITE_WS_HOST || window.location.hostname;
const WS_PORT = import.meta.env.VITE_WS_PORT || '8000';

// Detect HTTPS automatically
const useHTTPS = API_PORT === '443' || window.location.protocol === 'https:';
const httpProtocol = useHTTPS ? 'https' : 'http';
const wsProtocol = useHTTPS ? 'wss' : 'ws';

// Omit port if using standard ports (80 for HTTP, 443 for HTTPS)
const apiPort = (useHTTPS && API_PORT === '443') || (!useHTTPS && API_PORT === '80') ? '' : `:${API_PORT}`;
const wsPort = (useHTTPS && WS_PORT === '443') || (!useHTTPS && WS_PORT === '80') ? '' : `:${WS_PORT}`;

export const API_BASE_URL = `${httpProtocol}://${API_HOST}${apiPort}/api`;
export const WS_BASE_URL = `${wsProtocol}://${WS_HOST}${wsPort}/ws`;

// Log configuration on startup
console.log('[Config] API Base URL:', API_BASE_URL);
console.log('[Config] WebSocket Base URL:', WS_BASE_URL);
