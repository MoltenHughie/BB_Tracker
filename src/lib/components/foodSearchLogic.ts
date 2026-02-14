export type OffResult = {
	name: string;
	brand?: string | null;
	barcode?: string | null;
	calories: number;
	protein: number;
	carbs: number;
	fat: number;
};

export const OFF_SEARCH_DEBOUNCE_MS = 400;

export function shouldSearchOFF(query: string) {
	return query.trim().length >= 2;
}

export async function fetchOFFSearch(query: string): Promise<OffResult[]> {
	const q = query.trim();
	if (!shouldSearchOFF(q)) return [];

	const res = await fetch(`/api/food-search?q=${encodeURIComponent(q)}`);
	if (!res.ok) throw new Error(`OFF search failed: ${res.status}`);

	const data = await res.json();
	return (data?.results ?? []) as OffResult[];
}

export async function saveOFFByBarcode(barcode: string) {
	const code = barcode.trim();
	if (!code) throw new Error('barcode required');

	const res = await fetch('/api/food-search', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ barcode: code })
	});
	if (!res.ok) throw new Error(`OFF save failed: ${res.status}`);
	return res.json();
}
