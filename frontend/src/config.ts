/**
 * Application Configuration
 */

const API_HOST = import.meta.env.VITE_API_HOST || window.location.hostname;
const API_PORT = import.meta.env.VITE_API_PORT || "";
const WS_HOST = import.meta.env.VITE_WS_HOST || window.location.hostname;
const WS_PORT = import.meta.env.VITE_WS_PORT || "";

// Detect HTTPS automatically
const useHTTPS = window.location.protocol === "https:";
const httpProtocol = useHTTPS ? "https" : "http";
const wsProtocol = useHTTPS ? "wss" : "ws";

// Only add port if explicitly specified
const apiPort = API_PORT ? `:${API_PORT}` : "";
const wsPort = WS_PORT ? `:${WS_PORT}` : "";

export const API_BASE_URL = `${httpProtocol}://${API_HOST}${apiPort}/api`;
export const WS_BASE_URL = `${wsProtocol}://${WS_HOST}${wsPort}/ws`;

// Log configuration on startup
console.log("[Config] API Base URL:", API_BASE_URL);
console.log("[Config] WebSocket Base URL:", WS_BASE_URL);
