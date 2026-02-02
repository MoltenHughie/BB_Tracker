<script lang="ts">
	const today = new Date().toISOString().split('T')[0];
</script>

<div class="space-y-6">
	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">📏 Body</h1>
		<time class="text-[var(--color-text-muted)] text-sm">{today}</time>
	</header>

	<!-- Current stats -->
	<div class="card">
		<h2 class="font-semibold mb-4">Current Stats</h2>
		<div class="grid grid-cols-3 gap-4 text-center">
			<div>
				<div class="text-2xl font-bold">—</div>
				<div class="text-xs text-[var(--color-text-muted)]">Weight (kg)</div>
			</div>
			<div>
				<div class="text-2xl font-bold">—</div>
				<div class="text-xs text-[var(--color-text-muted)]">Body Fat %</div>
			</div>
			<div>
				<div class="text-2xl font-bold">—</div>
				<div class="text-xs text-[var(--color-text-muted)]">Muscle (kg)</div>
			</div>
		</div>
	</div>

	<!-- Quick actions -->
	<div class="grid grid-cols-2 gap-4">
		<button class="card hover:bg-[var(--color-surface-hover)] transition-colors text-left">
			<div class="text-2xl mb-2">⚖️</div>
			<div class="font-semibold">Log Weight</div>
			<div class="text-sm text-[var(--color-text-muted)]">Quick weigh-in</div>
		</button>

		<button class="card hover:bg-[var(--color-surface-hover)] transition-colors text-left">
			<div class="text-2xl mb-2">📸</div>
			<div class="font-semibold">Check-in Photo</div>
			<div class="text-sm text-[var(--color-text-muted)]">Progress pic</div>
		</button>
	</div>

	<!-- Measurements placeholder -->
	<section class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold">Measurements</h2>
			<button class="btn btn-primary text-sm">+ Add</button>
		</div>

		<div class="card text-center text-[var(--color-text-muted)] py-8">
			<p class="text-4xl mb-2">📐</p>
			<p>No measurements recorded</p>
			<p class="text-sm mt-1">Track arms, chest, waist, etc.</p>
		</div>
	</section>

	<!-- Weight chart placeholder -->
	<section class="card">
		<h2 class="text-lg font-semibold mb-3">Weight Trend</h2>
		<div class="h-32 flex items-center justify-center text-[var(--color-text-muted)]">
			<p>No data yet</p>
		</div>
	</section>
</div>
