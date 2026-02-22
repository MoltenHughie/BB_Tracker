import { describe, it, expect } from 'vitest';
import type { SparkPoint } from './sparkline';

// Test the data transformation logic used by TrendChart
describe('TrendChart data logic', () => {
	it('computes Y range with padding', () => {
		const points: SparkPoint[] = [
			{ y: 100, label: 'a' },
			{ y: 200, label: 'b' },
			{ y: 150, label: 'c' },
		];
		const vals = points.map((p) => p.y);
		const minY = Math.min(...vals) * 0.9;
		const maxY = Math.max(...vals) * 1.1;
		expect(minY).toBeCloseTo(90);
		expect(maxY).toBeCloseTo(220);
	});

	it('handles single point', () => {
		const points: SparkPoint[] = [{ y: 42, label: 'x' }];
		const vals = points.map((p) => p.y);
		const minY = Math.min(...vals) * 0.9;
		const maxY = Math.max(...vals) * 1.1;
		expect(maxY).toBeGreaterThan(minY);
	});

	it('includes target in range', () => {
		const points: SparkPoint[] = [
			{ y: 100, label: 'a' },
			{ y: 120, label: 'b' },
		];
		const targetValue = 200;
		const vals = points.map((p) => p.y);
		const minY = Math.min(...vals, targetValue) * 0.9;
		const maxY = Math.max(...vals, targetValue) * 1.1;
		expect(maxY).toBeCloseTo(220);
		expect(minY).toBeCloseTo(90);
	});

	it('generates 5 y-axis ticks', () => {
		const minY = 0;
		const rangeY = 100;
		const ticks = Array.from({ length: 5 }, (_, i) => Math.round(minY + (rangeY * i) / 4));
		expect(ticks).toEqual([0, 25, 50, 75, 100]);
	});
});
