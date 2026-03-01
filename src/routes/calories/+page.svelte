<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { caloriesService } from '$lib/services/caloriesService';
	import FoodSearch from '$lib/components/FoodSearch.svelte';
	import DonutChart from '$lib/components/DonutChart.svelte';
	import { pushToast } from '$lib/stores/toast';
	
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
	let selectedFoodCache = $state<any | null>(null);
	
	// Computed
	const selectedFood = $derived(data.allFoods.find(f => f.id === selectedFoodId) ?? selectedFoodCache);
	const recentFoods = $derived(
		data.recentFoodIds
			.map(id => data.allFoods.find(f => f.id === id))
			.filter((f): f is NonNullable<typeof f> => f != null)
	);
	
	
	
	
	// Calculate preview nutrition
	const previewNutrition = $derived(() => {
		if (!selectedFood) return null;
		
		let grams: number;
		if (customGrams) {
			grams = customGrams;
		} else if (selectedServingId) {
			const serving = selectedFood.servings.find((s: any) => s.id === selectedServingId);
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
			const mealId = entry.dayMealId;
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
		selectedFoodCache = null;
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

	async function refreshPage() {
		// simple refresh strategy until stores are introduced
		await invalidateAll();
	}

	let isSaving = $state(false);

	async function onDeleteEntry(entryId: number) {
		try {
			isSaving = true;
			await caloriesService.deleteEntry(entryId);
			pushToast({ kind: 'success', message: 'Entry deleted' });
			editingEntryId = null;
			await refreshPage();
		} catch (e: any) {
			pushToast({ kind: 'error', message: 'Failed to delete entry', details: String(e?.message ?? e) });
		} finally {
			isSaving = false;
		}
	}

	async function onUpdateEntry(entryId: number, qty: number) {
		try {
			isSaving = true;
			await caloriesService.updateEntry(entryId, { quantity: qty });
			pushToast({ kind: 'success', message: 'Entry updated' });
			editingEntryId = null;
			await refreshPage();
		} catch (e: any) {
			pushToast({ kind: 'error', message: 'Failed to update entry', details: String(e?.message ?? e) });
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="space-y-6 pb-4">
	<header class="space-y-2">
		<div class="flex items-center justify-between">
			<h1 class="text-2xl font-bold">🍎 Calories</h1>
			<div class="flex items-center gap-3">
				<div class="flex items-center gap-3">
					<a href="/calories/history" class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">📊 History</a>
					<a href="/calories/trends" class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">📈 Trends</a>
				</div>
				<button 
					onclick={() => showTargetModal = true}
					class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
				>
					⚙️ Targets
				</button>
			</div>
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

		<!-- Macro donut chart -->
		{#if data.totals.protein + data.totals.carbs + data.totals.fat > 0}
			<div class="mt-4">
				<DonutChart
					segments={[
						{ label: `Protein ${Math.round(data.totals.protein)}g`, value: data.totals.protein, color: '#3b82f6' },
						{ label: `Carbs ${Math.round(data.totals.carbs)}g`, value: data.totals.carbs, color: '#f59e0b' },
						{ label: `Fat ${Math.round(data.totals.fat)}g`, value: data.totals.fat, color: '#f43f5e' }
					]}
					size={160}
					strokeWidth={28}
					centerValue={String(Math.round(data.totals.calories))}
					centerLabel="kcal"
				/>
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
	<form method="POST" action="?/addMeal" use:enhance={() => { return async ({ update }) => { await update(); await refreshPage(); }; }} class="card p-3 flex items-center gap-2">
		<input type="hidden" name="date" value={data.date} />
		<input type="text" name="name" class="input text-sm flex-1" placeholder="Add meal…" required />
		<button type="submit" class="btn btn-primary text-sm">Add Meal</button>
	</form>

	<section class="space-y-4">
		{#each data.meals as meal}
			{@const mealEntries = entriesByMeal().get(meal.id) ?? []}
			{@const mealCalories = mealEntries.reduce((sum, e) => sum + (e.calories || 0), 0)}
			
			<div class="card">
				<div class="flex items-center justify-between mb-3 gap-3">
					<form method="POST" action="?/renameMeal" use:enhance={() => { return async ({ update }) => { await update(); await refreshPage(); }; }} class="flex items-center gap-2 flex-1 min-w-0">
						<input type="hidden" name="id" value={meal.id} />
						<input name="name" class="input text-sm font-semibold flex-1 min-w-0" value={meal.name} />
						{#if mealCalories > 0}
							<span class="text-sm text-[var(--color-text-muted)] whitespace-nowrap">{Math.round(mealCalories)} kcal</span>
						{/if}
					</form>
					<button onclick={() => openAddFoodModal(meal.id)} class="btn btn-secondary text-sm px-3 py-1">
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
									<button
										disabled={isSaving}
										onclick={() => onDeleteEntry(entry.id)}
										class="text-red-400 hover:text-red-300 p-1"
										title="Delete"
									>
										×
									</button>
								</div>
							</li>
							{#if editingEntryId === entry.id}
								<li class="py-2 px-2 bg-[var(--color-bg)] rounded-lg">
									<div class="flex items-center gap-3">
										<label for="edit-qty-{entry.id}" class="text-sm text-[var(--color-text-muted)]">Qty:</label>
										<input 
											id="edit-qty-{entry.id}"
											type="number" 
											bind:value={editServings}
											step="0.25" 
											min="0.25"
											class="input w-20 text-center"
										/>
										<button type="button" class="btn btn-primary text-sm px-3" disabled={isSaving} onclick={() => onUpdateEntry(entry.id, editServings)}>Save</button>
										<button type="button" onclick={() => editingEntryId = null} class="text-sm text-[var(--color-text-muted)]">Cancel</button>
									</div>
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
				<!-- Food search / select -->
			{#if !selectedFoodId}
				<FoodSearch
					allFoods={data.allFoods}
					recentFoodIds={data.recentFoodIds}
					on:select={async (e) => {
						selectedFoodId = e.detail.foodId;
						selectedFoodCache = e.detail.food ?? null;

						// If selected from OpenFoodFacts, refresh allFoods so the chosen item appears in the local list too
						if (e.detail.source === 'openfoodfacts') {
							await invalidateAll();
						}

						const food = data.allFoods.find((f) => f.id === e.detail.foodId) ?? e.detail.food;
						if (food?.servings?.length) {
							const defaultServing = food.servings.find((s) => s.isDefault) ?? food.servings[0];
							selectedServingId = defaultServing.id;
						}
					}}
				/>
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
						<input type="hidden" name="dayMealId" value={selectedMealId ?? ''} />
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
