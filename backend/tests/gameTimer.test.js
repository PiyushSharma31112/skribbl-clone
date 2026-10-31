import assert from 'node:assert/strict';
import test from 'node:test';
import Game from '../src/models/game.js';
import Player from '../src/models/player.js';

function createGame() {
  const players = new Map([
    ['player-1', new Player('player-1', 'Drawer')],
    ['player-2', new Player('player-2', 'Guesser')],
  ]);
  const room = {
    hostId: 'player-1',
    players,
    settings: { rounds: 2, drawTime: 30, hints: 0 },
  };
  return new Game(room);
}

test('word choice countdown remains visible and decreases each second', (context) => {
  let now = 100_000;
  context.mock.method(Date, 'now', () => now);
  const game = createGame();
  game.phase = 'choosing';
  game.drawerIndex = 0;
  game.choosingStartedAt = now;

  assert.equal(game.state('player-1').timeLeft, 20);
  now += 5_000;
  assert.equal(game.state('player-1').timeLeft, 15);
});

test('drawing countdown uses draw duration and reaches zero', (context) => {
  let now = 200_000;
  context.mock.method(Date, 'now', () => now);
  const game = createGame();
  game.phase = 'drawing';
  game.drawerIndex = 0;
  game.word = 'dolphin';
  game.startedAt = now;

  assert.equal(game.state('player-1').timeLeft, 30);
  now += 12_000;
  assert.equal(game.state('player-2').timeLeft, 18);
  now += 18_000;
  assert.equal(game.state('player-2').timeLeft, 0);
});
