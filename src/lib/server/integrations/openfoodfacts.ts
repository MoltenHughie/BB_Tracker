export interface OFFProductRaw {
	code?: string;
	product_name?: string;
	brands?: string;
	nutriments?: Record<string, unknown>;
	serving_size?: string;
	serving_quantity?: number;
}

export interface OFFNutrientsPer100g {
	kcal: number;
	protein: number;
	carbs: number;
	fat: number;
	fiber?: number;
	sugar?: number;
	/** mg */
	sodiumMg?: number;
	saturatedFat?: number;
}

export interface OFFProductNormalized {
	barcode: string;
	name: string;
	brand: string | null;
	nutrientsPer100g: OFFNutrientsPer100g;
	servingSize: string | null;
	servingQuantity: number | null;
}

function nNum(v: unknown): number | undefined {
	if (typeof v === 'number' && Number.isFinite(v)) return v;
	if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
	return undefined;
}

/**
 * Map an OpenFoodFacts product into a normalized structure.
 * Returns null when minimum viable nutrition (kcal/100g) is missing.
 */
export function normalizeOFFProduct(p: OFFProductRaw): OFFProductNormalized | null {
	const code = (p.code ?? '').trim();
	if (!code) return null;

	const nutr = (p.nutriments ?? {}) as Record<string, unknown>;

	// OFF uses energy-kcal_100g for kcal
	const kcal = nNum(nutr['energy-kcal_100g']);
	if (kcal == null) return null;

	const sodiumG = nNum(nutr['sodium_100g']);

	return {
		barcode: code,
		name: (p.product_name ?? '').trim() || 'Unknown',
		brand: (p.brands ?? '').trim() || null,
		nutrientsPer100g: {
			kcal,
			protein: nNum(nutr['proteins_100g']) ?? 0,
			carbs: nNum(nutr['carbohydrates_100g']) ?? 0,
			fat: nNum(nutr['fat_100g']) ?? 0,
			fiber: nNum(nutr['fiber_100g']),
			sugar: nNum(nutr['sugars_100g']),
			sodiumMg: sodiumG != null ? sodiumG * 1000 : undefined,
			saturatedFat: nNum(nutr['saturated-fat_100g'])
		},
		servingSize: (p.serving_size ?? '').trim() || null,
		servingQuantity: typeof p.serving_quantity === 'number' && Number.isFinite(p.serving_quantity)
			? p.serving_quantity
			: null
	};
}

export async function offSearchProducts(query: string, opts?: { pageSize?: number }) {
	const q = query.trim();
	if (q.length < 2) return [] as OFFProductNormalized[];

	const pageSize = opts?.pageSize ?? 15;
	const url =
		`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}` +
		`&search_simple=1&action=process&json=1&page_size=${pageSize}` +
		`&fields=code,product_name,brands,nutriments,serving_size,serving_quantity`;

	const res = await fetch(url);
	if (!res.ok) throw new Error('OFF search failed');

	const data = await res.json();
	const products = (data.products ?? []) as OFFProductRaw[];
	return products.map(normalizeOFFProduct).filter((p): p is OFFProductNormalized => p != null);
}

export async function offFetchProductByBarcode(barcode: string) {
	const code = barcode.trim();
	if (!code) throw new Error('barcode required');

	const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
	if (!res.ok) return null;
	const data = await res.json();
	if (data.status !== 1) return null;
	return normalizeOFFProduct(data.product as OFFProductRaw);
}
