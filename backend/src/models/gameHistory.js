import database from '../config/database.js';

const insertGame = database.prepare(`
  INSERT INTO completed_games (
    room_id,
    winner_name,
    player_count,
    leaderboard_json,
    completed_at
  ) VALUES (?, ?, ?, ?, ?)
`);

const selectRecentGames = database.prepare(`
  SELECT id, room_id, winner_name, player_count, leaderboard_json, completed_at
  FROM completed_games
  ORDER BY id DESC
  LIMIT ?
`);

export function recordCompletedGame(roomId, leaderboard) {
  const completedAt = new Date().toISOString();
  const result = insertGame.run(
    roomId,
    leaderboard[0]?.name || null,
    leaderboard.length,
    JSON.stringify(leaderboard),
    completedAt,
  );

  return {
    id: Number(result.lastInsertRowid),
    roomId,
    winnerName: leaderboard[0]?.name || null,
    playerCount: leaderboard.length,
    completedAt,
  };
}

export function getRecentGames(limit) {
  return selectRecentGames.all(limit).map((game) => ({
    id: game.id,
    roomId: game.room_id,
    winnerName: game.winner_name,
    playerCount: game.player_count,
    leaderboard: JSON.parse(game.leaderboard_json),
    completedAt: game.completed_at,
  }));
}
