export type ExerciseLike = {
	id?: number;
	name: string;
	category: string | null;
	equipment: string | null;
	[k: string]: any;
};

export function filterByQueryAndCategory<T extends ExerciseLike>(
	items: T[],
	query: string,
	category: string | null
): T[] {
	let filtered = items;
	if (category) filtered = filtered.filter((e) => e.category === category);

	const q = query.trim().toLowerCase();
	if (q) {
		filtered = filtered.filter((e) => (e.name ?? '').toLowerCase().includes(q));
	}
	return filtered;
}

export function filterCatalogEntries<T extends ExerciseLike>(
	catalogEntries: T[],
	query: string,
	category: string | null,
	limit: number
): T[] {
	const filtered = filterByQueryAndCategory(catalogEntries, query, category);
	return filtered.slice(0, Math.max(0, limit));
}

export function deriveCategories(exercises: ExerciseLike[], catalogEntries: ExerciseLike[]): string[] {
	const cats = new Set<string>([
		...exercises.map((e) => e.category).filter((c): c is string => Boolean(c)),
		...catalogEntries.map((e) => e.category).filter((c): c is string => Boolean(c))
	]);
	return Array.from(cats).sort();
}
