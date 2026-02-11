<script lang="ts">
	let { data } = $props();

	function sparklinePath(points: { date: string; value: number }[], w: number, h: number): string {
		if (points.length < 2) return '';
		const sorted = [...points].reverse();
		const vals = sorted.map(p => p.value);
		const min = Math.min(...vals) - 0.5;
		const max = Math.max(...vals) + 0.5;
		const range = max - min || 1;
		return sorted.map((p, i) => {
			const x = (i / (sorted.length - 1)) * w;
			const y = h - ((p.value - min) / range) * h;
			return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
		}).join(' ');
	}

	function formatDate(d: string) {
		return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<div class="space-y-4 pb-4">
	<header class="flex items-center gap-3">
		<a href="/body" class="text-xl hover:text-[var(--color-primary)]">‹</a>
		<h1 class="text-2xl font-bold">📐 Measurement Trends</h1>
	</header>

	{#if data.typeData.length > 0}
		{#each data.typeData as item}
			<section class="card">
				<div class="flex items-center justify-between mb-2">
					<h2 class="font-semibold">
						{item.type.icon || '📏'} {item.type.name}
					</h2>
					<div class="text-right">
						<div class="text-lg font-bold">{item.latest} {item.type.unit}</div>
						{#if item.entries >= 2}
							<div class="text-xs {item.change > 0 ? 'text-green-400' : item.change < 0 ? 'text-red-400' : 'text-[var(--color-text-muted)]'}">
								{item.change > 0 ? '+' : ''}{item.change.toFixed(1)} {item.type.unit}
							</div>
						{/if}
					</div>
				</div>
				{#if item.history.length >= 2}
					<svg viewBox="0 0 300 80" class="w-full h-20" preserveAspectRatio="none">
						{#each [0, 0.5, 1] as frac}
							<line x1="0" y1={80 * frac} x2="300" y2={80 * frac} stroke="var(--color-surface-hover)" stroke-width="0.5" />
						{/each}
						<path d={sparklinePath(item.history, 300, 80)} fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					<div class="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
						<span>{formatDate(item.history[item.history.length - 1].date)}</span>
						<span>{item.entries} entries</span>
						<span>{formatDate(item.history[0].date)}</span>
					</div>
				{/if}
			</section>
		{/each}
	{:else}
		<div class="card text-center py-8 text-[var(--color-text-muted)]">
			<p class="text-4xl mb-2">📐</p>
			<p>No measurements logged yet</p>
			<a href="/body" class="text-[var(--color-primary)] text-sm mt-2 inline-block">Log measurements →</a>
		</div>
	{/if}
</div>
