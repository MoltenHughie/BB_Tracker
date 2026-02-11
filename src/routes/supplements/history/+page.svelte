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
			<a href="/supplements" class="text-xl hover:text-[var(--color-primary)]">‹</a>
			<h1 class="text-2xl font-bold">📋 Supplement History</h1>
		</div>
	</header>

	<!-- Per-supplement adherence -->
	{#if data.suppStats.length > 0}
		<section class="card">
			<h2 class="text-lg font-semibold mb-3">30-Day Adherence</h2>
			<div class="space-y-2">
				{#each data.suppStats as stat}
					<div class="flex items-center justify-between">
						<div>
							<span class="font-medium">{stat.name}</span>
							{#if stat.category}
								<span class="text-xs text-[var(--color-text-muted)] ml-1">({stat.category})</span>
							{/if}
						</div>
						<div class="flex items-center gap-2">
							<div class="w-20 h-2 rounded-full bg-[var(--color-bg)] overflow-hidden">
								<div class="h-full rounded-full bg-green-500" style="width: {Math.min(100, (stat.daysTaken / 30) * 100)}%"></div>
							</div>
							<span class="text-sm text-[var(--color-text-muted)] w-12 text-right">{stat.daysTaken}/30</span>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Daily logs -->
	{#if data.days.length > 0}
		<div class="space-y-2">
			{#each data.days as day}
				<a href="/supplements?date={day.date}" class="card block hover:bg-[var(--color-surface-hover)] transition-colors">
					<div class="flex items-center justify-between mb-1">
						<span class="font-medium">{formatDate(day.date)}</span>
						<span class="text-sm text-[var(--color-text-muted)]">{day.count} taken</span>
					</div>
					<div class="text-xs text-[var(--color-text-muted)]">
						{day.items.map(i => i.supplement).join(', ')}
					</div>
				</a>
			{/each}
		</div>
	{:else}
		<div class="card text-center py-8 text-[var(--color-text-muted)]">
			<p class="text-4xl mb-2">💊</p>
			<p>No supplement logs yet</p>
		</div>
	{/if}
</div>
