<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	
	let { data } = $props();
	
	// Modal states
	let showAddFoodModal = $state(false);
	let showQuickAddModal = $state(false);
	let showTargetModal = $state(false);
	let editingEntryId = $state<number | null>(null);
	let editServings = $state(1);
	
	// Form states
	let selectedMealId = $state<number | null>(null);
	let selectedFoodId = $state<number | null>(null);
	let selectedServingId = $state<number | null>(null);
	let quantity = $state(1);
	let customGrams = $state<number | null>(null);
	let searchQuery = $state('');
	
	// OFF search state
	let offResults = $state<any[]>([]);
	let offSearching = $state(false);
	let searchTab = $state<'local' | 'online'>('local');
	let offSearchTimeout: ReturnType<typeof setTimeout> | null = null;
	
	// Computed
	const selectedFood = $derived(data.allFoods.find(f => f.id === selectedFoodId));
	const recentFoods = $derived(
		data.recentFoodIds
			.map(id => data.allFoods.find(f => f.id === id))
			.filter((f): f is NonNullable<typeof f> => f != null)
	);
	const filteredFoods = $derived(
		searchQuery.length > 0
			? data.allFoods.filter(f => 
				f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				f.brand?.toLowerCase().includes(searchQuery.toLowerCase())
			)
			: data.allFoods.slice(0, 20) // Show first 20 by default
	);
	
	async function searchOFF(query: string) {
		if (query.length < 2) { offResults = []; return; }
		offSearching = true;
		try {
			const res = await fetch(`/api/food-search?q=${encodeURIComponent(query)}`);
			const data = await res.json();
			offResults = data.results || [];
		} catch { offResults = []; }
		offSearching = false;
	}
	
	async function saveAndSelectOFF(product: any) {
		// Save to local DB via POST
		if (product.barcode) {
			try {
				const res = await fetch('/api/food-search', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ barcode: product.barcode })
				});
				const saved = await res.json();
				if (saved.id) {
					await invalidateAll(); // Refresh allFoods
					selectedFoodId = saved.id;
					searchTab = 'local';
					return;
				}
			} catch {}
		}
	}
	
	function onSearchInput(query: string) {
		searchQuery = query;
		if (searchTab === 'online') {
			if (offSearchTimeout) clearTimeout(offSearchTimeout);
			offSearchTimeout = setTimeout(() => searchOFF(query), 400);
		}
	}
	
	// Calculate preview nutrition
	const previewNutrition = $derived(() => {
		if (!selectedFood) return null;
		
		let grams: number;
		if (customGrams) {
			grams = customGrams;
		} else if (selectedServingId) {
			const serving = selectedFood.servings.find(s => s.id === selectedServingId);
			grams = serving ? serving.grams * quantity : 100 * quantity;
		} else {
			grams = 100 * quantity;
		}
		
		const multiplier = grams / 100;
		return {
			calories: Math.round(selectedFood.calories * multiplier),
			protein: Math.round(selectedFood.protein * multiplier * 10) / 10,
			carbs: Math.round(selectedFood.carbs * multiplier * 10) / 10,
			fat: Math.round(selectedFood.fat * multiplier * 10) / 10
		};
	});
	
	// Group entries by meal
	const entriesByMeal = $derived(() => {
		const grouped = new Map<number | null, typeof data.entries>();
		for (const meal of data.meals) {
			grouped.set(meal.id, []);
		}
		grouped.set(null, []); // Ungrouped
		
		for (const entry of data.entries) {
			const mealId = entry.mealTypeId;
			const arr = grouped.get(mealId) ?? [];
			arr.push(entry);
			grouped.set(mealId, arr);
		}
		return grouped;
	});
	
	// Progress calculations
	const calorieProgress = $derived(
		data.target ? Math.min((data.totals.calories / data.target.calories) * 100, 100) : 0
	);
	const remaining = $derived(
		data.target ? data.target.calories - Math.round(data.totals.calories) : 0
	);
	
	function resetAddForm() {
		selectedFoodId = null;
		selectedServingId = null;
		quantity = 1;
		customGrams = null;
		searchQuery = '';
	}
	
	function openAddFoodModal(mealId: number | null) {
		selectedMealId = mealId;
		resetAddForm();
		showAddFoodModal = true;
	}
	
	function closeAddFoodModal() {
		showAddFoodModal = false;
		resetAddForm();
	}
</script>

