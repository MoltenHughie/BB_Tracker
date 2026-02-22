<script lang="ts">
	import { sparklinePath, type SparkPoint } from './sparkline';

	export let points: SparkPoint[] = [];
	export let width = 350;
	export let height = 200;
	export let title = '';
	export let unit = '';
	export let color = '#6366f1';
	export let targetValue: number | null = null;
	export let targetLabel = 'Target';
	export let showDots = true;
	export let className = '';

	const pad = { top: 30, right: 16, bottom: 28, left: 48 };
	$: iw = width - pad.left - pad.right;
	$: ih = height - pad.top - pad.bottom;

	$: vals = points.map((p) => p.y);
	$: minY = Math.min(...vals, targetValue ?? Infinity) * 0.9;
	$: maxY = Math.max(...vals, targetValue ?? -Infinity) * 1.1;
	$: rangeY = maxY - minY || 1;

	$: scaled = points.map((p, i) => ({
		x: pad.left + (points.length > 1 ? (i / (points.length - 1)) * iw : iw / 2),
		y: pad.top + ih - ((p.y - minY) / rangeY) * ih,
		label: p.label,
		value: p.y
	}));

	$: pathD = scaled.length > 1
		? 'M ' + scaled.map((s) => `${s.x},${s.y}`).join(' L ')
		: '';

	$: targetY =
		targetValue != null ? pad.top + ih - ((targetValue - minY) / rangeY) * ih : null;

	// Y axis ticks (5 ticks)
	$: yTicks = Array.from({ length: 5 }, (_, i) => {
		const v = minY + (rangeY * i) / 4;
		return { value: Math.round(v), y: pad.top + ih - (i / 4) * ih };
	});
</script>

<div class="trend-chart {className}">
	{#if title}
		<h3 class="text-sm font-semibold text-center mb-1" style="color: {color}">{title}</h3>
	{/if}
	<svg {width} {height} viewBox="0 0 {width} {height}">
		<!-- Y axis -->
		{#each yTicks as tick}
			<line x1={pad.left} y1={tick.y} x2={width - pad.right} y2={tick.y} stroke="var(--color-border, #333)" stroke-width="0.5" />
			<text x={pad.left - 6} y={tick.y + 4} text-anchor="end" fill="var(--color-text-muted, #888)" font-size="10">{tick.value}</text>
		{/each}

		<!-- Target line -->
		{#if targetY != null}
			<line x1={pad.left} y1={targetY} x2={width - pad.right} y2={targetY} stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="6,4" />
			<text x={width - pad.right + 2} y={targetY - 4} fill="#f59e0b" font-size="9">{targetLabel}</text>
		{/if}

		<!-- Line -->
		{#if pathD}
			<path d={pathD} stroke={color} stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
		{/if}

		<!-- Dots -->
		{#if showDots}
			{#each scaled as s}
				<circle cx={s.x} cy={s.y} r="3.5" fill={color} />
			{/each}
		{/if}

		<!-- X labels (first, middle, last) -->
		{#if scaled.length > 0}
			{@const labels = [scaled[0], scaled[Math.floor(scaled.length / 2)], scaled[scaled.length - 1]]}
			{#each labels as s}
				{#if s?.label}
					<text x={s.x} y={height - 6} text-anchor="middle" fill="var(--color-text-muted, #888)" font-size="10">{s.label}</text>
				{/if}
			{/each}
		{/if}

		<!-- Unit label -->
		{#if unit}
			<text x={pad.left} y={pad.top - 10} fill="var(--color-text-muted, #888)" font-size="10">{unit}</text>
		{/if}
	</svg>
</div>
