<script lang="ts">
	let { data } = $props();

	const todayFormatted = new Date().toLocaleDateString('en-US', {
		weekday: 'long',
		month: 'short',
		day: 'numeric'
	});

	function formatDuration(seconds: number | null): string {
		if (!seconds) return '';
		const hours = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		if (hours > 0) return `${hours}h ${mins}m`;
		return `${mins}m`;
	}
</script>

<div class="space-y-6">
	<header class="text-center space-y-2">
		<h1 class="text-2xl font-bold">BB Tracker</h1>
		<p class="text-[var(--color-text-muted)]">{todayFormatted}</p>
		{#if data.streak > 0}
			<p class="text-sm">🔥 {data.streak} day streak</p>
		{/if}
	</header>

	<!-- Quick stats cards -->
	<div class="grid grid-cols-2 gap-4">
		<!-- Calories -->
		<a href="/calories" class="card hover:bg-[var(--color-surface-hover)] transition-colors">
			<div class="text-2xl mb-2">🍎</div>
			<div class="text-sm text-[var(--color-text-muted)]">Calories</div>
			<div class="text-xl font-bold">
				{data.calories.eaten}{#if data.calories.target} <span class="text-sm font-normal text-[var(--color-text-muted)]">/ {data.calories.target}</span>{/if}
			</div>
			{#if data.calories.protein > 0}
				<div class="text-xs text-[var(--color-text-muted)] mt-1">
					{data.calories.protein}g protein{#if data.calories.proteinTarget} / {data.calories.proteinTarget}g{/if}
				</div>
			{/if}
			{#if data.calories.target}
				<div class="mt-2 h-1.5 rounded-full bg-[var(--color-bg)] overflow-hidden">
					<div
						class="h-full rounded-full transition-all duration-300 {data.calories.eaten > data.calories.target ? 'bg-red-500' : 'bg-[var(--color-primary)]'}"
						style="width: {Math.min(100, (data.calories.eaten / data.calories.target) * 100)}%"
					></div>
				</div>
			{/if}
		</a>

		<!-- Training -->
		<a href="/training" class="card hover:bg-[var(--color-surface-hover)] transition-colors">
			<div class="text-2xl mb-2">💪</div>
			<div class="text-sm text-[var(--color-text-muted)]">Training</div>
			{#if data.training.active}
				<div class="text-xl font-bold text-[var(--color-primary)]">Active</div>
				<div class="text-xs text-[var(--color-text-muted)] mt-1">
					{data.training.active.name} • {data.training.active.sets} sets
				</div>
			{:else if data.training.todayDone}
				<div class="text-xl font-bold text-green-400">✓ Done</div>
				<div class="text-xs text-[var(--color-text-muted)] mt-1">
					{data.training.todayDone.name}
					{#if data.training.todayDone.duration} • {formatDuration(data.training.todayDone.duration)}{/if}
				</div>
			{:else}
				<div class="text-xl font-bold">Rest day</div>
				<div class="text-xs text-[var(--color-text-muted)] mt-1">No workout yet</div>
			{/if}
		</a>

		<!-- Supplements -->
		<a href="/supplements" class="card hover:bg-[var(--color-surface-hover)] transition-colors">
			<div class="text-2xl mb-2">💊</div>
			<div class="text-sm text-[var(--color-text-muted)]">Supplements</div>
			<div class="text-xl font-bold">
				{data.supplements.taken} <span class="text-sm font-normal text-[var(--color-text-muted)]">/ {data.supplements.total}</span>
			</div>
			{#if data.supplements.total > 0}
				<div class="mt-2 h-1.5 rounded-full bg-[var(--color-bg)] overflow-hidden">
					<div
						class="h-full rounded-full bg-green-500 transition-all duration-300"
						style="width: {Math.min(100, (data.supplements.taken / data.supplements.total) * 100)}%"
					></div>
				</div>
			{/if}
		</a>

		<!-- Body -->
		<a href="/body" class="card hover:bg-[var(--color-surface-hover)] transition-colors">
			<div class="text-2xl mb-2">📏</div>
			<div class="text-sm text-[var(--color-text-muted)]">Body</div>
			{#if data.body.weight}
				<div class="text-xl font-bold">{data.body.weight} kg</div>
				<div class="text-xs text-[var(--color-text-muted)] mt-1">
					{data.body.date === data.today ? 'Today' : new Date(data.body.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
				</div>
			{:else}
				<div class="text-xl font-bold">— kg</div>
				<div class="text-xs text-[var(--color-text-muted)] mt-1">No entries yet</div>
			{/if}
		</a>
	</div>

	<!-- Weekly Overview -->
	{#if data.weeklyCalories.some(d => d.calories > 0)}
		<section class="card">
			<h2 class="text-lg font-semibold mb-3">📅 This Week</h2>
			<div class="flex items-end gap-1 h-32">
				{#each data.weeklyCalories as day}
					{@const maxCal = Math.max(...data.weeklyCalories.map(d => d.calories), data.calorieTarget ?? 1)}
					{@const pct = maxCal > 0 ? (day.calories / maxCal) * 100 : 0}
					{@const isToday = day.date === data.today}
					{@const overTarget = data.calorieTarget ? day.calories > data.calorieTarget : false}
					<div class="flex-1 flex flex-col items-center gap-1">
						{#if day.calories > 0}
							<span class="text-[10px] text-[var(--color-text-muted)]">{day.calories}</span>
						{/if}
						<div class="w-full flex flex-col items-center" style="height: 80px;">
							<div class="flex-1"></div>
							<div
								class="w-full max-w-[28px] rounded-t transition-all duration-300 {overTarget ? 'bg-red-500' : isToday ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-primary)]/60'}"
								style="height: {Math.max(pct > 0 ? 4 : 0, pct * 0.8)}px"
							></div>
						</div>
						{#if day.trained}
							<span class="text-xs">💪</span>
						{/if}
						<span class="text-[10px] {isToday ? 'font-bold text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}">{day.dayLabel}</span>
					</div>
				{/each}
			</div>
			{#if data.calorieTarget}
				<div class="mt-2 flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
					<div class="h-px flex-1 bg-[var(--color-surface-hover)]"></div>
					<span>Target: {data.calorieTarget} kcal</span>
					<div class="h-px flex-1 bg-[var(--color-surface-hover)]"></div>
				</div>
			{/if}
		</section>
	{/if}
</div>
