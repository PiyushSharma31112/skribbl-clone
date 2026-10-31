import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePlayerName, validateRoomSettings } from '../src/utils/validation.js';

test('player names are trimmed and limited to 18 characters', () => {
  assert.equal(normalizePlayerName('  Sketcher  '), 'Sketcher');
  assert.equal(normalizePlayerName(''), null);
  assert.equal(normalizePlayerName('a'.repeat(19)), null);
  assert.equal(normalizePlayerName({ name: 'Sketcher' }), null);
});

test('room settings use defaults and accept valid limits', () => {
  assert.deepEqual(validateRoomSettings(), {
    maxPlayers: 8,
    rounds: 3,
    drawTime: 80,
    wordCount: 3,
    hints: 2,
    category: 'All',
  });
  assert.equal(
    validateRoomSettings({
      maxPlayers: 20,
      rounds: 10,
      drawTime: 240,
      wordCount: 5,
      hints: 0,
      category: 'Food',
    }).category,
    'Food',
  );
});

test('room settings reject invalid numbers, categories, and payloads', () => {
  assert.equal(validateRoomSettings(null), null);
  assert.equal(validateRoomSettings({ maxPlayers: Number.NaN }), null);
  assert.equal(validateRoomSettings({ rounds: 1 }), null);
  assert.equal(validateRoomSettings({ drawTime: 241 }), null);
  assert.equal(validateRoomSettings({ wordCount: 1.5 }), null);
  assert.equal(validateRoomSettings({ hints: -1 }), null);
  assert.equal(validateRoomSettings({ category: 'Unknown' }), null);
  assert.equal(validateRoomSettings({ unexpected: true }), null);
});
