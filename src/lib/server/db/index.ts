import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema';

const DB_PATH = process.env.BBT_DB_PATH || './data/bb_tracker.sqlite';

export const sqlite = new Database(DB_PATH);
export const db = drizzle(sqlite, { schema });
