export interface DonutSegment {
	label: string;
	value: number;
	color: string;
}

export interface DonutArc extends DonutSegment {
	pct: number;
	dasharray: string;
	rotation: number;
}

export function computeArcs(
	segments: DonutSegment[],
	radius: number
): DonutArc[] {
	const circumference = 2 * Math.PI * radius;
	const total = segments.reduce((s, seg) => s + seg.value, 0);
	if (total === 0) return [];

	let offset = 0;
	return segments
		.filter(s => s.value > 0)
		.map(seg => {
			const pct = seg.value / total;
			const dashLen = pct * circumference;
			const dashGap = circumference - dashLen;
			const rotation = offset * 360 - 90;
			offset += pct;
			return {
				...seg,
				pct,
				dasharray: `${dashLen} ${dashGap}`,
				rotation
			};
		});
}
