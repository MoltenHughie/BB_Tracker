<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	type LocalFood = {
		id: number;
		name: string;
		brand?: string | null;
		calories: number;
		protein: number;
		carbs: number;
		fat: number;
		servings: Array<{ id: number; name: string; grams: number; isDefault: boolean | null }>;
	};

	import {
		fetchOFFSearch,
		saveOFFByBarcode,
		shouldSearchOFF,
		OFF_SEARCH_DEBOUNCE_MS,
		type OffResult
	} from './foodSearchLogic';

	const dispatch = createEventDispatcher<{
		select: {
			foodId: number;
			source: 'local' | 'openfoodfacts';
			food?: Partial<LocalFood> | null;
		};
	}>();

	let {
		allFoods,
		recentFoodIds = []
	}: {
		allFoods: LocalFood[];
		recentFoodIds?: number[];
	} = $props();

	let searchQuery = $state('');
	let searchTab = $state<'local' | 'online'>('local');

	let offResults = $state<OffResult[]>([]);
	let offSearching = $state(false);
	let offError = $state<string | null>(null);
	let offSearchTimeout: ReturnType<typeof setTimeout> | null = null;

	const recentFoods = $derived(
		recentFoodIds
			.map((id) => allFoods.find((f) => f.id === id))
			.filter((f): f is NonNullable<typeof f> => f != null)
	);

	const filteredFoods = $derived(
		searchQuery.length > 0
			? allFoods.filter(
					(f) =>
						f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
						f.brand?.toLowerCase().includes(searchQuery.toLowerCase())
			  )
			: allFoods.slice(0, 20)
	);

	async function searchOFF(query: string) {
		offError = null;
		if (!shouldSearchOFF(query)) {
			offResults = [];
			return;
		}
		offSearching = true;
		try {
			offResults = await fetchOFFSearch(query);
		} catch (e) {
			offResults = [];
			offError = 'OpenFoodFacts search failed. Check your connection and try again.';
		} finally {
			offSearching = false;
		}
	}

	async function saveAndSelectOFF(product: OffResult) {
		if (!product.barcode) return;
		offError = null;
		try {
			const saved = await saveOFFByBarcode(product.barcode);
			if (saved?.id) {
				dispatch('select', { foodId: saved.id, source: 'openfoodfacts', food: saved });
			}
		} catch {
			offError = 'Could not import this product from OpenFoodFacts.';
		}
	}

	function onSearchInput(query: string) {
		searchQuery = query;
		if (searchTab === 'online') {
			if (offSearchTimeout) clearTimeout(offSearchTimeout);
			offSearchTimeout = setTimeout(() => searchOFF(query), OFF_SEARCH_DEBOUNCE_MS);
		}
	}
</script>

<div class="space-y-3">
	<input
		type="text"
		placeholder="Search foods..."
		value={searchQuery}
		oninput={(e) => onSearchInput((e.target as HTMLInputElement).value)}
		class="input"
	/>

	<div class="flex gap-2">
		<button
			onclick={() => (searchTab = 'local')}
			class="px-3 py-1 rounded-full text-sm transition-colors {searchTab === 'local'
				? 'bg-[var(--color-primary)] text-white'
				: 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'}"
		>
			My Foods
		</button>
		<button
			onclick={() => {
				searchTab = 'online';
				if (searchQuery.trim().length >= 2) searchOFF(searchQuery);
			}}
			class="px-3 py-1 rounded-full text-sm transition-colors {searchTab === 'online'
				? 'bg-[var(--color-primary)] text-white'
				: 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'}"
		>
			🌐 OpenFoodFacts
		</button>
	</div>

	{#if searchTab === 'local'}
		{#if recentFoods.length > 0 && searchQuery.length === 0}
			<div>
				<div class="text-xs font-medium text-[var(--color-text-muted)] mb-2">⚡ Recent</div>
				<div class="flex flex-wrap gap-2">
					{#each recentFoods as food}
						<button
							onclick={() => dispatch('select', { foodId: food.id, source: 'local', food })}
							class="px-3 py-1.5 rounded-full text-xs bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] transition-colors border border-[var(--color-surface-hover)]"
						>
							{food.name}
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<ul class="space-y-2 max-h-60 overflow-y-auto">
			{#each filteredFoods as food}
				<li>
					<button
						onclick={() => dispatch('select', { foodId: food.id, source: 'local', food })}
						class="w-full text-left p-3 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] transition-colors border border-[var(--color-surface-hover)]"
					>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0">
								<div class="font-medium truncate">{food.name}</div>
								{#if food.brand}
									<div class="text-xs italic text-[var(--color-text-muted)] truncate">
										{food.brand}
									</div>
								{/if}
							</div>
							<div class="text-right shrink-0">
								<div class="text-sm font-medium">{food.calories} kcal</div>
								<div class="text-xs text-[var(--color-text-muted)]">/100g</div>
							</div>
						</div>
						<div class="text-sm text-[var(--color-text-muted)] mt-1">
							P{food.protein}g • C{food.carbs}g • F{food.fat}g
						</div>
					</button>
				</li>
			{/each}
		</ul>

		{#if filteredFoods.length === 0}
			<p class="text-center text-[var(--color-text-muted)] py-4">
				No foods found. Try searching <button
					onclick={() => {
						searchTab = 'online';
						searchOFF(searchQuery);
					}}
					class="text-[var(--color-primary)] underline"
				>OpenFoodFacts</button> or create a new food.
			</p>
		{/if}
	{:else}
		{#if offError}
			<div class="p-3 rounded-lg border border-red-400/30 bg-red-500/5 text-sm">
				<div class="text-red-400 font-medium">{offError}</div>
				<button
					onclick={() => searchOFF(searchQuery)}
					class="mt-2 text-[var(--color-primary)] underline text-sm"
				>
					Retry
				</button>
			</div>
		{:else if offSearching}
			<div class="text-center py-4 text-[var(--color-text-muted)]">Searching OpenFoodFacts...</div>
		{:else if offResults.length > 0}
			<ul class="space-y-2 max-h-60 overflow-y-auto">
				{#each offResults as product}
					<li>
						<button
							onclick={() => saveAndSelectOFF(product)}
							class="w-full text-left p-3 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] transition-colors border border-[var(--color-surface-hover)]"
						>
							<div class="flex items-start justify-between gap-3">
								<div class="min-w-0">
									<div class="font-medium truncate">{product.name}</div>
									{#if product.brand}
										<div class="text-xs italic text-[var(--color-text-muted)] truncate">
											{product.brand}
										</div>
									{/if}
								</div>
								<div class="text-right shrink-0">
									<div class="text-sm font-medium">{product.calories} kcal</div>
									<div class="text-xs text-[var(--color-text-muted)]">/100g</div>
								</div>
							</div>
							<div class="text-sm text-[var(--color-text-muted)] mt-1">
								P{product.protein}g • C{product.carbs}g • F{product.fat}g
							</div>
						</button>
					</li>
				{/each}
			</ul>
		{:else if searchQuery.trim().length >= 2}
			<p class="text-center text-[var(--color-text-muted)] py-4">No results found on OpenFoodFacts.</p>
		{:else}
			<p class="text-center text-[var(--color-text-muted)] py-4">Type at least 2 characters to search.</p>
		{/if}
	{/if}
</div>
