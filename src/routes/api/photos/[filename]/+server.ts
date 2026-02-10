import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RequestHandler } from './$types';

const MIME_TYPES: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	heic: 'image/heic'
};

export const GET: RequestHandler = async ({ params }) => {
	const { filename } = params;

	// Prevent directory traversal
	if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
		throw error(400, 'Invalid filename');
	}

	const filePath = join(process.cwd(), 'data', 'uploads', 'photos', filename);

	try {
		const buffer = await readFile(filePath);
		const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
		const contentType = MIME_TYPES[ext] || 'application/octet-stream';

		return new Response(buffer, {
			headers: {
				'Content-Type': contentType,
				'Cache-Control': 'public, max-age=31536000, immutable'
			}
		});
	} catch {
		throw error(404, 'Photo not found');
	}
};
