import { apiBaseUrl } from './config.js';

async function request(path) {
  if (!apiBaseUrl) {
    throw new Error('Backend is not configured. Set VITE_API_URL in the frontend environment.');
  }

  const response = await fetch(`${apiBaseUrl}${path}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}.`);
  }

  return data;
}

export function getPublicRooms() {
  return request('/rooms');
}

export function getRecentGames() {
  return request('/games?limit=5');
}
