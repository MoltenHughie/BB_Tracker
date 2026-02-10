import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { foods, foodServings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

interface OFFProduct {
	code: string;
	product_name: string;
	brands: string;
	nutriments: {
		'energy-kcal_100g'?: number;
		proteins_100g?: number;
		carbohydrates_100g?: number;
		fat_100g?: number;
		fiber_100g?: number;
		sugars_100g?: number;
		sodium_100g?: number;
		'saturated-fat_100g'?: number;
	};
	serving_size?: string;
	serving_quantity?: number;
}

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim();
	const barcode = url.searchParams.get('barcode')?.trim();

	if (!query && !barcode) {
		return json({ results: [], error: 'Provide ?q=search+term or ?barcode=EAN' });
	}

	try {
		if (barcode) {
			// Barcode lookup — check local cache first
			const cached = await db.query.foods.findFirst({
				where: eq(foods.barcode, barcode),
				with: { servings: true }
			});
			if (cached) {
				return json({ results: [cached], source: 'local' });
			}

			const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
			if (!res.ok) return json({ results: [], error: 'Product not found' });
			const data = await res.json();
			if (data.status !== 1) return json({ results: [], error: 'Product not found' });

			const product = mapProduct(data.product);
			if (product) {
				const saved = await saveProduct(product);
				return json({ results: [saved], source: 'openfoodfacts' });
			}
			return json({ results: [], error: 'Incomplete nutrition data' });
		}

		// Text search
		const res = await fetch(
			`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query!)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,brands,nutriments,serving_size,serving_quantity`
		);
		if (!res.ok) return json({ results: [], error: 'Search failed' });

		const data = await res.json();
		const products = (data.products || [])
			.map((p: OFFProduct) => mapProduct(p))
			.filter(Boolean);

		return json({ results: products, source: 'openfoodfacts' });
	} catch (err) {
		return json({ results: [], error: 'OpenFoodFacts request failed' }, { status: 502 });
	}
};

// Save (cache) a product from OFF to local DB + return it
export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const { barcode } = body;

	if (!barcode) return json({ error: 'barcode required' }, { status: 400 });

	// Check cache
	const existing = await db.query.foods.findFirst({
		where: eq(foods.barcode, barcode),
		with: { servings: true }
	});
	if (existing) return json(existing);

	// Fetch from OFF
	const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
	if (!res.ok) return json({ error: 'Not found' }, { status: 404 });
	const data = await res.json();
	if (data.status !== 1) return json({ error: 'Not found' }, { status: 404 });

	const product = mapProduct(data.product);
	if (!product) return json({ error: 'Incomplete data' }, { status: 422 });

	const saved = await saveProduct(product);
	return json(saved);
};

function mapProduct(p: OFFProduct) {
	const n = p.nutriments;
	const cal = n?.['energy-kcal_100g'];
	if (cal == null) return null;

	return {
		barcode: p.code,
		name: p.product_name || 'Unknown',
		brand: p.brands || null,
		calories: cal,
		protein: n.proteins_100g ?? 0,
		carbs: n.carbohydrates_100g ?? 0,
		fat: n.fat_100g ?? 0,
		fiber: n.fiber_100g ?? null,
		sugar: n.sugars_100g ?? null,
		sodium: n.sodium_100g ? n.sodium_100g * 1000 : null, // g → mg
		saturatedFat: n['saturated-fat_100g'] ?? null,
		servingSize: p.serving_size || null,
		servingQuantity: p.serving_quantity || null
	};
}

async function saveProduct(product: ReturnType<typeof mapProduct>) {
	if (!product) throw new Error('No product');

	const now = new Date().toISOString();
	const [inserted] = await db.insert(foods).values({
		name: product.name,
		brand: product.brand,
		barcode: product.barcode,
		source: 'openfoodfacts',
		calories: product.calories,
		protein: product.protein,
		carbs: product.carbs,
		fat: product.fat,
		fiber: product.fiber,
		sugar: product.sugar,
		sodium: product.sodium,
		saturatedFat: product.saturatedFat,
		createdAt: now,
		updatedAt: now
	}).returning();

	// Add default serving if available
	if (product.servingSize && product.servingQuantity) {
		await db.insert(foodServings).values({
			foodId: inserted.id,
			name: product.servingSize,
			grams: product.servingQuantity,
			isDefault: true
		});
	}

	return { ...inserted, servings: [] };
}
