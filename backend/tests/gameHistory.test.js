import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const temporaryDirectory = mkdtempSync(join(tmpdir(), 'scribbly-history-'));
process.env.DATABASE_PATH = join(temporaryDirectory, 'games.sqlite');

const { recordCompletedGame, getRecentGames } = await import('../src/models/gameHistory.js');
const { default: database } = await import('../src/config/database.js');

after(() => {
  database.close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

test('completed matches are stored and returned newest first', () => {
  const leaderboard = [
    { id: 'player-1', name: 'Doodle', score: 200 },
    { id: 'player-2', name: 'Sketch', score: 100 },
  ];

  const saved = recordCompletedGame('ABC123', leaderboard);
  const [recent] = getRecentGames(5);

  assert.equal(saved.roomId, 'ABC123');
  assert.equal(saved.winnerName, 'Doodle');
  assert.equal(recent.id, saved.id);
  assert.equal(recent.playerCount, 2);
  assert.deepEqual(recent.leaderboard, leaderboard);
});
