export type SparkPoint = { x: number; y: number };

/**
 * Generate an SVG path string for a polyline-like sparkline.
 *
 * Edge cases:
 * - 0 points -> empty string
 * - 1 point  -> "M x y" (no line)
 */
export function sparklinePath(points: SparkPoint[]): string {
	if (points.length === 0) return '';
	if (points.length === 1) {
		const p = points[0]!;
		return `M ${p.x} ${p.y}`;
	}
	let d = '';
	for (let i = 0; i < points.length; i++) {
		const p = points[i]!;
		d += i === 0 ? `M ${p.x} ${p.y}` : ` L ${p.x} ${p.y}`;
	}
	return d;
}

export function normalizeToSparkPoints(values: number[], width: number, height: number): SparkPoint[] {
	if (values.length === 0) return [];
	if (values.length === 1) return [{ x: 0, y: height / 2 }];

	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = Math.max(1e-9, max - min);

	return values.map((v, i) => {
		const x = (i / (values.length - 1)) * width;
		// SVG y grows downward; invert so larger values appear higher.
		const y = height - ((v - min) / span) * height;
		return { x, y };
	});
}
