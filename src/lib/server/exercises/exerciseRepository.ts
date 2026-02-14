import fs from 'node:fs/promises';
import path from 'node:path';

import { mapFreeExerciseDbEntry, type ExerciseCatalogEntry, type FreeExerciseDbEntry } from '$lib/server/integrations/free-exercise-db';

export type ExerciseSearchParams = {
	query?: string;
	muscle?: string; // primary or secondary muscle (aka “body part”)
	equipment?: string;
	limit?: number;
};

export type ExerciseSearchResult = ExerciseCatalogEntry & {
	// free-exercise-db includes an id field; keep it when present for stable selection.
	id?: string;
};

const DATASET_REL_PATH = 'static/datasets/free-exercise-db.exercises.json';

function norm(s: string) {
	return s
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[_\-]/g, ' ')
		.replace(/[^a-z0-9\s]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function includesNorm(haystack: string, needle: string) {
	if (!needle) return true;
	return norm(haystack).includes(norm(needle));
}

let cached:
	| {
			loadedAtMs: number;
			entries: ExerciseSearchResult[];
		}
	| null = null;

async function loadFromDisk(): Promise<ExerciseSearchResult[]> {
	const datasetPath = path.resolve(DATASET_REL_PATH);

	let rawText: string;
	try {
		rawText = await fs.readFile(datasetPath, 'utf-8');
	} catch (e: any) {
		// Offline app should still function even if dataset is missing.
		if (e?.code === 'ENOENT') return [];
		throw e;
	}

	let rawJson: unknown;
	try {
		rawJson = JSON.parse(rawText);
	} catch {
		// Bad / partial file: treat as unavailable.
		return [];
	}

	if (!Array.isArray(rawJson)) return [];

	return rawJson
		.map((r) => {
			const raw = r as FreeExerciseDbEntry & { id?: string };
			const mapped = mapFreeExerciseDbEntry(raw);
			return { ...mapped, id: raw.id } satisfies ExerciseSearchResult;
		})
		.filter((e) => e.name.length > 0);
}

export async function getExerciseCatalog(): Promise<ExerciseSearchResult[]> {
	// Simple in-memory cache; reload on server restart.
	if (cached) return cached.entries;

	const entries = await loadFromDisk();
	cached = { loadedAtMs: Date.now(), entries };
	return entries;
}

export class ExerciseRepository {
	async catalog() {
		return getExerciseCatalog();
	}
	async search(params: ExerciseSearchParams) {
		return searchExercises(params);
	}
}

export async function searchExercises(params: ExerciseSearchParams): Promise<ExerciseSearchResult[]> {
	const q = params.query?.trim() ?? '';
	const muscle = params.muscle?.trim() ?? '';
	const equipment = params.equipment?.trim() ?? '';
	const limit = Math.max(0, Math.min(params.limit ?? 50, 200));

	const catalog = await getExerciseCatalog();
	if (catalog.length === 0) return [];

	const muscleN = norm(muscle);
	const equipmentN = norm(equipment);
	const qN = norm(q);

	const out: ExerciseSearchResult[] = [];
	for (const e of catalog) {
		if (qN && !includesNorm(e.name, qN)) continue;

		if (muscleN) {
			const all = [...(e.primaryMuscles ?? []), ...(e.secondaryMuscles ?? [])].map(norm);
			if (!all.includes(muscleN)) continue;
		}

		if (equipmentN) {
			const eq = e.equipment ? norm(e.equipment) : '';
			if (!eq || eq !== equipmentN) continue;
		}

		out.push(e);
		if (limit && out.length >= limit) break;
	}

	return out;
}
