import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from './schema';

const DB_PATH = process.env.BBT_DB_PATH || './data/bb_tracker.sqlite';

export const sqlite = new Database(DB_PATH);

function ensureSchema() {
	// Minimal migration/bootstrap for existing SQLite installs.
	// We keep this intentionally tiny and idempotent.
	sqlite.exec('CREATE TABLE IF NOT EXISTS bbt_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)');

	const get = sqlite.prepare('SELECT value FROM bbt_meta WHERE key = ?');
	const set = sqlite.prepare(
		'INSERT INTO bbt_meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
	);

	const row = get.get('schema_version') as { value?: string } | undefined;
	const version = row?.value ? parseInt(row.value) : 0;
	let v = Number.isFinite(version) ? version : 0;

	// v1: day_meals + food_entries.day_meal_id
	if (v < 1) {
		sqlite.exec(`
			CREATE TABLE IF NOT EXISTS day_meals (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				date TEXT NOT NULL,
				name TEXT NOT NULL,
				sort_order INTEGER NOT NULL DEFAULT 0
			);
			CREATE INDEX IF NOT EXISTS day_meals_date_idx ON day_meals(date);
			CREATE INDEX IF NOT EXISTS day_meals_date_sort_idx ON day_meals(date, sort_order);
		`);

		const cols = sqlite.prepare('PRAGMA table_info(food_entries)').all() as Array<{ name: string }>;
		const hasDayMeal = cols.some((c) => c.name === 'day_meal_id');
		if (!hasDayMeal) {
			sqlite.exec('ALTER TABLE food_entries ADD COLUMN day_meal_id INTEGER');
		}

		v = 1;
		set.run('schema_version', String(v));
	}
}

ensureSchema();

export const db = drizzle(sqlite, { schema });
