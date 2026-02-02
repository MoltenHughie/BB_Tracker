<script lang="ts">
	import { enhance } from '$app/forms';
	
	let { data } = $props();
	
	// Modal states
	let showWeightModal = $state(false);
	let showMeasurementModal = $state(false);
	let showCompositionModal = $state(false);
	let showHistoryModal = $state(false);
	let showAddTypeModal = $state(false);
	
	// Active tab
	let activeTab = $state<'weight' | 'measurements' | 'composition'>('weight');
	
	// Form states
	let weightValue = $state<number | null>(data.latestWeight?.weight ?? null);
	let weightTime = $state('');
	let weightCondition = $state('');
	let weightNotes = $state('');
	
	let selectedMeasureType = $state<number | null>(null);
	let measureValue = $state<number | null>(null);
	
	let compBodyFat = $state<number | null>(data.latestComposition?.bodyFatPercent ?? null);
	let compMuscleMass = $state<number | null>(data.latestComposition?.muscleMassKg ?? null);
	let compBoneMass = $state<number | null>(null);
	let compWater = $state<number | null>(null);
	let compMethod = $state('scale');
	
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
	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">📏 Body</h1>
		<button 
			onclick={() => showHistoryModal = true}
			class="text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text)]"
		>
			{data.date}
		</button>
	</header>

	<!-- Tab navigation -->
	<div class="flex gap-2">
		{#each [
			{ key: 'weight', label: 'Weight', icon: '⚖️' },
			{ key: 'measurements', label: 'Measurements', icon: '📐' },
			{ key: 'composition', label: 'Composition', icon: '🔬' }
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
					<label class="block text-sm mb-2">Weight (kg) *</label>
					<input 
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
						<label class="block text-sm mb-2">Time</label>
						<input 
							type="time" 
							name="time" 
							bind:value={weightTime}
							class="input"
						/>
					</div>
					<div>
						<label class="block text-sm mb-2">Condition</label>
						<select name="condition" bind:value={weightCondition} class="input">
							<option value="">Select...</option>
							<option value="fasted">Fasted (morning)</option>
							<option value="post_meal">Post-meal</option>
							<option value="post_workout">Post-workout</option>
						</select>
					</div>
				</div>
				
				<div>
					<label class="block text-sm mb-2">Notes</label>
					<input 
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
					<label class="block text-sm mb-2">Measurement Type *</label>
					<select 
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
					<label class="block text-sm mb-2">
						Value 
						{#if selectedMeasureType}
							({data.measureTypes.find(t => t.id === selectedMeasureType)?.unit ?? 'cm'})
						{/if}
						*
					</label>
					<input 
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
					<label class="block text-sm mb-2">Name *</label>
					<input 
						type="text" 
						name="name" 
						required
						class="input"
						placeholder="e.g., Chest, Biceps (R)"
					/>
				</div>
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm mb-2">Unit</label>
						<select name="unit" class="input">
							<option value="cm">cm</option>
							<option value="inches">inches</option>
						</select>
					</div>
					<div>
						<label class="block text-sm mb-2">Icon (emoji)</label>
						<input 
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
						<label class="block text-sm mb-2">Body Fat %</label>
						<input 
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
						<label class="block text-sm mb-2">Muscle Mass (kg)</label>
						<input 
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
						<label class="block text-sm mb-2">Water %</label>
						<input 
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
						<label class="block text-sm mb-2">Bone Mass (kg)</label>
						<input 
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
					<label class="block text-sm mb-2">Measurement Method</label>
					<select name="method" bind:value={compMethod} class="input">
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
