<script lang="ts">
	const today = new Date().toISOString().split('T')[0];
</script>

<div class="space-y-6">
	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">🍎 Calories</h1>
		<time class="text-[var(--color-text-muted)] text-sm">{today}</time>
	</header>

	<!-- Daily summary -->
	<div class="card">
		<div class="grid grid-cols-4 gap-2 text-center">
			<div>
				<div class="text-2xl font-bold">—</div>
				<div class="text-xs text-[var(--color-text-muted)]">Eaten</div>
			</div>
			<div>
				<div class="text-2xl font-bold">—</div>
				<div class="text-xs text-[var(--color-text-muted)]">Target</div>
			</div>
			<div>
				<div class="text-2xl font-bold">—</div>
				<div class="text-xs text-[var(--color-text-muted)]">Remaining</div>
			</div>
			<div>
				<div class="text-2xl font-bold">—g</div>
				<div class="text-xs text-[var(--color-text-muted)]">Protein</div>
			</div>
		</div>
	</div>

	<!-- Meals list placeholder -->
	<section class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold">Meals</h2>
			<button class="btn btn-primary text-sm">+ Add Food</button>
		</div>

		<div class="card text-center text-[var(--color-text-muted)] py-8">
			<p class="text-4xl mb-2">🍽️</p>
			<p>No meals logged today</p>
			<p class="text-sm mt-1">Tap "Add Food" to get started</p>
		</div>
	</section>

	<!-- Macros breakdown placeholder -->
	<section class="card">
		<h2 class="text-lg font-semibold mb-3">Macros</h2>
		<div class="space-y-3">
			{#each ['Protein', 'Carbs', 'Fat'] as macro}
				<div>
					<div class="flex justify-between text-sm mb-1">
						<span>{macro}</span>
						<span class="text-[var(--color-text-muted)]">—g / —g</span>
					</div>
					<div class="h-2 bg-[var(--color-bg)] rounded-full overflow-hidden">
						<div class="h-full bg-[var(--color-primary)] w-0 rounded-full transition-all"></div>
					</div>
				</div>
			{/each}
		</div>
	</section>
</div>
