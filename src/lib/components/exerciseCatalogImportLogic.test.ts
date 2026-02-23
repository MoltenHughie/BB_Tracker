import { describe, it, expect } from 'vitest';
import { buildExerciseCatalogImportUrl } from './exerciseCatalogImportLogic';

describe('exerciseCatalogImportLogic', () => {
	it('builds base URL when no limit is provided', () => {
		expect(buildExerciseCatalogImportUrl(null)).toBe('/api/exercise-catalog/import');
		expect(buildExerciseCatalogImportUrl(undefined)).toBe('/api/exercise-catalog/import');
	});

	it('builds URL with limit', () => {
		expect(buildExerciseCatalogImportUrl(50)).toBe('/api/exercise-catalog/import?limit=50');
	});
});
