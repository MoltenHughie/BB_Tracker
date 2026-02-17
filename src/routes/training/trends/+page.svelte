<script lang="ts">
	import TrendChart from '$lib/components/TrendChart.svelte';

	let { data } = $props();

	$: weightPoints = data.progressData.map((d) => ({
		y: d.maxWeight,
		label: d.date.slice(5),
	}));

	$: volumePoints = data.progressData.map((d) => ({
		y: d.maxVolume,
		label: d.date.slice(5),
	}));

	function selectExercise(e: Event) {
		const id = (e.target as HTMLSelectElement).value;
		if (id) {
			window.location.href = `/training/trends?exercise=${id}`;
		}
	}
</script>

<div class="space-y-6 p-4">
	<header class="flex items-center justify-between">
		<a href="/training" class="text-[var(--color-text-muted)]">← Back</a>
		<h1 class="text-xl font-bold">Exercise Progress</h1>
		<div></div>
	</header>

	<select
		class="w-full p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-base"
		onchange={selectExercise}
		value={data.selectedExercise ?? ''}
	>
		<option value="">Select an exercise…</option>
		{#each data.exerciseList as ex}
			<option value={ex.id}>{ex.name}</option>
		{/each}
	</select>

	{#if data.progressData.length === 0 && data.selectedExercise}
		<p class="text-center text-[var(--color-text-muted)]">No completed sets for this exercise yet.</p>
	{:else if data.progressData.length > 0}
		<TrendChart
			points={weightPoints}
			title="Max Weight"
			unit="kg"
			color="#6366f1"
			width={350}
			height={200}
		/>

		<TrendChart
			points={volumePoints}
			title="Best Set Volume (weight × reps)"
			unit="kg"
			color="#22c55e"
			width={350}
			height={200}
		/>
	{/if}
</div>
