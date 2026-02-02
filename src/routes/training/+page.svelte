<script lang="ts">
	const today = new Date().toISOString().split('T')[0];
</script>

<div class="space-y-6">
	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">💪 Training</h1>
		<time class="text-[var(--color-text-muted)] text-sm">{today}</time>
	</header>

	<!-- Quick actions -->
	<div class="grid grid-cols-2 gap-4">
		<button class="card hover:bg-[var(--color-surface-hover)] transition-colors text-left">
			<div class="text-2xl mb-2">▶️</div>
			<div class="font-semibold">Start Workout</div>
			<div class="text-sm text-[var(--color-text-muted)]">Begin a new session</div>
		</button>

		<button class="card hover:bg-[var(--color-surface-hover)] transition-colors text-left">
			<div class="text-2xl mb-2">📋</div>
			<div class="font-semibold">Templates</div>
			<div class="text-sm text-[var(--color-text-muted)]">Manage splits</div>
		</button>
	</div>

	<!-- Recent workouts placeholder -->
	<section class="space-y-4">
		<h2 class="text-lg font-semibold">Recent Workouts</h2>

		<div class="card text-center text-[var(--color-text-muted)] py-8">
			<p class="text-4xl mb-2">🏋️</p>
			<p>No workouts yet</p>
			<p class="text-sm mt-1">Start your first workout to track progress</p>
		</div>
	</section>

	<!-- Weekly overview placeholder -->
	<section class="card">
		<h2 class="text-lg font-semibold mb-3">This Week</h2>
		<div class="grid grid-cols-7 gap-1 text-center">
			{#each ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as day}
				<div class="space-y-1">
					<div class="text-xs text-[var(--color-text-muted)]">{day}</div>
					<div class="w-8 h-8 mx-auto rounded-full bg-[var(--color-bg)] flex items-center justify-center text-xs">
						—
					</div>
				</div>
			{/each}
		</div>
	</section>
</div>
