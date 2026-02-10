import { db } from '$lib/server/db';
import { 
	bodyWeights, 
	measurementTypes,
	bodyMeasurements, 
	bodyPhotos,
	bodyComposition
} from '$lib/server/db/schema';
import { eq, desc, asc, gte, lte, and } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Get date from query param or default to today
	const dateParam = url.searchParams.get('date');
	const today = new Date().toISOString().split('T')[0];
	const date = dateParam || today;

	// Get recent weights (last 30 entries)
	const weights = await db.query.bodyWeights.findMany({
		orderBy: desc(bodyWeights.date),
		limit: 30
	});

	// Get latest weight
	const latestWeight = weights[0] ?? null;

	// Calculate weight trend (last 7 days average vs previous 7 days)
	const sevenDaysAgo = new Date();
	sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
	const fourteenDaysAgo = new Date();
	fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

	const recentWeights = weights.filter(w => new Date(w.date) >= sevenDaysAgo);
	const olderWeights = weights.filter(w => {
		const d = new Date(w.date);
		return d >= fourteenDaysAgo && d < sevenDaysAgo;
	});

	const recentAvg = recentWeights.length > 0
		? recentWeights.reduce((sum, w) => sum + w.weight, 0) / recentWeights.length
		: null;
	const olderAvg = olderWeights.length > 0
		? olderWeights.reduce((sum, w) => sum + w.weight, 0) / olderWeights.length
		: null;

	const weightTrend = recentAvg !== null && olderAvg !== null
		? recentAvg - olderAvg
		: null;

	// Get all measurement types
	const measureTypes = await db.query.measurementTypes.findMany({
		orderBy: asc(measurementTypes.sortOrder)
	});

	// Get latest measurements for each type
	const latestMeasurements = new Map<number, typeof bodyMeasurements.$inferSelect>();
	for (const type of measureTypes) {
		const latest = await db.query.bodyMeasurements.findFirst({
			where: eq(bodyMeasurements.measurementTypeId, type.id),
			orderBy: desc(bodyMeasurements.date)
		});
		if (latest) {
			latestMeasurements.set(type.id, latest);
		}
	}

	// Get measurements for today
	const todayMeasurements = await db.query.bodyMeasurements.findMany({
		where: eq(bodyMeasurements.date, date),
		with: { measurementType: true },
		orderBy: asc(bodyMeasurements.measurementTypeId)
	});

	// Get recent photos (last 10)
	const photos = await db.query.bodyPhotos.findMany({
		orderBy: desc(bodyPhotos.date),
		limit: 10
	});

	// Get latest body composition
	const latestComposition = await db.query.bodyComposition.findFirst({
		orderBy: desc(bodyComposition.date)
	});

	// Get composition history (last 20)
	const compositionHistory = await db.query.bodyComposition.findMany({
		orderBy: desc(bodyComposition.date),
		limit: 20
	});

	return {
		date,
		weights,
		latestWeight,
		weightTrend,
		recentAvg,
		measureTypes,
		latestMeasurements: Object.fromEntries(latestMeasurements),
		todayMeasurements,
		photos,
		latestComposition,
		compositionHistory
	};
};

