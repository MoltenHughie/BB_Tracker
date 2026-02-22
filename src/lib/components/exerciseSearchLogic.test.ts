import { describe, expect, test } from 'vitest';
import { deriveCategories, filterByQueryAndCategory, filterCatalogEntries } from './exerciseSearchLogic';

describe('exerciseSearchLogic', () => {
	test('filterByQueryAndCategory filters by category then query (case-insensitive)', () => {
		const exercises = [
			{ id: 1, name: 'Bench Press', category: 'strength', equipment: 'barbell' },
			{ id: 2, name: 'Bicep Curl', category: 'strength', equipment: 'dumbbell' },
			{ id: 3, name: 'Running', category: 'cardio', equipment: null }
		];

		expect(filterByQueryAndCategory(exercises as any, 'bench', 'strength').map((e) => e.id)).toEqual([1]);
		expect(filterByQueryAndCategory(exercises as any, '', 'cardio').map((e) => e.id)).toEqual([3]);
	});

	test('filterCatalogEntries applies limit', () => {
		const catalog = [
			{ name: 'A', category: 'strength', equipment: null },
			{ name: 'B', category: 'strength', equipment: null }
		];
		expect(filterCatalogEntries(catalog as any, '', 'strength', 1).length).toBe(1);
	});

	test('deriveCategories unions + sorts categories', () => {
		const exercises = [{ name: 'X', category: 'strength', equipment: null }];
		const catalog = [{ name: 'Y', category: 'cardio', equipment: null }];
		expect(deriveCategories(exercises as any, catalog as any)).toEqual(['cardio', 'strength']);
	});
});
