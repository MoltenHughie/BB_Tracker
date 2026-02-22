import { describe, expect, test } from 'vitest';
import { mapFreeExerciseDbEntry } from './free-exercise-db';

describe('free-exercise-db integration', () => {
	test('mapFreeExerciseDbEntry maps required fields and normalizes nulls', () => {
		const mapped = mapFreeExerciseDbEntry({
			name: '  Barbell Bench Press  ',
			category: 'strength',
			level: 'intermediate',
			equipment: 'barbell',
			primaryMuscles: ['chest'],
			secondaryMuscles: ['triceps', 'shoulders']
		});

		expect(mapped.name).toBe('Barbell Bench Press');
		expect(mapped.category).toBe('strength');
		expect(mapped.level).toBe('intermediate');
		expect(mapped.equipment).toBe('barbell');
		expect(mapped.primaryMuscles).toEqual(['chest']);
		expect(mapped.secondaryMuscles).toEqual(['triceps', 'shoulders']);
	});

	test('mapFreeExerciseDbEntry handles missing arrays', () => {
		const mapped = mapFreeExerciseDbEntry({ name: 'Deadlift' });
		expect(mapped.primaryMuscles).toEqual([]);
		expect(mapped.secondaryMuscles).toEqual([]);
		expect(mapped.category).toBeNull();
	});
});