export const actions: Actions = {
	// Log a weight entry
	logWeight: async ({ request }) => {
		const data = await request.formData();
		const weight = parseFloat(data.get('weight') as string);
		const date = data.get('date') as string;
		const time = data.get('time') as string || null;
		const condition = data.get('condition') as string || null;
		const notes = data.get('notes') as string || null;

		if (!weight || isNaN(weight)) {
			return fail(400, { error: 'Weight is required' });
		}

		const now = new Date().toISOString();

		// Check if entry exists for this date
		const existing = await db.query.bodyWeights.findFirst({
			where: eq(bodyWeights.date, date)
		});

		if (existing) {
			// Update existing
			await db.update(bodyWeights)
				.set({ weight, time, condition, notes: notes ?? existing.notes })
				.where(eq(bodyWeights.id, existing.id));
		} else {
			// Create new
			await db.insert(bodyWeights).values({
				date,
				weight,
				time,
				condition,
				notes,
				createdAt: now
			});
		}

		return { success: true };
	},

	// Delete a weight entry
	deleteWeight: async ({ request }) => {
		const data = await request.formData();
		const weightId = parseInt(data.get('weightId') as string);

		if (!weightId || isNaN(weightId)) {
			return fail(400, { error: 'Weight ID is required' });
		}

		await db.delete(bodyWeights).where(eq(bodyWeights.id, weightId));
		return { success: true };
	},

	// Log a measurement
	logMeasurement: async ({ request }) => {
		const data = await request.formData();
		const measurementTypeId = parseInt(data.get('measurementTypeId') as string);
		const value = parseFloat(data.get('value') as string);
		const date = data.get('date') as string;
		const notes = data.get('notes') as string || null;

		if (!measurementTypeId || isNaN(measurementTypeId)) {
			return fail(400, { error: 'Measurement type is required' });
		}
		if (!value || isNaN(value)) {
			return fail(400, { error: 'Value is required' });
		}

		const now = new Date().toISOString();

		// Check if measurement exists for this date and type
		const existing = await db.query.bodyMeasurements.findFirst({
			where: and(
				eq(bodyMeasurements.date, date),
				eq(bodyMeasurements.measurementTypeId, measurementTypeId)
			)
		});

		if (existing) {
			// Update existing
			await db.update(bodyMeasurements)
				.set({ value, notes: notes ?? existing.notes })
				.where(eq(bodyMeasurements.id, existing.id));
		} else {
			// Create new
			await db.insert(bodyMeasurements).values({
				date,
				measurementTypeId,
				value,
				notes,
				createdAt: now
			});
		}

		return { success: true };
	},

	// Delete a measurement
	deleteMeasurement: async ({ request }) => {
		const data = await request.formData();
		const measurementId = parseInt(data.get('measurementId') as string);

		if (!measurementId || isNaN(measurementId)) {
			return fail(400, { error: 'Measurement ID is required' });
		}

		await db.delete(bodyMeasurements).where(eq(bodyMeasurements.id, measurementId));
		return { success: true };
	},

	// Add a measurement type
	addMeasurementType: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const unit = (data.get('unit') as string) || 'cm';
		const icon = data.get('icon') as string || null;

		if (!name) {
			return fail(400, { error: 'Name is required' });
		}

		// Get max sort order
		const existing = await db.query.measurementTypes.findMany();
		const maxOrder = existing.reduce((max, t) => Math.max(max, t.sortOrder || 0), 0);

		await db.insert(measurementTypes).values({
			name,
			unit,
			icon,
			sortOrder: maxOrder + 1
		});

		return { success: true };
	},

	// Delete a measurement type
	deleteMeasurementType: async ({ request }) => {
		const data = await request.formData();
		const typeId = parseInt(data.get('typeId') as string);

		if (!typeId || isNaN(typeId)) {
			return fail(400, { error: 'Type ID is required' });
		}

		// This will also delete associated measurements (cascade)
		await db.delete(measurementTypes).where(eq(measurementTypes.id, typeId));
		return { success: true };
	},

	// Log body composition
	logComposition: async ({ request }) => {
		const data = await request.formData();
		const date = data.get('date') as string;
		const bodyFatPercent = data.get('bodyFatPercent') ? parseFloat(data.get('bodyFatPercent') as string) : null;
		const muscleMassKg = data.get('muscleMassKg') ? parseFloat(data.get('muscleMassKg') as string) : null;
		const boneMassKg = data.get('boneMassKg') ? parseFloat(data.get('boneMassKg') as string) : null;
		const waterPercent = data.get('waterPercent') ? parseFloat(data.get('waterPercent') as string) : null;
		const method = data.get('method') as string || null;
		const notes = data.get('notes') as string || null;

		if (!bodyFatPercent && !muscleMassKg) {
			return fail(400, { error: 'At least body fat or muscle mass is required' });
		}

		const now = new Date().toISOString();

		// Check if composition exists for this date
		const existing = await db.query.bodyComposition.findFirst({
			where: eq(bodyComposition.date, date)
		});

		if (existing) {
			// Update existing
			await db.update(bodyComposition)
				.set({ bodyFatPercent, muscleMassKg, boneMassKg, waterPercent, method, notes })
				.where(eq(bodyComposition.id, existing.id));
		} else {
			// Create new
			await db.insert(bodyComposition).values({
				date,
				bodyFatPercent,
				muscleMassKg,
				boneMassKg,
				waterPercent,
				method,
				notes,
				createdAt: now
			});
		}

		return { success: true };
	},

	// Delete composition entry
	deleteComposition: async ({ request }) => {
		const data = await request.formData();
		const compositionId = parseInt(data.get('compositionId') as string);

		if (!compositionId || isNaN(compositionId)) {
			return fail(400, { error: 'Composition ID is required' });
		}

		await db.delete(bodyComposition).where(eq(bodyComposition.id, compositionId));
		return { success: true };
	},

	// Upload a check-in photo (stores on disk, DB holds reference)
	addPhoto: async ({ request }) => {
		const data = await request.formData();
		const date = data.get('date') as string || new Date().toISOString().split('T')[0];
		const file = data.get('photo') as File | null;
		const pose = data.get('pose') as string || null;
		const notes = data.get('notes') as string || null;

		if (!file || file.size === 0) {
			return fail(400, { error: 'Photo file is required' });
		}

		// Validate file type
		const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
		if (!allowed.includes(file.type)) {
			return fail(400, { error: 'Invalid file type. Use JPEG, PNG, WebP, or HEIC.' });
		}

		// Limit file size (10MB)
		if (file.size > 10 * 1024 * 1024) {
			return fail(400, { error: 'File too large. Max 10MB.' });
		}

		const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
		const filename = `${date}_${pose || 'photo'}_${Date.now()}.${ext}`;

		// Write to disk
		const { writeFile, mkdir } = await import('node:fs/promises');
		const { join } = await import('node:path');
		const uploadDir = join(process.cwd(), 'data', 'uploads', 'photos');
		await mkdir(uploadDir, { recursive: true });

		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(join(uploadDir, filename), buffer);

		const now = new Date().toISOString();
		await db.insert(bodyPhotos).values({
			date,
			filename,
			pose,
			notes,
			createdAt: now
		});

		return { success: true };
	},

	// Delete a photo
	deletePhoto: async ({ request }) => {
		const data = await request.formData();
		const photoId = parseInt(data.get('photoId') as string);

		if (!photoId || isNaN(photoId)) {
			return fail(400, { error: 'Photo ID is required' });
		}

		await db.delete(bodyPhotos).where(eq(bodyPhotos.id, photoId));
		return { success: true };
	}
};
