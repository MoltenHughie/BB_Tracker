import test from 'node:test';
import assert from 'node:assert/strict';

import { mapFreeExerciseDbEntry } from './free-exercise-db.js';

test('mapFreeExerciseDbEntry maps required fields and normalizes nulls', () => {
	const mapped = mapFreeExerciseDbEntry({
		name: '  Barbell Bench Press  ',
		category: 'strength',
		level: 'intermediate',
		equipment: 'barbell',
		primaryMuscles: ['chest'],
		secondaryMuscles: ['triceps', 'shoulders']
	});

	assert.equal(mapped.name, 'Barbell Bench Press');
	assert.equal(mapped.category, 'strength');
	assert.equal(mapped.level, 'intermediate');
	assert.equal(mapped.equipment, 'barbell');
	assert.deepEqual(mapped.primaryMuscles, ['chest']);
	assert.deepEqual(mapped.secondaryMuscles, ['triceps', 'shoulders']);
});

test('mapFreeExerciseDbEntry handles missing arrays', () => {
	const mapped = mapFreeExerciseDbEntry({
		name: 'Deadlift'
	});
	assert.deepEqual(mapped.primaryMuscles, []);
	assert.deepEqual(mapped.secondaryMuscles, []);
	assert.equal(mapped.category, null);
});
