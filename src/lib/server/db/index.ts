import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'path';

import * as schema from './schema';

const DB_PATH = process.env.BBT_DB_PATH || './data/bb_tracker.sqlite';

export const sqlite = new Database(DB_PATH);

export const db = drizzle(sqlite, { schema });

// Auto-migrate on startup (idempotent — skips already-applied migrations)
migrate(db, { migrationsFolder: resolve(process.cwd(), 'drizzle') });
