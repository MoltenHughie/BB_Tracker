<script lang="ts">
	import { computeArcs, type DonutSegment } from './donutLogic';

	let {
		segments = [],
		size = 200,
		strokeWidth = 40,
		title = '',
		centerLabel = '',
		centerValue = ''
	}: {
		segments?: DonutSegment[];
		size?: number;
		strokeWidth?: number;
		title?: string;
		centerLabel?: string;
		centerValue?: string;
	} = $props();

	const radius = $derived((size - strokeWidth) / 2);
	const arcs = $derived(computeArcs(segments, radius));
</script>

<div class="flex flex-col items-center gap-2">
	{#if title}
		<h3 class="text-sm font-semibold text-[var(--color-text-muted)]">{title}</h3>
	{/if}

	<svg width={size} height={size} viewBox="0 0 {size} {size}">
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke="var(--color-surface, #e5e7eb)"
			stroke-width={strokeWidth}
		/>

		{#each arcs as arc}
			<circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				fill="none"
				stroke={arc.color}
				stroke-width={strokeWidth}
				stroke-dasharray={arc.dasharray}
				stroke-linecap="butt"
				transform="rotate({arc.rotation} {size / 2} {size / 2})"
			/>
		{/each}

		{#if centerValue}
			<text
				x={size / 2}
				y={size / 2 - 6}
				text-anchor="middle"
				dominant-baseline="middle"
				class="text-lg font-bold fill-[var(--color-text,#111)]"
				font-size="20"
			>{centerValue}</text>
			{#if centerLabel}
				<text
					x={size / 2}
					y={size / 2 + 14}
					text-anchor="middle"
					dominant-baseline="middle"
					class="fill-[var(--color-text-muted,#6b7280)]"
					font-size="12"
				>{centerLabel}</text>
			{/if}
		{/if}
	</svg>

	{#if arcs.length > 0}
		<div class="flex flex-wrap justify-center gap-3 text-xs">
			{#each arcs as arc}
				<span class="flex items-center gap-1">
					<span class="inline-block h-2.5 w-2.5 rounded-full" style="background:{arc.color}"></span>
					{arc.label} {Math.round(arc.pct * 100)}%
				</span>
			{/each}
		</div>
	{/if}
</div>
