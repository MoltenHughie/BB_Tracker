<script lang="ts">
	let { data } = $props();

	function formatDuration(seconds: number | null): string {
		if (!seconds) return '—';
		const h = Math.floor(seconds / 3600);
		const m = Math.floor((seconds % 3600) / 60);
		if (h > 0) return `${h}h ${m}m`;
		return `${m}m`;
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatVolume(kg: number): string {
		if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t`;
		return `${kg} kg`;
	}
</script>

<div class="space-y-4 pb-4">
	<header class="flex items-center justify-between">
		<div class="flex items-center gap-3">
			<a href="/training" class="text-xl hover:text-[var(--color-primary)]">‹</a>
			<h1 class="text-2xl font-bold">📋 Workout History</h1>
		</div>
		<span class="text-sm text-[var(--color-text-muted)]">{data.total} workouts</span>
	</header>

	{#if data.workouts.length > 0}
		<div class="space-y-3">
			{#each data.workouts as workout}
				<div class="card">
					<div class="flex items-center justify-between mb-2">
						<div>
							<h3 class="font-semibold">{workout.name || 'Workout'}</h3>
							<div class="text-sm text-[var(--color-text-muted)]">{formatDate(workout.date)}</div>
						</div>
						<div class="text-right text-sm text-[var(--color-text-muted)]">
							{formatDuration(workout.durationSeconds)}
						</div>
					</div>
					<div class="flex gap-4 text-xs text-[var(--color-text-muted)]">
						<span>💪 {workout.exerciseCount} exercises</span>
						<span>📊 {workout.setCount} sets</span>
						{#if workout.totalVolume > 0}
							<span>🏋️ {formatVolume(workout.totalVolume)}</span>
						{/if}
					</div>
					{#if workout.notes}
						<div class="text-xs text-[var(--color-text-muted)] mt-2 italic">{workout.notes}</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Pagination -->
		{#if data.totalPages > 1}
			<div class="flex items-center justify-center gap-4">
				{#if data.page > 1}
					<a href="/training/history?page={data.page - 1}" class="btn btn-secondary text-sm px-4 py-2">← Prev</a>
				{/if}
				<span class="text-sm text-[var(--color-text-muted)]">Page {data.page} of {data.totalPages}</span>
				{#if data.page < data.totalPages}
					<a href="/training/history?page={data.page + 1}" class="btn btn-secondary text-sm px-4 py-2">Next →</a>
				{/if}
			</div>
		{/if}
	{:else}
		<div class="card text-center py-8 text-[var(--color-text-muted)]">
			<p class="text-4xl mb-2">🏋️</p>
			<p>No completed workouts yet</p>
			<a href="/training" class="text-[var(--color-primary)] text-sm mt-2 inline-block">Start a workout →</a>
		</div>
	{/if}
</div>
