import { fetchJson } from './http';
import type { IsoDate } from './caloriesService';

export interface Exercise {
	id: number;
	name: string;
	category?: string | null;
	equipment?: string | null;
	muscleGroups?: string | null; // JSON string in DB; client may parse
	notes?: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface WorkoutTemplate {
	id: number;
	name: string;
	description?: string | null;
	color?: string | null;
	sortOrder?: number | null;
	createdAt: string;
	updatedAt: string;
}

export interface Workout {
	id: number;
	templateId?: number | null;
	name: string;
	date: IsoDate;
	createdAt: string;
	updatedAt: string;
}

export const trainingService = {
	async listExercises(): Promise<Exercise[]> {
		return fetchJson<Exercise[]>('/api/training/exercises');
	},

	async upsertExercise(exercise: Partial<Exercise>): Promise<Exercise> {
		return fetchJson<Exercise>('/api/training/exercises', {
			method: 'POST',
			body: JSON.stringify(exercise)
		});
	},

	async listWorkoutTemplates(): Promise<WorkoutTemplate[]> {
		return fetchJson<WorkoutTemplate[]>('/api/training/templates');
	},

	async listWorkouts(date?: IsoDate): Promise<Workout[]> {
		const q = date ? `?date=${encodeURIComponent(date)}` : '';
		return fetchJson<Workout[]>(`/api/training/workouts${q}`);
	},

	async createWorkout(payload: { templateId?: number | null; name: string; date: IsoDate }): Promise<Workout> {
		return fetchJson<Workout>('/api/training/workouts', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
	}
};
