<script lang="ts">
	import { enhance } from '$app/forms';
	
	let { data } = $props();
	
	// Modal states
	let showWeightModal = $state(false);
	let showMeasurementModal = $state(false);
	let showCompositionModal = $state(false);
	let showHistoryModal = $state(false);
	let showAddTypeModal = $state(false);
	let showGoalModal = $state(false);
	
	// Active tab
	let activeTab = $state<'weight' | 'measurements' | 'composition' | 'photos'>('weight');
	let showPhotoModal = $state(false);
	let compareMode = $state(false);
	let comparePhotos = $state<number[]>([]);
	
	// Form states
	let weightValue = $state<number | null>(null);
	let weightTime = $state('');
	let weightCondition = $state('');
	let weightNotes = $state('');
	
	let selectedMeasureType = $state<number | null>(null);
	let measureValue = $state<number | null>(null);
	
	let compBodyFat = $state<number | null>(null);
	let compMuscleMass = $state<number | null>(null);
	let compBoneMass = $state<number | null>(null);
	let compWater = $state<number | null>(null);
	let compMethod = $state('scale');

	// Keep defaults in sync with loaded data (but don't clobber user edits while modals are open)
	$effect(() => {
		if (!showWeightModal) {
			weightValue = data.latestWeight?.weight ?? null;
		}
	});

	$effect(() => {
		if (!showCompositionModal) {
			compBodyFat = data.latestComposition?.bodyFatPercent ?? null;
			compMuscleMass = data.latestComposition?.muscleMassKg ?? null;
		}
	});
	
	// Computed
	const weightChange = $derived(() => {
		if (!data.latestWeight || data.weights.length < 2) return null;
		const oldest = data.weights[data.weights.length - 1];
		return data.latestWeight.weight - oldest.weight;
	});
	
	const weeklyAvg = $derived(() => {
		if (data.recentAvg === null) return null;
		return Math.round(data.recentAvg * 10) / 10;
	});
	
	const trendDirection = $derived(() => {
		if (data.weightTrend === null) return 'stable';
		if (data.weightTrend > 0.3) return 'up';
		if (data.weightTrend < -0.3) return 'down';
		return 'stable';
	});
	
	const trendEmoji = $derived(() => {
		switch (trendDirection()) {
			case 'up': return '📈';
			case 'down': return '📉';
			default: return '➡️';
		}
	});
	
	// Helper functions
	function formatWeight(kg: number): string {
		return `${kg.toFixed(1)} kg`;
	}
	
	function formatTrend(change: number): string {
		const sign = change >= 0 ? '+' : '';
		return `${sign}${change.toFixed(1)} kg`;
	}
	
	function formatDate(dateStr: string): string {
		const d = new Date(dateStr);
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
	
	function getMeasurementIcon(name: string): string {
		const icons: Record<string, string> = {
			'chest': '🫁',
			'waist': '⭕',
			'hips': '🍑',
			'biceps': '💪',
			'thighs': '🦵',
			'calves': '🦶',
			'neck': '🦒',
			'shoulders': '🤷',
			'forearms': '💪'
		};
		const lowerName = name.toLowerCase();
		for (const [key, icon] of Object.entries(icons)) {
			if (lowerName.includes(key)) return icon;
		}
		return '📏';
	}
	
	let goalInput = $state<number | null>(null);
	$effect(() => {
		if (!showGoalModal) goalInput = data.weightGoal;
	});

	// Sparkline path helper for measurement history
	function sparklinePath(points: { date: string; value: number }[], w: number, h: number): string {
		if (points.length < 2) return '';
		const sorted = [...points].reverse(); // oldest first
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
	
	function resetWeightForm() {
		weightValue = data.latestWeight?.weight ?? null;
		weightTime = '';
		weightCondition = '';
		weightNotes = '';
	}
	
	function resetMeasurementForm() {
		selectedMeasureType = null;
		measureValue = null;
	}
</script>

<div class="space-y-6 pb-4">
	<header class="space-y-2">
		<div class="flex items-center justify-between">
			<h1 class="text-2xl font-bold">📏 Body</h1>
			<button 
				onclick={() => showHistoryModal = true}
				class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
			>
				📊 History
			</button>
		</div>
		<div class="flex items-center justify-center gap-4">
			<button onclick={() => { const d = new Date(data.date); d.setDate(d.getDate() - 1); window.location.href = `/body?date=${d.toISOString().split('T')[0]}`; }} class="text-xl px-2 hover:text-[var(--color-primary)]">‹</button>
			<button 
				onclick={() => { const today = new Date().toISOString().split('T')[0]; if (data.date !== today) window.location.href = '/body'; }}
				class="text-sm font-medium {data.date === new Date().toISOString().split('T')[0] ? 'text-[var(--color-primary)]' : 'hover:text-[var(--color-primary)]'}"
			>
				{data.date === new Date().toISOString().split('T')[0] ? 'Today' : data.date}
			</button>
			<button 
				onclick={() => { const d = new Date(data.date); d.setDate(d.getDate() + 1); window.location.href = `/body?date=${d.toISOString().split('T')[0]}`; }}
				class="text-xl px-2 hover:text-[var(--color-primary)] {data.date === new Date().toISOString().split('T')[0] ? 'opacity-30 pointer-events-none' : ''}"
				disabled={data.date === new Date().toISOString().split('T')[0]}
			>›</button>
		</div>
	</header>

	<!-- Tab navigation -->
	<div class="flex gap-2">
		{#each [
			{ key: 'weight', label: 'Weight', icon: '⚖️' },
			{ key: 'measurements', label: 'Measurements', icon: '📐' },
			{ key: 'composition', label: 'Composition', icon: '🔬' },
			{ key: 'photos', label: 'Photos', icon: '📸' }
		] as tab}
			<button
				onclick={() => activeTab = tab.key as typeof activeTab}
				class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors {activeTab === tab.key
					? 'bg-[var(--color-primary)] text-white'
					: 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'}"
			>
				{tab.icon} {tab.label}
			</button>
		{/each}
	</div>

	{#if activeTab === 'weight'}
		<!-- WEIGHT TAB -->
		
		<!-- Current weight card -->
		<div class="card">
			<div class="flex items-center justify-between">
				<div>
					<div class="text-4xl font-bold">
						{data.latestWeight ? formatWeight(data.latestWeight.weight) : '—'}
					</div>
					<div class="text-sm text-[var(--color-text-muted)] mt-1">
						{#if data.latestWeight}
							Last weighed {formatDate(data.latestWeight.date)}
						{:else}
							No weight logged yet
						{/if}
					</div>
				</div>
				<button 
					onclick={() => { resetWeightForm(); showWeightModal = true; }}
					class="btn btn-primary"
				>
					{data.latestWeight ? 'Update' : 'Log Weight'}
				</button>
			</div>
		</div>
		
		<!-- Weight goal -->
		{#if data.weightGoal && data.latestWeight}
			{@const current = data.latestWeight.weight}
			{@const goal = data.weightGoal}
			{@const diff = current - goal}
			{@const startWeight = data.weights.length > 0 ? data.weights[data.weights.length - 1].weight : current}
			{@const totalRange = Math.abs(startWeight - goal)}
			{@const progress = totalRange > 0 ? Math.min(1, Math.max(0, 1 - Math.abs(diff) / totalRange)) : (diff === 0 ? 1 : 0)}
			<div class="card">
				<div class="flex items-center justify-between mb-2">
					<span class="text-sm font-medium">🎯 Goal: {goal.toFixed(1)} kg</span>
					<button onclick={() => { goalInput = data.weightGoal; showGoalModal = true; }} class="text-xs text-[var(--color-text-muted)]">Edit</button>
				</div>
				<div class="w-full h-3 bg-[var(--color-bg)] rounded-full overflow-hidden">
					<div class="h-full bg-[var(--color-primary)] rounded-full transition-all" style="width: {(progress * 100).toFixed(1)}%"></div>
				</div>
				<div class="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
					<span>{diff > 0 ? `${diff.toFixed(1)} kg to lose` : diff < 0 ? `${(-diff).toFixed(1)} kg to gain` : '🎉 Goal reached!'}</span>
					<span>{(progress * 100).toFixed(0)}%</span>
				</div>
			</div>
		{:else if !data.weightGoal}
			<button onclick={() => { goalInput = null; showGoalModal = true; }} class="card w-full text-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
				🎯 Set a weight goal
			</button>
		{/if}

		<!-- Stats row -->
		{#if data.weights.length > 0}
			<div class="grid grid-cols-3 gap-3">
				<div class="card text-center">
					<div class="text-xl font-bold">{trendEmoji()}</div>
					<div class="text-sm text-[var(--color-text-muted)]">Trend</div>
					{#if data.weightTrend !== null}
						<div class="text-xs {data.weightTrend > 0 ? 'text-red-400' : data.weightTrend < 0 ? 'text-green-400' : ''}">
							{formatTrend(data.weightTrend)}
						</div>
					{/if}
				</div>
				<div class="card text-center">
					<div class="text-xl font-bold">{weeklyAvg() ?? '—'}</div>
					<div class="text-sm text-[var(--color-text-muted)]">7d Avg</div>
				</div>
				<div class="card text-center">
					<div class="text-xl font-bold">
						{#if weightChange() !== null}
							{formatTrend(weightChange()!)}
						{:else}
							—
						{/if}
					</div>
					<div class="text-sm text-[var(--color-text-muted)]">Total</div>
				</div>
			</div>
		{/if}
		
		<!-- Weight chart -->
		{#if data.weights.length >= 3}
			{@const chartWeights = [...data.weights].reverse()}
			{@const minW = Math.min(...chartWeights.map(w => w.weight)) - 0.5}
			{@const maxW = Math.max(...chartWeights.map(w => w.weight)) + 0.5}
			{@const range = maxW - minW || 1}
			{@const width = 300}
			{@const height = 100}
			{@const points = chartWeights.map((w, i) => ({
				x: (i / (chartWeights.length - 1)) * width,
				y: height - ((w.weight - minW) / range) * height
			}))}
			{@const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')}
			<section class="card">
				<h2 class="text-lg font-semibold mb-2">Weight Trend</h2>
				<svg viewBox="0 0 {width} {height}" class="w-full h-24" preserveAspectRatio="none">
					<!-- Grid lines -->
					{#each [0, 0.25, 0.5, 0.75, 1] as frac}
						<line x1="0" y1={height * frac} x2={width} y2={height * frac} stroke="var(--color-surface-hover)" stroke-width="0.5" />
					{/each}
					<!-- Line -->
					<path d={pathD} fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
					<!-- Dots -->
					{#each points as p}
						<circle cx={p.x} cy={p.y} r="3" fill="var(--color-primary)" />
					{/each}
				</svg>
				<div class="flex justify-between text-xs text-[var(--color-text-muted)] mt-1">
					<span>{chartWeights[0]?.date ? formatDate(chartWeights[0].date) : ''}</span>
					<span>{formatWeight(minW)} – {formatWeight(maxW)}</span>
					<span>{chartWeights[chartWeights.length - 1]?.date ? formatDate(chartWeights[chartWeights.length - 1].date) : ''}</span>
				</div>
			</section>
		{/if}

		<!-- Weight history -->
		{#if data.weights.length > 0}
			<section class="card">
				<h2 class="text-lg font-semibold mb-3">Recent History</h2>
				<div class="space-y-2 max-h-60 overflow-y-auto">
					{#each data.weights.slice(0, 10) as entry}
						<div class="flex items-center justify-between py-2 border-b border-[var(--color-surface-hover)] last:border-0">
							<div>
								<div class="font-medium">{formatWeight(entry.weight)}</div>
								<div class="text-sm text-[var(--color-text-muted)]">
									{formatDate(entry.date)}
									{#if entry.time}
										@ {entry.time}
									{/if}
									{#if entry.condition}
										• {entry.condition}
									{/if}
								</div>
							</div>
							<form method="POST" action="?/deleteWeight" use:enhance>
								<input type="hidden" name="weightId" value={entry.id} />
								<button type="submit" class="text-red-400 hover:text-red-300 text-sm">×</button>
							</form>
						</div>
					{/each}
				</div>
			</section>
		{/if}

	{:else if activeTab === 'measurements'}
		<!-- MEASUREMENTS TAB -->
		
		<!-- Quick log card -->
		<div class="card">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-semibold">Log Measurement</h2>
				<button 
					onclick={() => showAddTypeModal = true}
					class="text-[var(--color-primary)] text-sm"
				>
					+ Add Type
				</button>
			</div>
			
			{#if data.measureTypes.length > 0}
				<div class="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
					{#each data.measureTypes as type}
						{@const latest = data.latestMeasurements[type.id]}
						{@const history = data.measurementHistory[type.id]}
						<button 
							onclick={() => {
								selectedMeasureType = type.id;
								measureValue = latest?.value ?? null;
								showMeasurementModal = true;
							}}
							class="p-3 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] text-left transition-colors"
						>
							<div class="flex items-center gap-2">
								<span>{type.icon || getMeasurementIcon(type.name)}</span>
								<span class="font-medium truncate">{type.name}</span>
							</div>
							<div class="text-sm text-[var(--color-text-muted)] mt-1">
								{#if latest}
									{latest.value} {type.unit}
								{:else}
									—
								{/if}
							</div>
							{#if history && history.length >= 2}
								<svg viewBox="0 0 80 20" class="w-full h-5 mt-1" preserveAspectRatio="none">
									<path d={sparklinePath(history, 80, 20)} fill="none" stroke="var(--color-primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
							{/if}
						</button>
					{/each}
				</div>
			{:else}
				<p class="text-center text-[var(--color-text-muted)] py-4">
					No measurement types defined.
					<button 
						onclick={() => showAddTypeModal = true}
						class="text-[var(--color-primary)]"
					>
						Add one
					</button>
				</p>
			{/if}
		</div>
		
		<!-- Today's measurements -->
		{#if data.todayMeasurements.length > 0}
			<section class="card">
				<h2 class="text-lg font-semibold mb-3">Today's Log</h2>
				<div class="space-y-2">
					{#each data.todayMeasurements as m}
						<div class="flex items-center justify-between py-2 border-b border-[var(--color-surface-hover)] last:border-0">
							<div class="flex items-center gap-2">
								<span>{m.measurementType?.icon || getMeasurementIcon(m.measurementType?.name ?? '')}</span>
								<span>{m.measurementType?.name}</span>
							</div>
							<div class="flex items-center gap-3">
								<span class="font-medium">{m.value} {m.measurementType?.unit}</span>
								<form method="POST" action="?/deleteMeasurement" use:enhance>
									<input type="hidden" name="measurementId" value={m.id} />
									<button type="submit" class="text-red-400 hover:text-red-300 text-sm">×</button>
								</form>
							</div>
						</div>
					{/each}
				</div>
			</section>
		{/if}

	{:else if activeTab === 'composition'}
		<!-- COMPOSITION TAB -->
		
		<!-- Current composition -->
		<div class="card">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-lg font-semibold">Body Composition</h2>
				<button 
					onclick={() => showCompositionModal = true}
					class="btn btn-secondary text-sm"
				>
					{data.latestComposition ? 'Update' : 'Log'}
				</button>
			</div>
			
			{#if data.latestComposition}
				<div class="grid grid-cols-2 gap-4">
					{#if data.latestComposition.bodyFatPercent}
						<div class="text-center">
							<div class="text-2xl font-bold">{data.latestComposition.bodyFatPercent}%</div>
							<div class="text-sm text-[var(--color-text-muted)]">Body Fat</div>
						</div>
					{/if}
					{#if data.latestComposition.muscleMassKg}
						<div class="text-center">
							<div class="text-2xl font-bold">{data.latestComposition.muscleMassKg} kg</div>
							<div class="text-sm text-[var(--color-text-muted)]">Muscle Mass</div>
						</div>
					{/if}
					{#if data.latestComposition.waterPercent}
						<div class="text-center">
							<div class="text-2xl font-bold">{data.latestComposition.waterPercent}%</div>
							<div class="text-sm text-[var(--color-text-muted)]">Water</div>
						</div>
					{/if}
					{#if data.latestComposition.boneMassKg}
						<div class="text-center">
							<div class="text-2xl font-bold">{data.latestComposition.boneMassKg} kg</div>
							<div class="text-sm text-[var(--color-text-muted)]">Bone Mass</div>
						</div>
					{/if}
				</div>
				<div class="text-xs text-[var(--color-text-muted)] text-center mt-3">
					{formatDate(data.latestComposition.date)}
					{#if data.latestComposition.method}
						• via {data.latestComposition.method}
					{/if}
				</div>
			{:else}
				<p class="text-center text-[var(--color-text-muted)] py-4">
					No composition data yet. Log your first entry!
				</p>
			{/if}
		</div>
		
		<!-- Composition trend chart -->
		{#if data.compositionHistory.length >= 3}
			{@const sorted = [...data.compositionHistory].reverse()}
			{@const bfPoints = sorted.filter(e => e.bodyFatPercent != null).map(e => ({ date: e.date, value: e.bodyFatPercent! }))}
			{@const mmPoints = sorted.filter(e => e.muscleMassKg != null).map(e => ({ date: e.date, value: e.muscleMassKg! }))}
			{#if bfPoints.length >= 2 || mmPoints.length >= 2}
				<section class="card">
					<h2 class="text-lg font-semibold mb-2">Composition Trend</h2>
					<div class="space-y-3">
						{#if bfPoints.length >= 2}
							<div>
								<div class="text-xs text-[var(--color-text-muted)] mb-1">Body Fat %</div>
								<svg viewBox="0 0 300 60" class="w-full h-16" preserveAspectRatio="none">
									{#each [0, 0.5, 1] as frac}
										<line x1="0" y1={60 * frac} x2="300" y2={60 * frac} stroke="var(--color-surface-hover)" stroke-width="0.5" />
									{/each}
									<path d={sparklinePath(bfPoints, 300, 60)} fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
								<div class="flex justify-between text-xs text-[var(--color-text-muted)]">
									<span>{bfPoints[0]?.value}%</span>
									<span>{bfPoints[bfPoints.length - 1]?.value}%</span>
								</div>
							</div>
						{/if}
						{#if mmPoints.length >= 2}
							<div>
								<div class="text-xs text-[var(--color-text-muted)] mb-1">Muscle Mass (kg)</div>
								<svg viewBox="0 0 300 60" class="w-full h-16" preserveAspectRatio="none">
									{#each [0, 0.5, 1] as frac}
										<line x1="0" y1={60 * frac} x2="300" y2={60 * frac} stroke="var(--color-surface-hover)" stroke-width="0.5" />
									{/each}
									<path d={sparklinePath(mmPoints, 300, 60)} fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
								</svg>
								<div class="flex justify-between text-xs text-[var(--color-text-muted)]">
									<span>{mmPoints[0]?.value} kg</span>
									<span>{mmPoints[mmPoints.length - 1]?.value} kg</span>
								</div>
							</div>
						{/if}
					</div>
				</section>
			{/if}
		{/if}

		<!-- Composition history -->
		{#if data.compositionHistory.length > 1}
			<section class="card">
				<h2 class="text-lg font-semibold mb-3">History</h2>
				<div class="space-y-2 max-h-60 overflow-y-auto">
					{#each data.compositionHistory as entry}
						<div class="flex items-center justify-between py-2 border-b border-[var(--color-surface-hover)] last:border-0 text-sm">
							<div class="text-[var(--color-text-muted)]">{formatDate(entry.date)}</div>
							<div class="flex items-center gap-4">
								{#if entry.bodyFatPercent}
									<span>BF: {entry.bodyFatPercent}%</span>
								{/if}
								{#if entry.muscleMassKg}
									<span>MM: {entry.muscleMassKg}kg</span>
								{/if}
							</div>
							<form method="POST" action="?/deleteComposition" use:enhance>
								<input type="hidden" name="compositionId" value={entry.id} />
								<button type="submit" class="text-red-400 hover:text-red-300">×</button>
							</form>
						</div>
					{/each}
				</div>
			</section>
		{/if}
	{:else if activeTab === 'photos'}
		<!-- PHOTOS TAB -->

		<!-- Compare view -->
		{#if compareMode && comparePhotos.length === 2}
			{@const photoA = data.photos.find(p => p.id === comparePhotos[0])}
			{@const photoB = data.photos.find(p => p.id === comparePhotos[1])}
			<section class="card">
				<div class="flex items-center justify-between mb-3">
					<h2 class="text-lg font-semibold">📊 Compare</h2>
					<button onclick={() => { compareMode = false; comparePhotos = []; }} class="text-sm text-[var(--color-text-muted)]">✕ Close</button>
				</div>
				<div class="grid grid-cols-2 gap-2">
					{#if photoA}
						<div>
							<img src="/api/photos/{photoA.filename}" alt="Before" class="w-full aspect-[3/4] object-cover rounded-lg" />
							<div class="text-xs text-center text-[var(--color-text-muted)] mt-1">
								{new Date(photoA.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
							</div>
						</div>
					{/if}
					{#if photoB}
						<div>
							<img src="/api/photos/{photoB.filename}" alt="After" class="w-full aspect-[3/4] object-cover rounded-lg" />
							<div class="text-xs text-center text-[var(--color-text-muted)] mt-1">
								{new Date(photoB.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
							</div>
						</div>
					{/if}
				</div>
			</section>
		{/if}

		<section class="card">
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-lg font-semibold">Check-in Photos</h2>
				<div class="flex gap-2">
					{#if data.photos.length >= 2}
						<button
							onclick={() => { compareMode = !compareMode; comparePhotos = []; }}
							class="text-sm px-3 py-1 rounded-lg transition-colors {compareMode ? 'bg-[var(--color-primary)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
						>
							{compareMode ? '🔍 Selecting...' : '🔍 Compare'}
						</button>
					{/if}
					<button onclick={() => showPhotoModal = true} class="btn btn-secondary text-sm px-3 py-1">
						+ Upload
					</button>
				</div>
			</div>

			{#if compareMode}
				<p class="text-xs text-[var(--color-text-muted)] mb-3">Tap two photos to compare them side by side.</p>
			{/if}
			
			{#if data.photos.length > 0}
				<div class="grid grid-cols-2 gap-3">
					{#each data.photos as photo}
						{@const isSelected = comparePhotos.includes(photo.id)}
						<div class="relative group">
							<button
								onclick={() => {
									if (compareMode) {
										if (isSelected) {
											comparePhotos = comparePhotos.filter(id => id !== photo.id);
										} else if (comparePhotos.length < 2) {
											comparePhotos = [...comparePhotos, photo.id];
										}
									}
								}}
								class="w-full text-left"
								disabled={!compareMode}
							>
								<img
									src="/api/photos/{photo.filename}"
									alt="{photo.pose || 'Check-in'} - {photo.date}"
									class="w-full aspect-[3/4] object-cover rounded-lg transition-all {compareMode && isSelected ? 'ring-2 ring-[var(--color-primary)] brightness-110' : ''} {compareMode && !isSelected && comparePhotos.length >= 2 ? 'opacity-40' : ''}"
									loading="lazy"
								/>
							</button>
							<div class="absolute bottom-0 left-0 right-0 bg-black/60 p-2 rounded-b-lg pointer-events-none">
								<div class="text-xs text-white">
									{new Date(photo.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
								</div>
								{#if photo.pose}
									<div class="text-xs text-white/70 capitalize">{photo.pose.replace('_', ' ')}</div>
								{/if}
							</div>
							{#if compareMode && isSelected}
								<div class="absolute top-2 left-2 w-6 h-6 bg-[var(--color-primary)] rounded-full text-white text-xs flex items-center justify-center font-bold">
									{comparePhotos.indexOf(photo.id) + 1}
								</div>
							{/if}
							{#if !compareMode}
								<form method="POST" action="?/deletePhoto" use:enhance>
									<input type="hidden" name="photoId" value={photo.id} />
									<button
										type="submit"
										class="absolute top-2 right-2 w-6 h-6 bg-red-500/80 rounded-full text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
										onclick={(e) => { if (!confirm('Delete this photo?')) e.preventDefault(); }}
									>
										×
									</button>
								</form>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center text-[var(--color-text-muted)] py-8">
					<p class="text-4xl mb-2">📸</p>
					<p>No check-in photos yet</p>
					<p class="text-sm mt-1">Upload your first progress photo</p>
				</div>
			{/if}
		</section>
	{/if}
	
	<!-- Floating action button -->
	<button
		onclick={() => {
			if (activeTab === 'weight') {
				resetWeightForm();
				showWeightModal = true;
			} else if (activeTab === 'measurements') {
				resetMeasurementForm();
				showMeasurementModal = true;
			} else if (activeTab === 'photos') {
				showPhotoModal = true;
			} else {
				showCompositionModal = true;
			}
		}}
		class="fixed bottom-20 right-4 w-14 h-14 bg-[var(--color-primary)] rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-[var(--color-primary-dark)] transition-colors"
		title="Log"
	>
		+
	</button>
</div>

<!-- Weight Modal -->
{#if showWeightModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Log Weight</h3>
				<button onclick={() => showWeightModal = false} class="text-2xl">×</button>
			</div>
			
			<form 
				method="POST" 
				action="?/logWeight"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showWeightModal = false;
					};
				}}
				class="p-4 space-y-4"
			>
				<input type="hidden" name="date" value={data.date} />
				
				<div>
					<label for="weight" class="block text-sm mb-2">Weight (kg) *</label>
					<input 
						id="weight"
						type="number" 
						name="weight" 
						bind:value={weightValue}
						step="0.1"
						min="20"
						max="300"
						required
						class="input text-2xl text-center"
						placeholder="75.0"
					/>
				</div>
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="weight-time" class="block text-sm mb-2">Time</label>
						<input 
							id="weight-time"
							type="time" 
							name="time" 
							bind:value={weightTime}
							class="input"
						/>
					</div>
					<div>
						<label for="weight-condition" class="block text-sm mb-2">Condition</label>
						<select id="weight-condition" name="condition" bind:value={weightCondition} class="input">
							<option value="">Select...</option>
							<option value="fasted">Fasted (morning)</option>
							<option value="post_meal">Post-meal</option>
							<option value="post_workout">Post-workout</option>
						</select>
					</div>
				</div>
				
				<div>
					<label for="weight-notes" class="block text-sm mb-2">Notes</label>
					<input 
						id="weight-notes"
						type="text" 
						name="notes" 
						bind:value={weightNotes}
						class="input"
						placeholder="Any notes..."
					/>
				</div>
				
				<button type="submit" class="btn btn-primary w-full">
					Save Weight
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- Measurement Modal -->
{#if showMeasurementModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Log Measurement</h3>
				<button onclick={() => showMeasurementModal = false} class="text-2xl">×</button>
			</div>
			
			<form 
				method="POST" 
				action="?/logMeasurement"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showMeasurementModal = false;
						resetMeasurementForm();
					};
				}}
				class="p-4 space-y-4"
			>
				<input type="hidden" name="date" value={data.date} />
				
				<div>
					<label for="measurement-type" class="block text-sm mb-2">Measurement Type *</label>
					<select 
						id="measurement-type"
						name="measurementTypeId" 
						bind:value={selectedMeasureType}
						required
						class="input"
					>
						<option value="">Select...</option>
						{#each data.measureTypes as type}
							<option value={type.id}>
								{type.icon || getMeasurementIcon(type.name)} {type.name}
							</option>
						{/each}
					</select>
				</div>
				
				<div>
					<label for="measurement-value" class="block text-sm mb-2">
						Value 
						{#if selectedMeasureType}
							({data.measureTypes.find(t => t.id === selectedMeasureType)?.unit ?? 'cm'})
						{/if}
						*
					</label>
					<input 
						id="measurement-value"
						type="number" 
						name="value" 
						bind:value={measureValue}
						step="0.1"
						min="0"
						required
						class="input text-xl text-center"
						placeholder="0.0"
					/>
				</div>
				
				<button type="submit" class="btn btn-primary w-full">
					Save Measurement
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- Add Measurement Type Modal -->
{#if showAddTypeModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Add Measurement Type</h3>
				<button onclick={() => showAddTypeModal = false} class="text-2xl">×</button>
			</div>
			
			<form 
				method="POST" 
				action="?/addMeasurementType"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showAddTypeModal = false;
					};
				}}
				class="p-4 space-y-4"
			>
				<div>
					<label for="measurement-type-name" class="block text-sm mb-2">Name *</label>
					<input 
						id="measurement-type-name"
						type="text" 
						name="name" 
						required
						class="input"
						placeholder="e.g., Chest, Biceps (R)"
					/>
				</div>
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="measurement-type-unit" class="block text-sm mb-2">Unit</label>
						<select id="measurement-type-unit" name="unit" class="input">
							<option value="cm">cm</option>
							<option value="inches">inches</option>
						</select>
					</div>
					<div>
						<label for="measurement-type-icon" class="block text-sm mb-2">Icon (emoji)</label>
						<input 
							id="measurement-type-icon"
							type="text" 
							name="icon" 
							class="input"
							placeholder="📏"
							maxlength="2"
						/>
					</div>
				</div>
				
				<button type="submit" class="btn btn-primary w-full">
					Add Type
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- Composition Modal -->
{#if showCompositionModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-y-auto">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Log Body Composition</h3>
				<button onclick={() => showCompositionModal = false} class="text-2xl">×</button>
			</div>
			
			<form 
				method="POST" 
				action="?/logComposition"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showCompositionModal = false;
					};
				}}
				class="p-4 space-y-4"
			>
				<input type="hidden" name="date" value={data.date} />
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="comp-bodyfat" class="block text-sm mb-2">Body Fat %</label>
						<input 
							id="comp-bodyfat"
							type="number" 
							name="bodyFatPercent" 
							bind:value={compBodyFat}
							step="0.1"
							min="1"
							max="60"
							class="input"
							placeholder="15.0"
						/>
					</div>
					<div>
						<label for="comp-muscle" class="block text-sm mb-2">Muscle Mass (kg)</label>
						<input 
							id="comp-muscle"
							type="number" 
							name="muscleMassKg" 
							bind:value={compMuscleMass}
							step="0.1"
							min="10"
							max="100"
							class="input"
							placeholder="65.0"
						/>
					</div>
				</div>
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="comp-water" class="block text-sm mb-2">Water %</label>
						<input 
							id="comp-water"
							type="number" 
							name="waterPercent" 
							bind:value={compWater}
							step="0.1"
							min="30"
							max="80"
							class="input"
							placeholder="55.0"
						/>
					</div>
					<div>
						<label for="comp-bone" class="block text-sm mb-2">Bone Mass (kg)</label>
						<input 
							id="comp-bone"
							type="number" 
							name="boneMassKg" 
							bind:value={compBoneMass}
							step="0.1"
							min="1"
							max="10"
							class="input"
							placeholder="3.5"
						/>
					</div>
				</div>
				
				<div>
					<label for="comp-method" class="block text-sm mb-2">Measurement Method</label>
					<select id="comp-method" name="method" bind:value={compMethod} class="input">
						<option value="scale">Smart Scale</option>
						<option value="caliper">Skinfold Calipers</option>
						<option value="dexa">DEXA Scan</option>
						<option value="estimate">Visual Estimate</option>
					</select>
				</div>
				
				<p class="text-xs text-[var(--color-text-muted)]">
					At least body fat or muscle mass is required.
				</p>
				
				<button type="submit" class="btn btn-primary w-full">
					Save Composition
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- History Modal -->
{#if showHistoryModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Weight History</h3>
				<button onclick={() => showHistoryModal = false} class="text-2xl">×</button>
			</div>
			
			<div class="p-4 space-y-2 overflow-y-auto flex-1">
				{#if data.weights.length > 0}
					{#each data.weights as entry}
						<div class="flex items-center justify-between py-2 border-b border-[var(--color-surface-hover)] last:border-0">
							<div>
								<div class="font-medium">{formatWeight(entry.weight)}</div>
								<div class="text-sm text-[var(--color-text-muted)]">
									{new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
									{#if entry.condition}
										• {entry.condition}
									{/if}
								</div>
							</div>
							<form method="POST" action="?/deleteWeight" use:enhance>
								<input type="hidden" name="weightId" value={entry.id} />
								<button type="submit" class="text-red-400 hover:text-red-300 text-sm">×</button>
							</form>
						</div>
					{/each}
				{:else}
					<p class="text-center text-[var(--color-text-muted)] py-8">No weight entries yet</p>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Weight Goal Modal -->
{#if showGoalModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Weight Goal</h3>
				<button onclick={() => showGoalModal = false} class="text-2xl">×</button>
			</div>
			
			<form 
				method="POST" 
				action="?/setWeightGoal"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showGoalModal = false;
					};
				}}
				class="p-4 space-y-4"
			>
				<div>
					<label for="weight-goal" class="block text-sm mb-2">Target Weight (kg)</label>
					<input 
						id="weight-goal"
						type="number" 
						name="weightGoal" 
						bind:value={goalInput}
						step="0.1"
						min="30"
						max="200"
						class="input text-2xl text-center"
						placeholder="70.0"
					/>
					<p class="text-xs text-[var(--color-text-muted)] mt-1">Leave empty to clear the goal.</p>
				</div>
				
				<button type="submit" class="btn btn-primary w-full">
					{goalInput ? 'Set Goal' : 'Clear Goal'}
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- Photo Upload Modal -->
{#if showPhotoModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Upload Photo</h3>
				<button onclick={() => showPhotoModal = false} class="text-2xl">×</button>
			</div>
			
			<form 
				method="POST" 
				action="?/addPhoto"
				enctype="multipart/form-data"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showPhotoModal = false;
					};
				}}
				class="p-4 space-y-4"
			>
				<input type="hidden" name="date" value={data.date} />
				
				<div>
					<label for="photo-file" class="block text-sm mb-2">Photo *</label>
					<input 
						id="photo-file"
						type="file" 
						name="photo" 
						accept="image/jpeg,image/png,image/webp,image/heic"
						required
						class="input"
					/>
				</div>
				
				<div>
					<label for="photo-pose" class="block text-sm mb-2">Pose (optional)</label>
					<select id="photo-pose" name="pose" class="input">
						<option value="">— Select —</option>
						<option value="front_relaxed">Front (relaxed)</option>
						<option value="front_flexed">Front (flexed)</option>
						<option value="back">Back</option>
						<option value="side_left">Side (left)</option>
						<option value="side_right">Side (right)</option>
					</select>
				</div>
				
				<div>
					<label for="photo-notes" class="block text-sm mb-2">Notes (optional)</label>
					<textarea id="photo-notes" name="notes" class="input h-16 resize-none" placeholder="e.g., morning fasted"></textarea>
				</div>
				
				<button type="submit" class="btn btn-primary w-full">Upload</button>
			</form>
		</div>
	</div>
{/if}
