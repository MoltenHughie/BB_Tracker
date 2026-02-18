<script lang="ts">
	import TrendChart from '$lib/components/TrendChart.svelte';

	let { data } = $props();

	const calPoints = $derived(data.dailyTotals.map((d: any) => ({
		y: Math.round(d.totalCalories ?? 0),
		label: d.date?.slice(5) ?? ''
	})));

	const proteinPoints = $derived(data.dailyTotals.map((d: any) => ({
		y: Math.round(d.totalProtein ?? 0),
		label: d.date?.slice(5) ?? ''
	})));

	const carbPoints = $derived(data.dailyTotals.map((d: any) => ({
		y: Math.round(d.totalCarbs ?? 0),
		label: d.date?.slice(5) ?? ''
	})));

	const fatPoints = $derived(data.dailyTotals.map((d: any) => ({
		y: Math.round(d.totalFat ?? 0),
		label: d.date?.slice(5) ?? ''
	})));
</script>

<div class="space-y-6 p-4">
	<header class="flex items-center justify-between">
		<a href="/calories" class="text-[var(--color-text-muted)]">← Back</a>
		<h1 class="text-xl font-bold">Calorie Trends</h1>
		<div></div>
	</header>

	{#if calPoints.length === 0}
		<p class="text-center text-[var(--color-text-muted)]">No data yet. Log some meals to see trends!</p>
	{:else}
		<TrendChart
			points={calPoints}
			title="Calories"
			unit="kcal"
			color="#6366f1"
			targetValue={data.target?.calories ?? null}
			targetLabel="Goal"
			width={350}
			height={200}
		/>

		<TrendChart
			points={proteinPoints}
			title="Protein"
			unit="g"
			color="#22c55e"
			targetValue={data.target?.protein ?? null}
			targetLabel="Goal"
			width={350}
			height={160}
		/>

		<TrendChart
			points={carbPoints}
			title="Carbs"
			unit="g"
			color="#f59e0b"
			targetValue={data.target?.carbs ?? null}
			targetLabel="Goal"
			width={350}
			height={160}
		/>

		<TrendChart
			points={fatPoints}
			title="Fat"
			unit="g"
			color="#ef4444"
			targetValue={data.target?.fat ?? null}
			targetLabel="Goal"
			width={350}
			height={160}
		/>
	{/if}
</div>
