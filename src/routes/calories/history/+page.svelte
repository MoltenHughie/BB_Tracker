<script lang="ts">
	let { data } = $props();

	function formatDate(dateStr: string): string {
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="space-y-4 pb-4">
	<header class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<a href="/calories" class="text-xl hover:text-[var(--color-primary)]">‹</a>
			<h1 class="text-2xl font-bold">📊 Calorie History</h1>
		</div>
	</header>

	<!-- Averages -->
	<div class="grid grid-cols-2 gap-3">
		<div class="card text-center">
			<div class="text-2xl font-bold">{data.avgCalories}</div>
			<div class="text-sm text-[var(--color-text-muted)]">Avg kcal/day</div>
			{#if data.target}
				<div class="text-xs {data.avgCalories > data.target ? 'text-red-400' : 'text-green-400'}">
					{data.avgCalories > data.target ? '+' : ''}{data.avgCalories - data.target} vs target
				</div>
			{/if}
		</div>
		<div class="card text-center">
			<div class="text-2xl font-bold">{data.avgProtein}g</div>
			<div class="text-sm text-[var(--color-text-muted)]">Avg protein/day</div>
			{#if data.proteinTarget}
				<div class="text-xs {data.avgProtein >= data.proteinTarget ? 'text-green-400' : 'text-red-400'}">
					{data.avgProtein >= data.proteinTarget ? '✓' : `${data.proteinTarget - data.avgProtein}g short`}
				</div>
			{/if}
		</div>
	</div>

	<!-- Daily list -->
	{#if data.days.length > 0}
		<div class="space-y-2">
			{#each data.days as day}
				{@const overTarget = data.target && day.calories > data.target}
				<a href="/calories?date={day.date}" class="card block hover:bg-[var(--color-surface-hover)] transition-colors">
					<div class="flex items-center justify-between">
						<div>
							<div class="font-medium">{formatDate(day.date)}</div>
							<div class="text-xs text-[var(--color-text-muted)]">
								{day.entries} entries • P:{day.protein}g C:{day.carbs}g F:{day.fat}g
							</div>
						</div>
						<div class="text-right">
							<div class="text-lg font-bold {overTarget ? 'text-red-400' : ''}">{day.calories}</div>
							<div class="text-xs text-[var(--color-text-muted)]">kcal</div>
						</div>
					</div>
					{#if data.target}
						<div class="mt-2 h-1.5 rounded-full bg-[var(--color-bg)] overflow-hidden">
							<div
								class="h-full rounded-full transition-all {overTarget ? 'bg-red-500' : 'bg-[var(--color-primary)]'}"
								style="width: {Math.min(100, (day.calories / data.target) * 100)}%"
							></div>
						</div>
					{/if}
				</a>
			{/each}
		</div>
	{:else}
		<div class="card text-center py-8 text-[var(--color-text-muted)]">
			<p class="text-4xl mb-2">🍎</p>
			<p>No entries in this period</p>
		</div>
	{/if}

	<div class="text-center text-xs text-[var(--color-text-muted)]">
		Showing {data.from} → {data.to} ({data.days.length} days with entries)
	</div>
</div>
