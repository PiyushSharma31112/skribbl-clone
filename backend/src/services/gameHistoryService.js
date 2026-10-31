import { getRecentGames, recordCompletedGame } from '../models/gameHistory.js';

export function saveCompletedGame(roomId, leaderboard) {
  return recordCompletedGame(roomId, leaderboard);
}

export function listRecentGames(limit) {
  return getRecentGames(limit);
}
