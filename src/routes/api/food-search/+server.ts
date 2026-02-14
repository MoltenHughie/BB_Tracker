import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { foods, foodServings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';
import {
	offFetchProductByBarcode,
	offSearchProducts
} from '$lib/server/integrations/openfoodfacts';

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

			const product = await offFetchProductByBarcode(barcode);
			if (!product) return json({ results: [], error: 'Product not found' });

			const saved = await saveProduct(product);
			return json({ results: [saved], source: 'openfoodfacts' });
		}

		// Text search
		const products = await offSearchProducts(query!);
		return json({ results: products, source: 'openfoodfacts' });
	} catch {
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
	const product = await offFetchProductByBarcode(barcode);
	if (!product) return json({ error: 'Not found' }, { status: 404 });

	const saved = await saveProduct(product);
	return json(saved);
};

async function saveProduct(product: Awaited<ReturnType<typeof offFetchProductByBarcode>>) {
	if (!product) throw new Error('No product');

	const now = new Date().toISOString();
	const [inserted] = await db
		.insert(foods)
		.values({
			name: product.name,
			brand: product.brand,
			barcode: product.barcode,
			source: 'openfoodfacts',
			calories: product.nutrientsPer100g.kcal,
			protein: product.nutrientsPer100g.protein,
			carbs: product.nutrientsPer100g.carbs,
			fat: product.nutrientsPer100g.fat,
			fiber: product.nutrientsPer100g.fiber ?? null,
			sugar: product.nutrientsPer100g.sugar ?? null,
			sodium: product.nutrientsPer100g.sodiumMg ?? null,
			saturatedFat: product.nutrientsPer100g.saturatedFat ?? null,
			createdAt: now,
			updatedAt: now
		})
		.returning();

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
