import { fetchJson } from './http';
import type { IsoDate } from './caloriesService';

export interface BodyWeightEntry {
	id: number;
	date: IsoDate;
	weightKg: number;
	note?: string | null;
	createdAt: string;
}

export interface MeasurementEntry {
	id: number;
	date: IsoDate;
	chest?: number | null;
	waist?: number | null;
	hips?: number | null;
	arm?: number | null;
	thigh?: number | null;
	calf?: number | null;
	note?: string | null;
	createdAt: string;
}

export const bodyService = {
	async listWeights(): Promise<BodyWeightEntry[]> {
		return fetchJson<BodyWeightEntry[]>('/api/body/weights');
	},

	async addWeight(payload: Omit<BodyWeightEntry, 'id' | 'createdAt'>): Promise<BodyWeightEntry> {
		return fetchJson<BodyWeightEntry>('/api/body/weights', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
	},

	async listMeasurements(): Promise<MeasurementEntry[]> {
		return fetchJson<MeasurementEntry[]>('/api/body/measurements');
	}
};
