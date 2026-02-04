<script lang="ts">
	import { enhance } from '$app/forms';
	
	let { data } = $props();
	
	// Modal states
	let showAddSupplementModal = $state(false);
	let showManualLogModal = $state(false);
	let showSupplementDetailModal = $state(false);
	let showAddScheduleModal = $state(false);
	
	// Selected states
	let selectedSupplement = $state<typeof data.allSupplements[0] | null>(null);
	let selectedCategory = $state<string | null>(null);
	
	// Form states for add supplement
	let newName = $state('');
	let newBrand = $state('');
	let newCategory = $state('');
	let newForm = $state('');
	let newServingSize = $state('');
	let newConcentration = $state('');
	let newIsPed = $state(false);
	let newIsRx = $state(false);
	let newNotes = $state('');
	
	// Form states for schedule
	let schedName = $state('');
	let schedTimeOfDay = $state('morning');
	let schedTime = $state('');
	let schedDose = $state(1);
	let schedWithFood = $state(false);
	let schedDays = $state<number[]>([0, 1, 2, 3, 4, 5, 6]);
	let schedNotes = $state('');
	
	// Computed
	const filteredSupplements = $derived(
		selectedCategory
			? data.allSupplements.filter(s => s.category === selectedCategory)
			: data.allSupplements
	);
	
	// Group today's schedule by time of day
	const scheduleByTime = $derived(() => {
		const groups = new Map<string, typeof data.todaySchedule>();
		const timeLabels: Record<string, string> = {
			'morning': '🌅 Morning',
			'noon': '☀️ Midday',
			'preworkout': '💪 Pre-Workout',
			'postworkout': '🏋️ Post-Workout',
			'evening': '🌆 Evening',
			'night': '🌙 Night'
		};
		
		for (const item of data.todaySchedule) {
			const key = item.schedule.timeOfDay || 'other';
			if (!groups.has(key)) {
				groups.set(key, []);
			}
			groups.get(key)!.push(item);
		}
		
		return Array.from(groups.entries()).map(([key, items]) => ({
			key,
			label: timeLabels[key] || '📋 Other',
			items
		}));
	});
	
	// Progress stats
	const progressStats = $derived(() => {
		const total = data.todaySchedule.length;
		const taken = data.todaySchedule.filter(s => s.logged).length;
		const percent = total > 0 ? Math.round((taken / total) * 100) : 0;
		return { total, taken, percent };
	});
	
	// Category emoji map
	const categoryEmoji: Record<string, string> = {
		'vitamin': '💊',
		'mineral': '🔬',
		'protein': '🥤',
		'preworkout': '⚡',
		'hormone': '💉',
		'medication': '💊',
		'other': '📦'
	};
	
	const formEmoji: Record<string, string> = {
		'pill': '💊',
		'capsule': '💊',
		'powder': '🥄',
		'liquid': '💧',
		'injection': '💉'
	};
	
	function getCategoryEmoji(category: string | null): string {
		return categoryEmoji[category || 'other'] || '📦';
	}
	
	function getFormEmoji(form: string | null): string {
		return formEmoji[form || ''] || '💊';
	}
	
	function resetAddForm() {
		newName = '';
		newBrand = '';
		newCategory = '';
		newForm = '';
		newServingSize = '';
		newConcentration = '';
		newIsPed = false;
		newIsRx = false;
		newNotes = '';
	}
	
	function resetScheduleForm() {
		schedName = '';
		schedTimeOfDay = 'morning';
		schedTime = '';
		schedDose = 1;
		schedWithFood = false;
		schedDays = [0, 1, 2, 3, 4, 5, 6];
		schedNotes = '';
	}
	
	function openSupplementDetail(supp: typeof data.allSupplements[0]) {
		selectedSupplement = supp;
		showSupplementDetailModal = true;
	}
	
	function openAddSchedule(supp: typeof data.allSupplements[0] | null) {
		if (!supp) return;
		selectedSupplement = supp;
		resetScheduleForm();
		showAddScheduleModal = true;
	}
	
	function toggleDay(day: number) {
		if (schedDays.includes(day)) {
			schedDays = schedDays.filter(d => d !== day);
		} else {
			schedDays = [...schedDays, day].sort();
		}
	}
	
	const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
