import { fetchJson } from './http';

export interface AppSetting {
	key: string;
	value: string | null;
	updatedAt: string;
}

export interface MealType {
	id: number;
	name: string;
	sortOrder?: number | null;
	icon?: string | null;
}

export const settingsService = {
	async getSetting(key: string): Promise<AppSetting | null> {
		return fetchJson<AppSetting | null>(`/api/settings/${encodeURIComponent(key)}`);
	},

	async setSetting(key: string, value: string | null): Promise<{ success: true }> {
		return fetchJson(`/api/settings/${encodeURIComponent(key)}`, {
			method: 'PUT',
			body: JSON.stringify({ value })
		});
	},

	async listMealTypes(): Promise<MealType[]> {
		return fetchJson<MealType[]>('/api/settings/meal-types');
	}
};
