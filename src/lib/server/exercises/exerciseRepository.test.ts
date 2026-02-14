import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';

// We mock fs/promises because exerciseRepository loads the dataset from disk.
vi.mock('node:fs/promises', () => ({
	default: {
		readFile: vi.fn()
	}
}));

describe('exerciseRepository', () => {
	beforeEach(() => {
		vi.resetModules();
	});
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test('returns [] when dataset file is missing (ENOENT)', async () => {
		const fs = await import('node:fs/promises');
		(fs.default.readFile as any).mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }));

		const mod = await import('./exerciseRepository');
		const res = await mod.searchExercises({ query: 'bench' });
		expect(res).toEqual([]);
	});

	test('search by query is case/diacritic/punctuation insensitive', async () => {
		const fs = await import('node:fs/promises');
		(fs.default.readFile as any).mockResolvedValue(
			JSON.stringify([
				{
					id: '1',
					name: 'Caf\u00e9-Press',
					category: 'strength',
					equipment: 'barbell',
					primaryMuscles: ['chest'],
					secondaryMuscles: ['triceps']
				},
				{ id: '2', name: 'Deadlift', category: 'strength', equipment: 'barbell', primaryMuscles: ['back'] }
			])
		);

		const mod = await import('./exerciseRepository');
		const res = await mod.searchExercises({ query: ' cafe press ' });
		expect(res.length).toBe(1);
		expect(res[0].name).toBe('Caf\u00e9-Press');
		expect(res[0].id).toBe('1');
	});

	test('filters by muscle across primary+secondary muscles', async () => {
		const fs = await import('node:fs/promises');
		(fs.default.readFile as any).mockResolvedValue(
			JSON.stringify([
				{ id: '1', name: 'Bench Press', primaryMuscles: ['chest'], secondaryMuscles: ['triceps'] },
				{ id: '2', name: 'Bicep Curl', primaryMuscles: ['biceps'], secondaryMuscles: [] }
			])
		);

		const mod = await import('./exerciseRepository');
		const res = await mod.searchExercises({ muscle: 'triceps' });
		expect(res.map((r) => r.name)).toEqual(['Bench Press']);
	});

	test('filters by equipment (exact match after normalization) and respects limit', async () => {
		const fs = await import('node:fs/promises');
		(fs.default.readFile as any).mockResolvedValue(
			JSON.stringify([
				{ id: '1', name: 'Push Up', equipment: 'body only' },
				{ id: '2', name: 'Bench Press', equipment: 'barbell' },
				{ id: '3', name: 'Incline Bench Press', equipment: 'barbell' }
			])
		);

		const mod = await import('./exerciseRepository');
		const res = await mod.searchExercises({ equipment: 'barbell', limit: 1 });
		expect(res.length).toBe(1);
		expect(res[0].equipment).toBe('barbell');
	});
});