</script>

<div class="space-y-6 pb-4">
	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">💊 Supplements</h1>
		<button 
			onclick={() => showManualLogModal = true}
			class="text-[var(--color-text-muted)] text-sm hover:text-[var(--color-text)]"
		>
			{data.date}
		</button>
	</header>

	<!-- Daily progress card -->
	<div class="card">
		<div class="flex items-center justify-between mb-3">
			<div>
				<div class="text-2xl font-bold">{progressStats().taken}/{progressStats().total}</div>
				<div class="text-sm text-[var(--color-text-muted)]">supplements taken today</div>
			</div>
			<div class="text-4xl">
				{#if progressStats().percent === 100}
					✅
				{:else if progressStats().percent >= 50}
					📊
				{:else}
					⏳
				{/if}
			</div>
		</div>
		
		<!-- Progress bar -->
		<div class="h-3 bg-[var(--color-bg)] rounded-full overflow-hidden">
			<div 
				class="h-full bg-green-500 rounded-full transition-all duration-300"
				style="width: {progressStats().percent}%"
			></div>
		</div>
	</div>

	<!-- Today's Schedule -->
	{#if data.todaySchedule.length > 0}
		<section class="space-y-4">
			<h2 class="text-lg font-semibold">Today's Schedule</h2>
			
			{#each scheduleByTime() as group}
				<div class="card">
					<h3 class="text-sm font-medium text-[var(--color-text-muted)] mb-3">{group.label}</h3>
					<div class="space-y-2">
						{#each group.items as item}
							{@const supp = item.supplement}
							{@const sched = item.schedule}
							<div class="flex items-center gap-3 py-2 border-b border-[var(--color-surface-hover)] last:border-0">
								<!-- Checkbox/Log button -->
								{#if item.logged}
									<form method="POST" action="?/deleteLog" use:enhance>
										<input type="hidden" name="logId" value={item.logId} />
										<button 
											type="submit" 
											class="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white"
											title="Undo"
										>
											✓
										</button>
									</form>
								{:else}
									<form method="POST" action="?/logIntake" use:enhance>
										<input type="hidden" name="supplementId" value={supp.id} />
										<input type="hidden" name="scheduleId" value={sched.id} />
										<input type="hidden" name="date" value={data.date} />
										<input type="hidden" name="dose" value={sched.dose} />
										<button 
											type="submit" 
											class="w-8 h-8 rounded-full border-2 border-[var(--color-surface-hover)] hover:border-[var(--color-primary)] flex items-center justify-center transition-colors"
											title="Mark as taken"
										>
											<span class="opacity-0 group-hover:opacity-100">✓</span>
										</button>
									</form>
								{/if}
								
								<!-- Info -->
								<div class="flex-1 min-w-0">
									<div class="font-medium flex items-center gap-2">
										<span>{getFormEmoji(supp.form)}</span>
										<span class="truncate">{supp.name}</span>
										{#if supp.isPed}
											<span class="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">PED</span>
										{/if}
									</div>
									<div class="text-sm text-[var(--color-text-muted)]">
										{sched.dose} {supp.servingSize || 'serving'}
										{#if sched.scheduledTime}
											• {sched.scheduledTime}
										{/if}
										{#if sched.withFood}
											• with food
										{/if}
									</div>
								</div>
								
								<!-- Logged time -->
								{#if item.loggedAt}
									<div class="text-xs text-[var(--color-text-muted)]">
										{new Date(item.loggedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</section>
	{:else}
		<div class="card text-center py-8 text-[var(--color-text-muted)]">
			<p class="text-4xl mb-2">📋</p>
			<p>No supplements scheduled for today</p>
			<p class="text-sm mt-1">Add supplements and create schedules below</p>
		</div>
	{/if}

	<!-- My Supplements -->
	<section class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="text-lg font-semibold">My Supplements</h2>
			<button 
				onclick={() => { resetAddForm(); showAddSupplementModal = true; }}
				class="btn btn-secondary text-sm px-3 py-1"
			>
				+ Add
			</button>
		</div>
		
		<!-- Category filter -->
		{#if data.categories.length > 0}
			<div class="flex gap-2 flex-wrap">
				<button
					onclick={() => selectedCategory = null}
					class="px-3 py-1 rounded-full text-sm transition-colors {!selectedCategory 
						? 'bg-[var(--color-primary)] text-white' 
						: 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'}"
				>
					All
				</button>
				{#each data.categories as cat}
					<button
						onclick={() => selectedCategory = cat}
						class="px-3 py-1 rounded-full text-sm transition-colors capitalize {selectedCategory === cat 
							? 'bg-[var(--color-primary)] text-white' 
							: 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'}"
					>
						{getCategoryEmoji(cat)} {cat}
					</button>
				{/each}
			</div>
		{/if}
		
		{#if filteredSupplements.length > 0}
			<div class="grid gap-3">
				{#each filteredSupplements as supp}
					<button 
						onclick={() => openSupplementDetail(supp)}
						class="card text-left hover:bg-[var(--color-surface-hover)] transition-colors"
					>
						<div class="flex items-center gap-3">
							<div class="text-2xl">{getFormEmoji(supp.form)}</div>
							<div class="flex-1 min-w-0">
								<div class="font-medium flex items-center gap-2">
									<span class="truncate">{supp.name}</span>
									{#if supp.isPed}
										<span class="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">PED</span>
									{/if}
									{#if supp.isRx}
										<span class="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">Rx</span>
									{/if}
								</div>
								<div class="text-sm text-[var(--color-text-muted)]">
									{#if supp.brand}
										{supp.brand} • 
									{/if}
									{supp.servingSize || supp.concentration || supp.category || 'Supplement'}
								</div>
							</div>
							<div class="text-sm text-[var(--color-text-muted)]">
								{supp.schedules.filter(s => s.isActive).length} schedules
							</div>
						</div>
					</button>
				{/each}
			</div>
		{:else}
			<div class="card text-center py-8 text-[var(--color-text-muted)]">
				<p class="text-4xl mb-2">💊</p>
				<p>No supplements yet</p>
				<button 
					onclick={() => { resetAddForm(); showAddSupplementModal = true; }}
					class="btn btn-primary mt-3"
				>
					Add Your First Supplement
				</button>
			</div>
		{/if}
	</section>

	<!-- Recent Activity -->
	{#if data.recentLogs.length > 0}
		<section class="space-y-4">
			<h2 class="text-lg font-semibold">Recent Activity</h2>
			<div class="card">
				<div class="space-y-2 max-h-60 overflow-y-auto">
					{#each data.recentLogs.slice(0, 15) as log}
						<div class="flex items-center justify-between py-2 border-b border-[var(--color-surface-hover)] last:border-0 text-sm">
							<div class="flex items-center gap-2">
								<span>{getFormEmoji(log.supplement.form)}</span>
								<span>{log.supplement.name}</span>
								<span class="text-[var(--color-text-muted)]">× {log.dose}</span>
							</div>
							<div class="text-[var(--color-text-muted)]">
								{new Date(log.takenAt).toLocaleDateString([], { weekday: 'short' })}
								{new Date(log.takenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</section>
	{/if}
	
	<!-- Floating quick-log button -->
	<button
		onclick={() => showManualLogModal = true}
		class="fixed bottom-20 right-4 w-14 h-14 bg-[var(--color-primary)] rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-[var(--color-primary-dark)] transition-colors"
		title="Quick log"
	>
		+
	</button>
</div>

<!-- Add Supplement Modal -->
{#if showAddSupplementModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Add Supplement</h3>
				<button onclick={() => showAddSupplementModal = false} class="text-2xl">×</button>
			</div>
			
			<form 
				method="POST" 
				action="?/addSupplement"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showAddSupplementModal = false;
						resetAddForm();
					};
				}}
				class="p-4 space-y-4 overflow-y-auto"
			>
				<div>
					<label class="block text-sm mb-2">Name *</label>
					<input 
						type="text" 
						name="name" 
						bind:value={newName}
						required 
						class="input" 
						placeholder="e.g., Vitamin D3"
					/>
				</div>
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm mb-2">Brand</label>
						<input 
							type="text" 
							name="brand" 
							bind:value={newBrand}
							class="input" 
							placeholder="e.g., NOW Foods"
						/>
					</div>
					<div>
						<label class="block text-sm mb-2">Category</label>
						<select name="category" bind:value={newCategory} class="input">
							<option value="">Select...</option>
							<option value="vitamin">Vitamin</option>
							<option value="mineral">Mineral</option>
							<option value="protein">Protein</option>
							<option value="preworkout">Pre-Workout</option>
							<option value="hormone">Hormone/PED</option>
							<option value="medication">Medication</option>
							<option value="other">Other</option>
						</select>
					</div>
				</div>
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm mb-2">Form</label>
						<select name="form" bind:value={newForm} class="input">
							<option value="">Select...</option>
							<option value="pill">Pill</option>
							<option value="capsule">Capsule</option>
							<option value="powder">Powder</option>
							<option value="liquid">Liquid</option>
							<option value="injection">Injection</option>
						</select>
					</div>
					<div>
						<label class="block text-sm mb-2">Serving Size</label>
						<input 
							type="text" 
							name="servingSize" 
							bind:value={newServingSize}
							class="input" 
							placeholder="e.g., 1 capsule, 5g"
						/>
					</div>
				</div>
				
				<div>
					<label class="block text-sm mb-2">Concentration (for injectables)</label>
					<input 
						type="text" 
						name="concentration" 
						bind:value={newConcentration}
						class="input" 
						placeholder="e.g., 250mg/ml"
					/>
				</div>
				
				<div class="flex gap-4">
					<label class="flex items-center gap-2 cursor-pointer">
						<input 
							type="checkbox" 
							name="isPed" 
							bind:checked={newIsPed}
							value="true"
							class="w-4 h-4"
						/>
						<span class="text-sm">PED/Hormone</span>
					</label>
					<label class="flex items-center gap-2 cursor-pointer">
						<input 
							type="checkbox" 
							name="isRx" 
							bind:checked={newIsRx}
							value="true"
							class="w-4 h-4"
						/>
						<span class="text-sm">Prescription</span>
					</label>
				</div>
				
				<div>
					<label class="block text-sm mb-2">Notes</label>
					<textarea 
						name="notes" 
						bind:value={newNotes}
						class="input h-20 resize-none" 
						placeholder="Any additional notes..."
					></textarea>
				</div>
				
				<button type="submit" class="btn btn-primary w-full">
					Add Supplement
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- Supplement Detail Modal -->
{#if showSupplementDetailModal && selectedSupplement}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold flex items-center gap-2">
					{getFormEmoji(selectedSupplement.form)}
					{selectedSupplement.name}
				</h3>
				<button onclick={() => showSupplementDetailModal = false} class="text-2xl">×</button>
			</div>
			
			<div class="p-4 space-y-4 overflow-y-auto flex-1">
				<!-- Details -->
				<div class="card space-y-2 text-sm">
					{#if selectedSupplement.brand}
						<div class="flex justify-between">
							<span class="text-[var(--color-text-muted)]">Brand</span>
							<span>{selectedSupplement.brand}</span>
						</div>
					{/if}
					{#if selectedSupplement.category}
						<div class="flex justify-between">
							<span class="text-[var(--color-text-muted)]">Category</span>
							<span class="capitalize">{selectedSupplement.category}</span>
						</div>
					{/if}
					{#if selectedSupplement.servingSize}
						<div class="flex justify-between">
							<span class="text-[var(--color-text-muted)]">Serving</span>
							<span>{selectedSupplement.servingSize}</span>
						</div>
					{/if}
					{#if selectedSupplement.concentration}
						<div class="flex justify-between">
							<span class="text-[var(--color-text-muted)]">Concentration</span>
							<span>{selectedSupplement.concentration}</span>
						</div>
					{/if}
					{#if selectedSupplement.notes}
						<div class="pt-2 border-t border-[var(--color-surface-hover)]">
							<span class="text-[var(--color-text-muted)]">Notes:</span>
							<p class="mt-1">{selectedSupplement.notes}</p>
						</div>
					{/if}
				</div>
				
				<!-- Schedules -->
				<div>
					<div class="flex items-center justify-between mb-2">
						<h4 class="font-semibold">Schedules</h4>
						<button 
							onclick={() => openAddSchedule(selectedSupplement)}
							class="text-sm text-[var(--color-primary)]"
						>
							+ Add
						</button>
					</div>
					
					{#if selectedSupplement.schedules.length > 0}
						<div class="space-y-2">
							{#each selectedSupplement.schedules as sched}
								<div class="card flex items-center justify-between {!sched.isActive ? 'opacity-50' : ''}">
									<div>
										<div class="font-medium">
											{sched.name || sched.timeOfDay || 'Daily'}
											{#if sched.scheduledTime}
												@ {sched.scheduledTime}
											{/if}
										</div>
										<div class="text-sm text-[var(--color-text-muted)]">
											{sched.dose} serving{sched.dose !== 1 ? 's' : ''}
											{#if sched.withFood}
												• with food
											{/if}
										</div>
									</div>
									<div class="flex items-center gap-2">
										<form method="POST" action="?/toggleSchedule" use:enhance>
											<input type="hidden" name="scheduleId" value={sched.id} />
											<input type="hidden" name="isActive" value={!sched.isActive} />
											<button 
												type="submit" 
												class="text-sm px-2 py-1 rounded {sched.isActive ? 'bg-green-500/20 text-green-400' : 'bg-[var(--color-bg)]'}"
											>
												{sched.isActive ? 'Active' : 'Paused'}
											</button>
										</form>
										<form method="POST" action="?/deleteSchedule" use:enhance>
											<input type="hidden" name="scheduleId" value={sched.id} />
											<button 
												type="submit" 
												class="text-red-400 hover:text-red-300"
												onclick={(e) => {
													if (!confirm('Delete this schedule?')) e.preventDefault();
												}}
											>
												×
											</button>
										</form>
									</div>
								</div>
							{/each}
						</div>
					{:else}
						<p class="text-center text-[var(--color-text-muted)] py-4 text-sm">
							No schedules yet
						</p>
					{/if}
				</div>
			</div>
			
			<div class="p-4 border-t border-[var(--color-surface-hover)] flex gap-3">
				<form 
					method="POST" 
					action="?/logIntake"
					use:enhance
					class="flex-1"
				>
					<input type="hidden" name="supplementId" value={selectedSupplement.id} />
					<input type="hidden" name="date" value={data.date} />
					<input type="hidden" name="dose" value="1" />
					<button type="submit" class="btn btn-primary w-full">
						Log Now
					</button>
				</form>
				<form method="POST" action="?/deleteSupplement" use:enhance={() => {
					return async ({ update }) => {
						await update();
						showSupplementDetailModal = false;
					};
				}}>
					<input type="hidden" name="supplementId" value={selectedSupplement.id} />
					<button 
						type="submit" 
						class="btn btn-secondary text-red-400"
						onclick={(e) => {
							if (!confirm('Delete this supplement? All schedules and logs will also be deleted.')) {
								e.preventDefault();
							}
						}}
					>
						Delete
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Add Schedule Modal -->
{#if showAddScheduleModal && selectedSupplement}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Add Schedule</h3>
				<button onclick={() => showAddScheduleModal = false} class="text-2xl">×</button>
			</div>
			
			<form 
				method="POST" 
				action="?/addSchedule"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showAddScheduleModal = false;
						resetScheduleForm();
					};
				}}
				class="p-4 space-y-4"
			>
				<input type="hidden" name="supplementId" value={selectedSupplement.id} />
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label class="block text-sm mb-2">Time of Day</label>
						<select name="timeOfDay" bind:value={schedTimeOfDay} class="input">
							<option value="morning">Morning</option>
							<option value="noon">Midday</option>
							<option value="preworkout">Pre-Workout</option>
							<option value="postworkout">Post-Workout</option>
							<option value="evening">Evening</option>
							<option value="night">Night</option>
						</select>
					</div>
					<div>
						<label class="block text-sm mb-2">Specific Time (optional)</label>
						<input 
							type="time" 
							name="scheduledTime" 
							bind:value={schedTime}
							class="input"
						/>
					</div>
				</div>
				
				<div>
					<label class="block text-sm mb-2">Dose</label>
					<input 
						type="number" 
						name="dose" 
						bind:value={schedDose}
						min="0.1"
						step="0.1"
						class="input"
					/>
					<p class="text-xs text-[var(--color-text-muted)] mt-1">
						Number of servings ({selectedSupplement.servingSize || '1 serving'} each)
					</p>
				</div>
				
				<div>
					<label class="block text-sm mb-2">Days</label>
					<div class="flex gap-1">
						{#each dayLabels as label, i}
							<button
								type="button"
								onclick={() => toggleDay(i)}
								class="w-9 h-9 rounded-full text-sm transition-colors {schedDays.includes(i)
									? 'bg-[var(--color-primary)] text-white'
									: 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'}"
							>
								{label}
							</button>
						{/each}
					</div>
					<input type="hidden" name="daysOfWeek" value={JSON.stringify(schedDays)} />
				</div>
				
				<label class="flex items-center gap-2 cursor-pointer">
					<input 
						type="checkbox" 
						name="withFood" 
						bind:checked={schedWithFood}
						value="true"
						class="w-4 h-4"
					/>
					<span class="text-sm">Take with food</span>
				</label>
				
				<div>
					<label class="block text-sm mb-2">Label (optional)</label>
					<input 
						type="text" 
						name="name" 
						bind:value={schedName}
						class="input" 
						placeholder="e.g., Morning dose"
					/>
				</div>
				
				<button type="submit" class="btn btn-primary w-full">
					Add Schedule
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- Manual Log Modal -->
{#if showManualLogModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Quick Log</h3>
				<button onclick={() => showManualLogModal = false} class="text-2xl">×</button>
			</div>
			
			<div class="p-4 space-y-2 overflow-y-auto flex-1">
				{#if data.allSupplements.length > 0}
					{#each data.allSupplements as supp}
						<form 
							method="POST" 
							action="?/logIntake"
							use:enhance={() => {
								return async ({ update }) => {
									await update();
									showManualLogModal = false;
								};
							}}
						>
							<input type="hidden" name="supplementId" value={supp.id} />
							<input type="hidden" name="date" value={data.date} />
							<input type="hidden" name="dose" value="1" />
							<button 
								type="submit"
								class="w-full text-left p-3 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] transition-colors flex items-center gap-3"
							>
								<span class="text-xl">{getFormEmoji(supp.form)}</span>
								<div class="flex-1">
									<div class="font-medium">{supp.name}</div>
									<div class="text-sm text-[var(--color-text-muted)]">
										{supp.servingSize || '1 serving'}
									</div>
								</div>
								<span class="text-[var(--color-primary)]">+</span>
							</button>
						</form>
					{/each}
				{:else}
					<p class="text-center text-[var(--color-text-muted)] py-8">
						No supplements added yet.
						<br />
						<button 
							onclick={() => { showManualLogModal = false; showAddSupplementModal = true; }}
							class="text-[var(--color-primary)] mt-2"
						>
							Add your first supplement
						</button>
					</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
