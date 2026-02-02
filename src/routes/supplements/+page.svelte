<script lang="ts">
	const today = new Date().toISOString().split('T')[0];
</script>

<div class="space-y-6">
	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">💊 Supplements</h1>
		<time class="text-[var(--color-text-muted)] text-sm">{today}</time>
	</header>

	<!-- Today's schedule -->
	<div class="card">
		<div class="flex items-center justify-between mb-4">
			<h2 class="font-semibold">Today's Schedule</h2>
			<span class="text-[var(--color-text-muted)] text-sm">0 / 0 taken</span>
		</div>

		<div class="text-center text-[var(--color-text-muted)] py-4">
			<p class="text-4xl mb-2">📋</p>
			<p>No supplements scheduled</p>
		</div>
	</div>

	<!-- Quick actions -->
	<div class="grid grid-cols-2 gap-4">
		<button class="card hover:bg-[var(--color-surface-hover)] transition-colors text-left">
			<div class="text-2xl mb-2">➕</div>
			<div class="font-semibold">Add Supplement</div>
			<div class="text-sm text-[var(--color-text-muted)]">New supp or med</div>
		</button>

		<button class="card hover:bg-[var(--color-surface-hover)] transition-colors text-left">
			<div class="text-2xl mb-2">⏰</div>
			<div class="font-semibold">Schedules</div>
			<div class="text-sm text-[var(--color-text-muted)]">Timing & doses</div>
		</button>
	</div>

	<!-- Supplement list placeholder -->
	<section class="space-y-4">
		<h2 class="text-lg font-semibold">All Supplements</h2>

		<div class="card text-center text-[var(--color-text-muted)] py-8">
			<p class="text-4xl mb-2">💊</p>
			<p>No supplements added yet</p>
			<p class="text-sm mt-1">Add your supplements, meds, or PEDs to track</p>
		</div>
	</section>
</div>
