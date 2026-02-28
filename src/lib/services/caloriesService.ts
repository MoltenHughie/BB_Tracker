import { fetchJson } from './http';

export type IsoDate = string; // YYYY-MM-DD

export interface FoodServing {
	id: number;
	foodId: number;
	name: string;
	grams: number;
	isDefault: boolean;
}

export interface Food {
	id: number;
	name: string;
	brand?: string | null;
	barcode?: string | null;
	source?: 'custom' | 'openfoodfacts' | string;
	calories: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber?: number | null;
	sugar?: number | null;
	sodium?: number | null;
	servings?: FoodServing[];
}

export interface FoodEntry {
	id: number;
	date: IsoDate;
	mealTypeId?: number | null;
	foodId: number;
	servingId?: number | null;
	quantity: number;
	customGrams?: number | null;
	calories: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber?: number | null;
	sugar?: number | null;
	sodium?: number | null;
	loggedAt: string;
	createdAt: string;
	food?: Food;
}

export interface DailyTarget {
	id: number;
	date: IsoDate;
	calories: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber?: number | null;
	source?: string | null;
	note?: string | null;
}

// NOTE: Phase 1 builds client-side services. Initial implementation expects
// JSON endpoints; in static-only deployments these will need a different
// backend (e.g., IndexedDB) but the service interface stays stable.

export const caloriesService = {
	async listFoods(): Promise<Food[]> {
		return fetchJson<Food[]>('/api/foods');
	},

	async getFood(foodId: number): Promise<Food> {
		return fetchJson<Food>(`/api/foods/${foodId}`);
	},

	async upsertFood(food: Partial<Food>): Promise<Food> {
		return fetchJson<Food>('/api/foods', {
			method: 'POST',
			body: JSON.stringify(food)
		});
	},

	async deleteFood(foodId: number): Promise<{ success: true }> {
		return fetchJson<{ success: true }>(`/api/foods/${foodId}`, { method: 'DELETE' });
	},

	async listEntries(date: IsoDate): Promise<FoodEntry[]> {
		return fetchJson<FoodEntry[]>(`/api/calories/entries?date=${encodeURIComponent(date)}`);
	},

	async addEntry(payload: {
		date: IsoDate;
		foodId: number;
		mealTypeId?: number | null;
		servingId?: number | null;
		quantity?: number;
		customGrams?: number | null;
	}): Promise<{ success: true; entryId?: number }>{
		return fetchJson('/api/calories/entries', {
			method: 'POST',
			body: JSON.stringify(payload)
		});
	},

	async updateEntry(entryId: number, payload: { quantity: number }): Promise<{ success: true }> {
		return fetchJson(`/api/calories/entries/${entryId}`, {
			method: 'PATCH',
			body: JSON.stringify(payload)
		});
	},

	async deleteEntry(entryId: number): Promise<{ success: true }> {
		return fetchJson(`/api/calories/entries/${entryId}`, { method: 'DELETE' });
	},

	async getDailyTarget(date: IsoDate): Promise<DailyTarget | null> {
		return fetchJson<DailyTarget | null>(`/api/calories/targets?date=${encodeURIComponent(date)}`);
	},

	async setDailyTarget(date: IsoDate, target: Omit<DailyTarget, 'id' | 'date'>): Promise<DailyTarget> {
		return fetchJson<DailyTarget>('/api/calories/targets', {
			method: 'POST',
			body: JSON.stringify({ date, ...target })
		});
	}
};