<div class="space-y-6 pb-4">
	<header class="space-y-2">
		<div class="flex items-center justify-between">
			<h1 class="text-2xl font-bold">🍎 Calories</h1>
			<button 
				onclick={() => showTargetModal = true}
				class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
			>
				⚙️ Targets
			</button>
		</div>
		<div class="flex items-center justify-center gap-4">
			<button onclick={() => { const d = new Date(data.date); d.setDate(d.getDate() - 1); window.location.href = `/calories?date=${d.toISOString().split('T')[0]}`; }} class="text-xl px-2 hover:text-[var(--color-primary)]">‹</button>
			<button 
				onclick={() => { const today = new Date().toISOString().split('T')[0]; if (data.date !== today) window.location.href = '/calories'; }}
				class="text-sm font-medium {data.date === new Date().toISOString().split('T')[0] ? 'text-[var(--color-primary)]' : 'hover:text-[var(--color-primary)]'}"
			>
				{data.date === new Date().toISOString().split('T')[0] ? 'Today' : data.date}
			</button>
			<button 
				onclick={() => { const d = new Date(data.date); d.setDate(d.getDate() + 1); window.location.href = `/calories?date=${d.toISOString().split('T')[0]}`; }}
				class="text-xl px-2 hover:text-[var(--color-primary)] {data.date === new Date().toISOString().split('T')[0] ? 'opacity-30 pointer-events-none' : ''}"
				disabled={data.date === new Date().toISOString().split('T')[0]}
			>›</button>
		</div>
	</header>

	<!-- Daily summary card -->
	<div class="card">
		<div class="grid grid-cols-4 gap-2 text-center mb-4">
			<div>
				<div class="text-2xl font-bold">{Math.round(data.totals.calories)}</div>
				<div class="text-xs text-[var(--color-text-muted)]">Eaten</div>
			</div>
			<div>
				<div class="text-2xl font-bold">{data.target?.calories ?? '—'}</div>
				<div class="text-xs text-[var(--color-text-muted)]">Target</div>
			</div>
			<div>
				<div class="text-2xl font-bold {remaining < 0 ? 'text-red-400' : 'text-green-400'}">
					{remaining > 0 ? remaining : Math.abs(remaining)}
				</div>
				<div class="text-xs text-[var(--color-text-muted)]">{remaining >= 0 ? 'Left' : 'Over'}</div>
			</div>
			<div>
				<div class="text-2xl font-bold">{Math.round(data.totals.protein)}g</div>
				<div class="text-xs text-[var(--color-text-muted)]">Protein</div>
			</div>
		</div>
		
		<!-- Calorie progress bar -->
		<div class="h-3 bg-[var(--color-bg)] rounded-full overflow-hidden">
			<div 
				class="h-full bg-[var(--color-primary)] rounded-full transition-all duration-300"
				style="width: {calorieProgress}%"
			></div>
		</div>

		<!-- Macro breakdown bar -->
		{#if data.totals.protein + data.totals.carbs + data.totals.fat > 0}
			{@const totalMacroG = data.totals.protein + data.totals.carbs + data.totals.fat}
			{@const pPct = (data.totals.protein / totalMacroG) * 100}
			{@const cPct = (data.totals.carbs / totalMacroG) * 100}
			{@const fPct = (data.totals.fat / totalMacroG) * 100}
			<div class="mt-3">
				<div class="flex h-2 rounded-full overflow-hidden">
					<div class="bg-blue-500 transition-all" style="width: {pPct}%"></div>
					<div class="bg-amber-500 transition-all" style="width: {cPct}%"></div>
					<div class="bg-rose-500 transition-all" style="width: {fPct}%"></div>
				</div>
				<div class="flex justify-between text-[10px] text-[var(--color-text-muted)] mt-1">
					<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>P {Math.round(data.totals.protein)}g ({Math.round(pPct)}%)</span>
					<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>C {Math.round(data.totals.carbs)}g ({Math.round(cPct)}%)</span>
					<span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>F {Math.round(data.totals.fat)}g ({Math.round(fPct)}%)</span>
				</div>
			</div>
		{/if}
	</div>

	<!-- Weekly average -->
	{#if data.weeklyAvg}
		<div class="card bg-[var(--color-bg)]">
			<div class="flex items-center justify-between">
				<div class="text-sm text-[var(--color-text-muted)]">📊 7-day avg ({data.weeklyAvg.days} days)</div>
				<div class="text-right">
					<span class="font-bold">{data.weeklyAvg.calories}</span>
					<span class="text-sm text-[var(--color-text-muted)]"> kcal</span>
					<span class="text-xs text-[var(--color-text-muted)] ml-2">{data.weeklyAvg.protein}g protein</span>
				</div>
			</div>
		</div>
	{/if}

	<!-- Copy previous day -->
	{#if data.entries.length === 0}
		<form method="POST" action="?/copyPreviousDay" use:enhance>
			<input type="hidden" name="date" value={data.date} />
			<button type="submit" class="card w-full text-center hover:bg-[var(--color-surface-hover)] transition-colors text-sm text-[var(--color-text-muted)]">
				📋 Copy yesterday's entries
			</button>
		</form>
	{/if}

	<!-- Meals list -->
	<section class="space-y-4">
		{#each data.meals as meal}
			{@const mealEntries = entriesByMeal().get(meal.id) ?? []}
			{@const mealCalories = mealEntries.reduce((sum, e) => sum + (e.calories || 0), 0)}
			
			<div class="card">
				<div class="flex items-center justify-between mb-3">
					<h2 class="text-lg font-semibold flex items-center gap-2">
						<span>{meal.icon}</span>
						<span>{meal.name}</span>
						{#if mealCalories > 0}
							<span class="text-sm text-[var(--color-text-muted)] font-normal">
								{Math.round(mealCalories)} kcal
							</span>
						{/if}
					</h2>
					<button 
						onclick={() => openAddFoodModal(meal.id)}
						class="btn btn-secondary text-sm px-3 py-1"
					>
						+ Add
					</button>
				</div>
				
				{#if mealEntries.length > 0}
					<ul class="space-y-2">
						{#each mealEntries as entry}
							<li class="flex items-center justify-between py-2 border-b border-[var(--color-surface-hover)] last:border-0">
								<button 
									class="flex-1 min-w-0 text-left"
									onclick={() => { editingEntryId = editingEntryId === entry.id ? null : entry.id; editServings = entry.quantity ?? 1; }}
								>
									<div class="font-medium truncate">{entry.food.name}</div>
									<div class="text-sm text-[var(--color-text-muted)]">
										{entry.serving?.name ?? `${entry.customGrams ?? 100}g`}
										{#if entry.quantity !== 1}
											× {entry.quantity}
										{/if}
									</div>
								</button>
								<div class="flex items-center gap-3">
									<div class="text-right">
										<div class="font-medium">{Math.round(entry.calories)} kcal</div>
										<div class="text-xs text-[var(--color-text-muted)]">
											P{Math.round(entry.protein)}g
										</div>
									</div>
									<form method="POST" action="?/deleteEntry" use:enhance={() => {
										return async ({ update }) => {
											await update();
										};
									}}>
										<input type="hidden" name="entryId" value={entry.id} />
										<button 
											type="submit"
											class="text-red-400 hover:text-red-300 p-1"
											title="Delete"
										>
											×
										</button>
									</form>
								</div>
							</li>
							{#if editingEntryId === entry.id}
								<li class="py-2 px-2 bg-[var(--color-bg)] rounded-lg">
									<form 
										method="POST" 
										action="?/updateEntry"
										use:enhance={() => {
											return async ({ update }) => {
												await update();
												editingEntryId = null;
											};
										}}
										class="flex items-center gap-3"
									>
										<input type="hidden" name="entryId" value={entry.id} />
										<label for="edit-qty-{entry.id}" class="text-sm text-[var(--color-text-muted)]">Qty:</label>
										<input 
											id="edit-qty-{entry.id}"
											type="number" 
											name="quantity" 
											bind:value={editServings}
											step="0.25" 
											min="0.25"
											class="input w-20 text-center"
										/>
										<button type="submit" class="btn btn-primary text-sm px-3">Save</button>
										<button type="button" onclick={() => editingEntryId = null} class="text-sm text-[var(--color-text-muted)]">Cancel</button>
									</form>
								</li>
							{/if}
						{/each}
					</ul>
				{:else}
					<p class="text-center text-[var(--color-text-muted)] py-4 text-sm">
						No foods logged
					</p>
				{/if}
			</div>
		{/each}
	</section>

	<!-- Macros breakdown -->
	<section class="card">
		<h2 class="text-lg font-semibold mb-3">Macros</h2>
		<div class="space-y-3">
			{#each [
				{ name: 'Protein', value: data.totals.protein, target: data.target?.protein, color: 'bg-blue-500' },
				{ name: 'Carbs', value: data.totals.carbs, target: data.target?.carbs, color: 'bg-yellow-500' },
				{ name: 'Fat', value: data.totals.fat, target: data.target?.fat, color: 'bg-red-400' }
			] as macro}
				{@const progress = macro.target ? Math.min((macro.value / macro.target) * 100, 100) : 0}
				<div>
					<div class="flex justify-between text-sm mb-1">
						<span>{macro.name}</span>
						<span class="text-[var(--color-text-muted)]">
							{Math.round(macro.value)}g / {macro.target ?? '—'}g
						</span>
					</div>
					<div class="h-2 bg-[var(--color-bg)] rounded-full overflow-hidden">
						<div 
							class="h-full {macro.color} rounded-full transition-all duration-300"
							style="width: {progress}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</section>
	
	<!-- Micros -->
	{#if data.totals.fiber > 0 || data.totals.sugar > 0 || data.totals.sodium > 0}
		<section class="card">
			<h2 class="text-lg font-semibold mb-3">Micros</h2>
			<div class="grid grid-cols-3 gap-4 text-center text-sm">
				<div>
					<div class="text-lg font-bold">{Math.round(data.totals.fiber)}g</div>
					<div class="text-[var(--color-text-muted)]">Fiber</div>
				</div>
				<div>
					<div class="text-lg font-bold">{Math.round(data.totals.sugar)}g</div>
					<div class="text-[var(--color-text-muted)]">Sugar</div>
				</div>
				<div>
					<div class="text-lg font-bold">{Math.round(data.totals.sodium)}mg</div>
					<div class="text-[var(--color-text-muted)]">Sodium</div>
				</div>
			</div>
		</section>
	{/if}

	<!-- Quick add button (floating) -->
	<button
		onclick={() => showQuickAddModal = true}
		class="fixed bottom-20 right-4 w-14 h-14 bg-[var(--color-primary)] rounded-full shadow-lg flex items-center justify-center text-2xl hover:bg-[var(--color-primary-dark)] transition-colors"
		title="Quick add food"
	>
		+
	</button>
</div>

<!-- Add Food Modal -->
{#if showAddFoodModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Add Food</h3>
				<button onclick={closeAddFoodModal} class="text-2xl">×</button>
			</div>
			
			<div class="p-4 flex-1 overflow-y-auto space-y-4">
				<!-- Search -->
				<input
					type="text"
					placeholder="Search foods..."
					value={searchQuery}
					oninput={(e) => onSearchInput((e.target as HTMLInputElement).value)}
					class="input"
				/>
				
				{#if !selectedFoodId}
					<!-- Tabs: Local / OpenFoodFacts -->
					<div class="flex gap-2">
						<button
							onclick={() => searchTab = 'local'}
							class="px-3 py-1 rounded-full text-sm transition-colors {searchTab === 'local' 
								? 'bg-[var(--color-primary)] text-white' 
								: 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'}"
						>
							My Foods
						</button>
						<button
							onclick={() => { searchTab = 'online'; if (searchQuery.length >= 2) searchOFF(searchQuery); }}
							class="px-3 py-1 rounded-full text-sm transition-colors {searchTab === 'online' 
								? 'bg-[var(--color-primary)] text-white' 
								: 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'}"
						>
							🌐 OpenFoodFacts
						</button>
					</div>
					
					{#if searchTab === 'local'}
						<!-- Recent foods (quick pick) -->
						{#if recentFoods.length > 0 && searchQuery.length === 0}
							<div class="mb-3">
								<div class="text-xs font-medium text-[var(--color-text-muted)] mb-2">⚡ Recent</div>
								<div class="flex flex-wrap gap-2">
									{#each recentFoods as food}
										<button
											onclick={() => {
												selectedFoodId = food.id;
												if (food.servings.length > 0) {
													const defaultServing = food.servings.find(s => s.isDefault) ?? food.servings[0];
													selectedServingId = defaultServing.id;
												}
											}}
											class="px-3 py-1.5 rounded-full text-xs bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] transition-colors border border-[var(--color-surface-hover)]"
										>
											{food.name}
										</button>
									{/each}
								</div>
							</div>
						{/if}
						<!-- Local food list -->
						<ul class="space-y-2 max-h-60 overflow-y-auto">
							{#each filteredFoods as food}
								<li>
									<button
										onclick={() => {
											selectedFoodId = food.id;
											if (food.servings.length > 0) {
												const defaultServing = food.servings.find(s => s.isDefault) ?? food.servings[0];
												selectedServingId = defaultServing.id;
											}
										}}
										class="w-full text-left p-3 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] transition-colors"
									>
										<div class="font-medium">{food.name}</div>
										<div class="text-sm text-[var(--color-text-muted)]">
											{food.calories} kcal / 100g • P{food.protein}g C{food.carbs}g F{food.fat}g
										</div>
									</button>
								</li>
							{/each}
						</ul>
						
						{#if filteredFoods.length === 0}
							<p class="text-center text-[var(--color-text-muted)] py-4">
								No foods found. Try searching <button onclick={() => { searchTab = 'online'; searchOFF(searchQuery); }} class="text-[var(--color-primary)] underline">OpenFoodFacts</button> or create a new food.
							</p>
						{/if}
					{:else}
						<!-- OpenFoodFacts results -->
						{#if offSearching}
							<div class="text-center py-4 text-[var(--color-text-muted)]">
								Searching OpenFoodFacts...
							</div>
						{:else if offResults.length > 0}
							<ul class="space-y-2 max-h-60 overflow-y-auto">
								{#each offResults as product}
									<li>
										<button
											onclick={() => saveAndSelectOFF(product)}
											class="w-full text-left p-3 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] transition-colors"
										>
											<div class="font-medium">{product.name}</div>
											<div class="text-sm text-[var(--color-text-muted)]">
												{#if product.brand}<span class="italic">{product.brand}</span> • {/if}
												{product.calories} kcal / 100g • P{product.protein}g C{product.carbs}g F{product.fat}g
											</div>
										</button>
									</li>
								{/each}
							</ul>
						{:else if searchQuery.length >= 2}
							<p class="text-center text-[var(--color-text-muted)] py-4">
								No results found on OpenFoodFacts.
							</p>
						{:else}
							<p class="text-center text-[var(--color-text-muted)] py-4">
								Type at least 2 characters to search.
							</p>
						{/if}
					{/if}
				{:else if selectedFood}
					<!-- Selected food details -->
					<div class="p-3 rounded-lg bg-[var(--color-bg)]">
						<div class="flex justify-between items-start">
							<div>
								<div class="font-semibold">{selectedFood.name}</div>
								<div class="text-sm text-[var(--color-text-muted)]">
									{selectedFood.calories} kcal / 100g
								</div>
							</div>
							<button 
								onclick={() => { selectedFoodId = null; selectedServingId = null; }}
								class="text-[var(--color-primary)]"
							>
								Change
							</button>
						</div>
					</div>
					
					<!-- Serving size -->
					{#if selectedFood.servings.length > 0}
						<div>
							<label for="servingId" class="block text-sm mb-2">Serving size</label>
							<select 
								id="servingId"
								name="servingId"
								bind:value={selectedServingId}
								onchange={() => customGrams = null}
								class="input"
							>
								{#each selectedFood.servings as serving}
									<option value={serving.id}>
										{serving.name} ({serving.grams}g)
									</option>
								{/each}
								<option value={null}>Custom (grams)</option>
							</select>
						</div>
					{/if}
					
					<!-- Quantity or custom grams -->
					{#if selectedServingId || selectedFood.servings.length === 0}
						<div>
							<label for="quantity" class="block text-sm mb-2">Quantity</label>
							<input
								id="quantity"
								name="quantity"
								type="number"
								bind:value={quantity}
								min="0.1"
								step="0.1"
								class="input"
							/>
						</div>
					{:else}
						<div>
							<label for="customGrams" class="block text-sm mb-2">Amount (grams)</label>
							<input
								id="customGrams"
								name="customGrams"
								type="number"
								bind:value={customGrams}
								min="1"
								step="1"
								placeholder="e.g., 150"
								class="input"
							/>
						</div>
					{/if}
					
					<!-- Preview -->
					{#if previewNutrition()}
						{@const preview = previewNutrition()}
						<div class="p-3 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30">
							<div class="text-sm text-[var(--color-text-muted)] mb-1">This will add:</div>
							<div class="font-bold text-lg">{preview?.calories} kcal</div>
							<div class="text-sm text-[var(--color-text-muted)]">
								P{preview?.protein}g • C{preview?.carbs}g • F{preview?.fat}g
							</div>
						</div>
					{/if}
				{/if}
			</div>
			
			{#if selectedFoodId}
				<div class="p-4 border-t border-[var(--color-surface-hover)]">
					<form 
						method="POST" 
						action="?/addEntry"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								closeAddFoodModal();
							};
						}}
					>
						<input type="hidden" name="date" value={data.date} />
						<input type="hidden" name="foodId" value={selectedFoodId} />
						<input type="hidden" name="mealTypeId" value={selectedMealId ?? ''} />
						<input type="hidden" name="servingId" value={selectedServingId ?? ''} />
						<input type="hidden" name="quantity" value={quantity} />
						{#if customGrams}
							<input type="hidden" name="customGrams" value={customGrams} />
						{/if}
						<button type="submit" class="btn btn-primary w-full">
							Add to {data.meals.find(m => m.id === selectedMealId)?.name ?? 'Log'}
						</button>
					</form>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Quick Add Food Modal -->
{#if showQuickAddModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Quick Add Food</h3>
				<button onclick={() => showQuickAddModal = false} class="text-2xl">×</button>
			</div>
			
			<form 
				method="POST" 
				action="?/quickAddFood"
				use:enhance={() => {
					return async ({ update, result }) => {
						await update();
						if (result.type === 'success') {
							showQuickAddModal = false;
						}
					};
				}}
				class="p-4 space-y-4"
			>
				<div>
					<label for="quick_name" class="block text-sm mb-2">Food name *</label>
					<input id="quick_name" type="text" name="name" required class="input" placeholder="e.g., Chicken breast" />
				</div>
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="quick_calories" class="block text-sm mb-2">Calories (per 100g) *</label>
						<input id="quick_calories" type="number" name="calories" required min="0" class="input" placeholder="e.g., 165" />
					</div>
					<div>
						<label for="quick_protein" class="block text-sm mb-2">Protein (g)</label>
						<input id="quick_protein" type="number" name="protein" min="0" step="0.1" class="input" placeholder="e.g., 31" />
					</div>
				</div>
				
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="quick_carbs" class="block text-sm mb-2">Carbs (g)</label>
						<input id="quick_carbs" type="number" name="carbs" min="0" step="0.1" class="input" placeholder="e.g., 0" />
					</div>
					<div>
						<label for="quick_fat" class="block text-sm mb-2">Fat (g)</label>
						<input id="quick_fat" type="number" name="fat" min="0" step="0.1" class="input" placeholder="e.g., 3.6" />
					</div>
				</div>
				
				<p class="text-xs text-[var(--color-text-muted)]">
					All values are per 100g. The food will be saved and can be reused.
				</p>
				
				<button type="submit" class="btn btn-primary w-full">
					Create Food
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- Target Edit Modal -->
{#if showTargetModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Daily Targets</h3>
				<button onclick={() => showTargetModal = false} class="text-2xl">×</button>
			</div>
			
			<form 
				method="POST" 
				action="?/updateTarget"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showTargetModal = false;
					};
				}}
				class="p-4 space-y-4"
			>
				<input type="hidden" name="date" value={data.date} />
				
				<div>
					<label for="target_calories" class="block text-sm mb-2">Calories</label>
					<input 
						id="target_calories"
						type="number" 
						name="calories" 
						value={data.target?.calories ?? 2500} 
						min="1000" 
						max="10000"
						class="input" 
					/>
				</div>
				
				<div class="grid grid-cols-3 gap-4">
					<div>
						<label for="target_protein" class="block text-sm mb-2">Protein (g)</label>
						<input 
							id="target_protein"
							type="number" 
							name="protein" 
							value={data.target?.protein ?? 180} 
							min="0"
							class="input" 
						/>
					</div>
					<div>
						<label for="target_carbs" class="block text-sm mb-2">Carbs (g)</label>
						<input 
							id="target_carbs"
							type="number" 
							name="carbs" 
							value={data.target?.carbs ?? 280} 
							min="0"
							class="input" 
						/>
					</div>
					<div>
						<label for="target_fat" class="block text-sm mb-2">Fat (g)</label>
						<input 
							id="target_fat"
							type="number" 
							name="fat" 
							value={data.target?.fat ?? 80} 
							min="0"
							class="input" 
						/>
					</div>
				</div>
				
				<button type="submit" class="btn btn-primary w-full">
					Save Targets
				</button>
			</form>
		</div>
	</div>
{/if}
