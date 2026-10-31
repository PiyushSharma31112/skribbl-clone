const configuredApiUrl = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
const configuredServerUrl = import.meta.env.VITE_SERVER_URL?.replace(/\/+$/, '');

export const serverUrl =
  configuredServerUrl ||
  configuredApiUrl?.replace(/\/api$/i, '') ||
  (import.meta.env.DEV ? 'http://localhost:3001' : '');

export const apiBaseUrl =
  configuredApiUrl || (serverUrl ? `${serverUrl}/api` : '');
