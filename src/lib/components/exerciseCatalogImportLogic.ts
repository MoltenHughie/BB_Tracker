export function buildExerciseCatalogImportUrl(limit: number | null | undefined): string {
	const qs = limit ? `?limit=${encodeURIComponent(String(limit))}` : '';
	return `/api/exercise-catalog/import${qs}`;
}
