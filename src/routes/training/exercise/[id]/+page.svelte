<script lang="ts">
	let { data } = $props();
	const weightUnit = $derived(() => (data as any).unitSystem === 'imperial' ? 'lbs' : 'kg');

	function formatDate(dateStr: string): string {
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<div class="space-y-6 pb-4">
	<header class="space-y-2">
		<div class="flex items-center gap-3">
			<a href="/training" class="text-xl hover:text-[var(--color-primary)]">‹</a>
			<div>
				<h1 class="text-2xl font-bold">{data.exercise.name}</h1>
				<p class="text-sm text-[var(--color-text-muted)] capitalize">{data.exercise.category || 'Uncategorized'}{#if data.exercise.muscleGroups} • {data.exercise.muscleGroups}{/if}</p>
			</div>
		</div>
	</header>

	<!-- PRs -->
	{#if data.prs.length > 0}
		<div class="card">
			<h2 class="text-sm font-semibold mb-2">🏆 Personal Records</h2>
			<div class="grid grid-cols-2 gap-3">
				{#each data.prs as pr}
					<div class="bg-[var(--color-bg)] rounded-lg p-3 text-center">
						<div class="text-xl font-bold">{pr.value}{pr.recordType === '1rm' ? ` ${weightUnit()}` : ''}</div>
						<div class="text-xs text-[var(--color-text-muted)] capitalize">{pr.recordType === '1rm' ? 'Est. 1RM' : pr.recordType}</div>
						<div class="text-xs text-[var(--color-text-muted)]">{formatDate(pr.date)}</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- 1RM Progress Chart -->
	{#if data.oneRmHistory.length >= 2}
		{@const maxVal = Math.max(...data.oneRmHistory.map(d => d.estimated1rm))}
		{@const minVal = Math.min(...data.oneRmHistory.filter(d => d.estimated1rm > 0).map(d => d.estimated1rm))}
		{@const range = Math.max(maxVal - minVal, 1)}
		<div class="card">
			<h2 class="text-sm font-semibold mb-3">📈 Estimated 1RM Progress</h2>
			<div class="flex items-end gap-1 h-32">
				{#each data.oneRmHistory as point, i}
					{@const pct = point.estimated1rm > 0 ? ((point.estimated1rm - minVal) / range) * 80 + 20 : 0}
					<div class="flex-1 flex flex-col items-center gap-0.5">
						{#if point.estimated1rm > 0}
							<span class="text-[9px] text-[var(--color-text-muted)]">{point.estimated1rm}</span>
						{/if}
						<div class="w-full flex flex-col items-center" style="height: 90px;">
							<div class="flex-1"></div>
							<div
								class="w-full max-w-[20px] rounded-t bg-[var(--color-primary)] transition-all duration-300"
								style="height: {point.estimated1rm > 0 ? Math.max(4, pct * 0.9) : 0}px"
							></div>
						</div>
						<span class="text-[9px] text-[var(--color-text-muted)]">{formatDate(point.date)}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Volume History -->
	{#if data.oneRmHistory.length >= 2}
		{@const maxVol = Math.max(...data.oneRmHistory.map(d => d.totalVolume))}
		<div class="card">
			<h2 class="text-sm font-semibold mb-3">📊 Session Volume</h2>
			<div class="flex items-end gap-1 h-24">
				{#each data.oneRmHistory as point}
					{@const pct = maxVol > 0 ? (point.totalVolume / maxVol) * 100 : 0}
					<div class="flex-1 flex flex-col items-center gap-0.5">
						<div class="w-full flex flex-col items-center" style="height: 70px;">
							<div class="flex-1"></div>
							<div
								class="w-full max-w-[20px] rounded-t bg-purple-500/70 transition-all duration-300"
								style="height: {point.totalVolume > 0 ? Math.max(4, pct * 0.7) : 0}px"
							></div>
						</div>
						<span class="text-[9px] text-[var(--color-text-muted)]">{formatDate(point.date)}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Session History -->
	<section class="space-y-3">
		<h2 class="text-lg font-semibold">History ({data.sessions.length} sessions)</h2>
		{#each data.sessions as session}
			<div class="card">
				<div class="flex items-center justify-between mb-2">
					<span class="font-medium">{formatDate(session.date)}</span>
					{#if session.name}
						<span class="text-sm text-[var(--color-text-muted)]">{session.name}</span>
					{/if}
				</div>
				<div class="space-y-1">
					{#each session.sets as set}
						<div class="flex items-center gap-3 text-sm">
							<span class="text-[var(--color-text-muted)] w-6">#{set.setNumber}</span>
							<span class="font-mono">
								{#if set.weight}{set.weight}{weightUnit()}{/if}
								{#if set.weight && set.reps} × {/if}
								{#if set.reps}{set.reps} reps{/if}
							</span>
							{#if set.rpe}
								<span class="text-xs text-[var(--color-text-muted)]">RPE {set.rpe}</span>
							{/if}
							{#if set.setType && set.setType !== 'working'}
								<span class="text-xs px-1.5 py-0.5 bg-[var(--color-bg)] rounded capitalize">{set.setType}</span>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/each}
		{#if data.sessions.length === 0}
			<div class="card text-center py-8 text-[var(--color-text-muted)]">
				<p class="text-4xl mb-2">📋</p>
				<p>No history yet for this exercise</p>
			</div>
		{/if}
	</section>
</div>
