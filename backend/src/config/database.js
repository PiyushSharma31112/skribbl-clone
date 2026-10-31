import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { DATABASE_PATH } from './env.js';

mkdirSync(dirname(DATABASE_PATH), { recursive: true });

const database = new Database(DATABASE_PATH);
database.pragma('journal_mode = WAL');
database.exec(`
  CREATE TABLE IF NOT EXISTS completed_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT NOT NULL,
    winner_name TEXT,
    player_count INTEGER NOT NULL,
    leaderboard_json TEXT NOT NULL,
    completed_at TEXT NOT NULL
  );
`);

export default database;
