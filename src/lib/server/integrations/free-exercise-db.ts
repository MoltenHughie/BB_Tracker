export type FreeExerciseDbEntry = {
	name: string;
	force?: string | null;
	level?: string | null;
	mechanic?: string | null;
	equipment?: string | null;
	primaryMuscles?: string[] | null;
	secondaryMuscles?: string[] | null;
	instructions?: string[] | null;
	category?: string | null;
	images?: string[] | null;
};

export type ExerciseCatalogEntry = {
	name: string;
	category: string | null;
	level: string | null;
	equipment: string | null;
	primaryMuscles: string[];
	secondaryMuscles: string[];
};

export function mapFreeExerciseDbEntry(raw: FreeExerciseDbEntry): ExerciseCatalogEntry {
	return {
		name: raw.name.trim(),
		category: raw.category ?? null,
		level: raw.level ?? null,
		equipment: raw.equipment ?? null,
		primaryMuscles: (raw.primaryMuscles ?? []).filter(Boolean),
		secondaryMuscles: (raw.secondaryMuscles ?? []).filter(Boolean)
	};
}
