import { describe, expect, it } from 'vitest';
import { normalizeToSparkPoints, sparklinePath } from './sparkline';

describe('sparklinePath', () => {
	it('returns empty string for 0 points', () => {
		expect(sparklinePath([])).toBe('');
	});

	it('returns a move for 1 point', () => {
		expect(sparklinePath([{ x: 1, y: 2 }])).toBe('M 1 2');
	});

	it('returns move+lines for multiple points', () => {
		const d = sparklinePath([
			{ x: 0, y: 1 },
			{ x: 2, y: 3 },
			{ x: 4, y: 5 }
		]);
		expect(d).toBe('M 0 1 L 2 3 L 4 5');
	});
});

describe('normalizeToSparkPoints', () => {
	it('maps values to x in [0,width] and y in [0,height]', () => {
		const pts = normalizeToSparkPoints([10, 20, 15], 100, 50);
		expect(pts[0]!.x).toBe(0);
		expect(pts[2]!.x).toBe(100);
		for (const p of pts) {
			expect(p.y).toBeGreaterThanOrEqual(0);
			expect(p.y).toBeLessThanOrEqual(50);
		}
	});

	it('handles constant series', () => {
		const pts = normalizeToSparkPoints([5, 5, 5], 10, 10);
		expect(pts.length).toBe(3);
	});
});
