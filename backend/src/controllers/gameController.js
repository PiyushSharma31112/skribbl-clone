import { listRecentGames as fetchRecentGames } from '../services/gameHistoryService.js';

export function listRecentGames(req, res) {
  res.json({ games: fetchRecentGames(req.historyLimit) });
}
