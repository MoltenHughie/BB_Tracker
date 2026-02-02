<script lang="ts">
	const today = new Date().toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'short',
		day: 'numeric'
	});
</script>

<div class="space-y-6">
	<header class="text-center space-y-2">
		<h1 class="text-2xl font-bold">BB Tracker</h1>
		<p class="text-[var(--color-text-muted)]">{today}</p>
	</header>

	<!-- Quick stats cards -->
	<div class="grid grid-cols-2 gap-4">
		<a href="/calories" class="card hover:bg-[var(--color-surface-hover)] transition-colors">
			<div class="text-2xl mb-2">🍎</div>
			<div class="text-sm text-[var(--color-text-muted)]">Calories</div>
			<div class="text-xl font-bold">— / —</div>
		</a>

		<a href="/training" class="card hover:bg-[var(--color-surface-hover)] transition-colors">
			<div class="text-2xl mb-2">💪</div>
			<div class="text-sm text-[var(--color-text-muted)]">Training</div>
			<div class="text-xl font-bold">No workout</div>
		</a>

		<a href="/supplements" class="card hover:bg-[var(--color-surface-hover)] transition-colors">
			<div class="text-2xl mb-2">💊</div>
			<div class="text-sm text-[var(--color-text-muted)]">Supplements</div>
			<div class="text-xl font-bold">0 / 0</div>
		</a>

		<a href="/body" class="card hover:bg-[var(--color-surface-hover)] transition-colors">
			<div class="text-2xl mb-2">📏</div>
			<div class="text-sm text-[var(--color-text-muted)]">Body</div>
			<div class="text-xl font-bold">— kg</div>
		</a>
	</div>

	<div class="card">
		<h2 class="text-lg font-semibold mb-2">Getting Started</h2>
		<p class="text-[var(--color-text-muted)] text-sm">
			Use the navigation below to track your calories, training, supplements, and body measurements.
			All data is stored locally on your device.
		</p>
	</div>
</div>
