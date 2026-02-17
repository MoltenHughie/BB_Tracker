<script lang="ts">
	import type { SparkPoint } from './sparkline';
	import { sparklinePath } from './sparkline';

	export let points: SparkPoint[] = [];
	export let width = 220;
	export let height = 60;
	export let stroke = 'currentColor';
	export let strokeWidth = 3;
	export let fill = 'none';
	export let className = '';

	$: d = sparklinePath(points);
</script>

<svg
	class={className}
	width={width}
	height={height}
	viewBox={`0 0 ${width} ${height}`}
	role="img"
	aria-label="sparkline"
>
	{#if d}
		<path d={d} stroke={stroke} stroke-width={strokeWidth} fill={fill} stroke-linecap="round" />
	{/if}
</svg>
