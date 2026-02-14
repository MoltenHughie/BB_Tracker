<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	type Exercise = {
		id: number;
		name: string;
		category: string | null;
		equipment: string | null;
		[k: string]: any;
	};

	type CatalogEntry = {
		id?: number;
		name: string;
		category: string | null;
		equipment: string | null;
		[k: string]: any;
	};

	interface $$Props {
		exercises: Exercise[];
		catalogEntries?: CatalogEntry[];
		historyHrefForExerciseId?: ((id: number) => string) | null;
		catalogLimit?: number;
	}

	let {
		exercises,
		catalogEntries = [],
		historyHrefForExerciseId = null,
		catalogLimit = 25
	} = $props();

	const dispatch = createEventDispatcher<{
		selectExercise: Exercise;
		prefillFromCatalog: CatalogEntry;
		createCustomRequested: void;
	}>();

	let query = $state('');
	let category = $state<string | null>(null);

	import {
		deriveCategories,
		filterByQueryAndCategory,
		filterCatalogEntries
	} from '$lib/components/exerciseSearchLogic';

	const filteredExercises = $derived(() => {
		return filterByQueryAndCategory(exercises, query, category);
	});

	const filteredCatalog = $derived(() => {
		return filterCatalogEntries(catalogEntries, query, category, catalogLimit);
	});

	const categories = $derived(() => {
		return deriveCategories(exercises, catalogEntries);
	});
</script>

<div class="space-y-3">
	<input type="text" placeholder="Search exercises..." bind:value={query} class="input" />

	<div class="flex gap-2 flex-wrap">
		<button
			type="button"
			onclick={() => (category = null)}
			class="px-3 py-1 rounded-full text-sm transition-colors {!category
				? 'bg-[var(--color-primary)] text-white'
				: 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'}"
		>
			All
		</button>
		{#each categories() as cat}
			<button
				type="button"
				onclick={() => (category = cat)}
				class="px-3 py-1 rounded-full text-sm transition-colors capitalize {category === cat
					? 'bg-[var(--color-primary)] text-white'
					: 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'}"
			>
				{cat}
			</button>
		{/each}
	</div>
</div>

<div class="space-y-4">
	<ul class="space-y-1">
		{#each filteredExercises() as ex}
			<li>
				<div class="flex items-stretch gap-2">
					<button
						type="button"
						onclick={() => dispatch('selectExercise', ex)}
						class="flex-1 text-left p-3 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors"
					>
						<div class="font-medium">{ex.name}</div>
						<div class="text-sm text-[var(--color-text-muted)] capitalize">
							{ex.category} • {ex.equipment}
						</div>
					</button>

					{#if historyHrefForExerciseId}
						<a
							href={historyHrefForExerciseId(ex.id)}
							class="px-3 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] flex items-center justify-center text-sm text-[var(--color-text-muted)]"
							title="View history"
						>
							📈
						</a>
					{/if}
				</div>
			</li>
		{/each}
	</ul>

	{#if filteredCatalog().length > 0}
		<div>
			<div class="text-xs uppercase tracking-wide text-[var(--color-text-muted)] mb-2">Catalog (prefill)</div>
			<ul class="space-y-1">
				{#each filteredCatalog() as entry}
					<li>
						<button
							type="button"
							onclick={() => dispatch('prefillFromCatalog', entry)}
							class="w-full text-left p-3 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] transition-colors"
						>
							<div class="font-medium">{entry.name}</div>
							<div class="text-sm text-[var(--color-text-muted)] capitalize">
								{entry.category} • {entry.equipment}
							</div>
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{/if}

	<button
		type="button"
		onclick={() => dispatch('createCustomRequested')}
		class="w-full text-center p-2 rounded-lg border border-dashed border-[var(--color-surface-hover)] text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors"
	>
		+ Create Custom Exercise
	</button>
</div>
