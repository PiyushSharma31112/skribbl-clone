import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
config({ path: resolve(backendRoot, '.env') });

const port = Number(process.env.PORT || 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.');
}

export const PORT = port;
export const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
export const DATABASE_PATH = resolve(
  backendRoot,
  process.env.DATABASE_PATH || 'data/scribbly.sqlite',
);
