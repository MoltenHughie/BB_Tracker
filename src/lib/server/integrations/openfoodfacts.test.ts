import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import {
	normalizeOFFProduct,
	offFetchProductByBarcode,
	offSearchProducts,
	type OFFProductRaw
} from './openfoodfacts';

function mockFetchOnce(payload: unknown, opts?: { ok?: boolean; status?: number }) {
	const ok = opts?.ok ?? true;
	const status = opts?.status ?? (ok ? 200 : 500);
	return vi.fn(async () => ({
		ok,
		status,
		json: async () => payload
	})) as unknown as typeof fetch;
}

describe('openfoodfacts integration', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	test('normalizeOFFProduct returns null when barcode missing', () => {
		expect(normalizeOFFProduct({ product_name: 'X' })).toBeNull();
	});

	test('normalizeOFFProduct returns null when kcal missing', () => {
		const raw: OFFProductRaw = {
			code: '123',
			product_name: 'Test',
			nutriments: { proteins_100g: 10 }
		};
		expect(normalizeOFFProduct(raw)).toBeNull();
	});

	test('normalizeOFFProduct maps key fields and sodium g -> mg', () => {
		const raw: OFFProductRaw = {
			code: '8712345678901',
			product_name: 'My Bar',
			brands: 'BrandCo',
			serving_size: '1 bar',
			serving_quantity: 50,
			nutriments: {
				'energy-kcal_100g': '420',
				proteins_100g: 10,
				carbohydrates_100g: 60,
				fat_100g: 12,
				sodium_100g: 0.5
			}
		};

		const p = normalizeOFFProduct(raw);
		expect(p).not.toBeNull();
		expect(p!.barcode).toBe('8712345678901');
		expect(p!.name).toBe('My Bar');
		expect(p!.brand).toBe('BrandCo');
		expect(p!.nutrientsPer100g.kcal).toBe(420);
		expect(p!.nutrientsPer100g.sodiumMg).toBe(500);
		expect(p!.servingSize).toBe('1 bar');
		expect(p!.servingQuantity).toBe(50);
	});

	test('offSearchProducts returns normalized products and filters invalid', async () => {
		vi.stubGlobal(
			'fetch',
			mockFetchOnce({
				products: [
					{
						code: '111',
						product_name: 'A',
						brands: 'B',
						nutriments: { 'energy-kcal_100g': 100 }
					},
					{ code: '222', product_name: 'No kcal', nutriments: {} }
				]
			})
		);

		const res = await offSearchProducts('ab');
		expect(res.length).toBe(1);
		expect(res[0].barcode).toBe('111');
	});

	test('offSearchProducts throws when fetch not ok', async () => {
		vi.stubGlobal('fetch', mockFetchOnce({}, { ok: false, status: 500 }));
		await expect(offSearchProducts('ab')).rejects.toThrow(/OFF search failed/i);
	});

	test('offFetchProductByBarcode returns null when not found', async () => {
		vi.stubGlobal('fetch', mockFetchOnce({ status: 0 }, { ok: true }));
		const res = await offFetchProductByBarcode('123');
		expect(res).toBeNull();
	});

	test('offFetchProductByBarcode returns normalized product when status=1', async () => {
		vi.stubGlobal(
			'fetch',
			mockFetchOnce({
				status: 1,
				product: {
					code: '333',
					product_name: 'P',
					nutriments: { 'energy-kcal_100g': 50 }
				}
			})
		);
		const res = await offFetchProductByBarcode('333');
		expect(res?.barcode).toBe('333');
		expect(res?.nutrientsPer100g.kcal).toBe(50);
	});
});
