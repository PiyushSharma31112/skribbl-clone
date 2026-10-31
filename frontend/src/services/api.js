const apiBaseUrl = (
  import.meta.env.VITE_API_URL ||
  `${import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'}/api`
).replace(/\/+$/, '');

async function request(path) {
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
