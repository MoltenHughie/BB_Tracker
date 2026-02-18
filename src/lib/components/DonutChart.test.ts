import { describe, it, expect } from 'vitest';
import { computeArcs, type DonutSegment } from './donutLogic';

const R = 80; // typical radius

describe('DonutChart / computeArcs', () => {
	it('returns empty array for no segments', () => {
		expect(computeArcs([], R)).toEqual([]);
	});

	it('returns empty array when all values are zero', () => {
		const segs: DonutSegment[] = [
			{ label: 'A', value: 0, color: '#000' },
			{ label: 'B', value: 0, color: '#111' }
		];
		expect(computeArcs(segs, R)).toEqual([]);
	});

	it('computes correct percentages for equal segments', () => {
		const segs: DonutSegment[] = [
			{ label: 'Protein', value: 50, color: '#6366f1' },
			{ label: 'Fat', value: 50, color: '#ef4444' }
		];
		const arcs = computeArcs(segs, R);
		expect(arcs).toHaveLength(2);
		expect(arcs[0].pct).toBeCloseTo(0.5);
		expect(arcs[1].pct).toBeCloseTo(0.5);
	});

	it('skips zero-value segments', () => {
		const segs: DonutSegment[] = [
			{ label: 'Protein', value: 40, color: '#6366f1' },
			{ label: 'Carbs', value: 0, color: '#f59e0b' },
			{ label: 'Fat', value: 60, color: '#ef4444' }
		];
		const arcs = computeArcs(segs, R);
		expect(arcs).toHaveLength(2);
		expect(arcs[0].label).toBe('Protein');
		expect(arcs[1].label).toBe('Fat');
	});

	it('percentages sum to 1', () => {
		const segs: DonutSegment[] = [
			{ label: 'P', value: 120, color: '#a' },
			{ label: 'C', value: 200, color: '#b' },
			{ label: 'F', value: 80, color: '#c' }
		];
		const arcs = computeArcs(segs, R);
		const sum = arcs.reduce((s, a) => s + a.pct, 0);
		expect(sum).toBeCloseTo(1);
	});

	it('first arc starts at -90 degrees (top)', () => {
		const segs: DonutSegment[] = [
			{ label: 'A', value: 1, color: '#000' }
		];
		const arcs = computeArcs(segs, R);
		expect(arcs[0].rotation).toBe(-90);
	});
});
