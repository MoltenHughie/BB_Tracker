<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	let { data } = $props();

	let editingId = $state<number | null>(null);
	let showAddModal = $state(false);
	let confirmDeleteId = $state<number | null>(null);
	// eslint-disable-next-line -- intentional one-time capture
	let searchInput = $state('' + data.search);
	let searchTimeout: ReturnType<typeof setTimeout> | null = null;

	function onSearch(value: string) {
		searchInput = value;
		if (searchTimeout) clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			const params = new URLSearchParams(window.location.search);
			if (value) params.set('q', value);
			else params.delete('q');
			goto(`/foods?${params.toString()}`, { replaceState: true });
		}, 300);
	}

	function filterSource(source: string) {
		const params = new URLSearchParams(window.location.search);
		if (source === 'all') params.delete('source');
		else params.set('source', source);
		goto(`/foods?${params.toString()}`, { replaceState: true });
	}
</script>

<div class="space-y-6 pb-4">
	<header class="space-y-2">
		<div class="flex items-center justify-between">
			<h1 class="text-2xl font-bold">🍎 Food Library</h1>
			<button onclick={() => showAddModal = true} class="btn btn-primary text-sm px-3 py-1">+ New Food</button>
		</div>
		<p class="text-sm text-[var(--color-text-muted)]">{data.foods.length} foods</p>
	</header>

	<!-- Search + filters -->
	<div class="space-y-3">
		<input
			type="text"
			placeholder="Search foods..."
			value={searchInput}
			oninput={(e) => onSearch((e.target as HTMLInputElement).value)}
			class="input"
		/>
		<div class="flex gap-2">
			{#each [['all', 'All'], ['custom', 'Custom'], ['openfoodfacts', 'OFF']] as [val, label]}
				<button
					onclick={() => filterSource(val)}
					class="px-3 py-1 rounded-full text-sm transition-colors {data.source === val
						? 'bg-[var(--color-primary)] text-white'
						: 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'}"
				>
					{label}
				</button>
			{/each}
		</div>
	</div>

	<!-- Food list -->
	<div class="space-y-2">
		{#each data.foods as food}
			<div class="card">
				{#if editingId === food.id}
					<!-- Edit form -->
					<form
						method="POST"
						action="?/editFood"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								editingId = null;
							};
						}}
						class="space-y-3"
					>
						<input type="hidden" name="foodId" value={food.id} />
						<div>
							<label for="edit-name-{food.id}" class="block text-xs text-[var(--color-text-muted)] mb-1">Name</label>
							<input id="edit-name-{food.id}" type="text" name="name" value={food.name} required class="input" />
						</div>
						<div>
							<label for="edit-brand-{food.id}" class="block text-xs text-[var(--color-text-muted)] mb-1">Brand</label>
							<input id="edit-brand-{food.id}" type="text" name="brand" value={food.brand ?? ''} class="input" />
						</div>
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="edit-cal-{food.id}" class="block text-xs text-[var(--color-text-muted)] mb-1">Calories/100g</label>
								<input id="edit-cal-{food.id}" type="number" name="calories" value={food.calories} required min="0" step="0.1" class="input" />
							</div>
							<div>
								<label for="edit-prot-{food.id}" class="block text-xs text-[var(--color-text-muted)] mb-1">Protein (g)</label>
								<input id="edit-prot-{food.id}" type="number" name="protein" value={food.protein} min="0" step="0.1" class="input" />
							</div>
							<div>
								<label for="edit-carbs-{food.id}" class="block text-xs text-[var(--color-text-muted)] mb-1">Carbs (g)</label>
								<input id="edit-carbs-{food.id}" type="number" name="carbs" value={food.carbs} min="0" step="0.1" class="input" />
							</div>
							<div>
								<label for="edit-fat-{food.id}" class="block text-xs text-[var(--color-text-muted)] mb-1">Fat (g)</label>
								<input id="edit-fat-{food.id}" type="number" name="fat" value={food.fat} min="0" step="0.1" class="input" />
							</div>
						</div>
						<div class="flex gap-2">
							<button type="submit" class="btn btn-primary text-sm flex-1">Save</button>
							<button type="button" onclick={() => editingId = null} class="btn btn-secondary text-sm flex-1">Cancel</button>
						</div>
					</form>
				{:else}
					<!-- Display -->
					<button
						onclick={() => editingId = food.id}
						class="w-full text-left"
					>
						<div class="flex items-start justify-between">
							<div class="min-w-0 flex-1">
								<div class="font-medium truncate">{food.name}</div>
								{#if food.brand}
									<div class="text-xs text-[var(--color-text-muted)] italic">{food.brand}</div>
								{/if}
								<div class="text-sm text-[var(--color-text-muted)] mt-1">
									{food.calories} kcal • P{food.protein}g C{food.carbs}g F{food.fat}g
								</div>
							</div>
							<div class="text-right shrink-0 ml-3">
								<div class="text-xs px-2 py-0.5 rounded-full {food.source === 'custom' ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'}">
									{food.source === 'openfoodfacts' ? 'OFF' : food.source}
								</div>
								<div class="text-xs text-[var(--color-text-muted)] mt-1">
									{food.usageCount}× used
								</div>
							</div>
						</div>
					</button>

					{#if confirmDeleteId === food.id}
						<div class="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
							<p class="text-sm mb-2">Delete <strong>{food.name}</strong> and all its log entries?</p>
							<div class="flex gap-2">
								<form method="POST" action="?/deleteFood" use:enhance class="flex-1">
									<input type="hidden" name="foodId" value={food.id} />
									<button type="submit" class="btn w-full text-sm bg-red-500 hover:bg-red-600 text-white">Delete</button>
								</form>
								<button onclick={() => confirmDeleteId = null} class="btn btn-secondary text-sm flex-1">Cancel</button>
							</div>
						</div>
					{/if}
				{/if}

				{#if editingId !== food.id && confirmDeleteId !== food.id}
					<div class="flex justify-end mt-2 gap-2">
						<button onclick={() => editingId = food.id} class="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]">✏️ Edit</button>
						<button onclick={() => confirmDeleteId = food.id} class="text-xs text-red-400 hover:text-red-300">🗑️ Delete</button>
					</div>
				{/if}
			</div>
		{/each}

		{#if data.foods.length === 0}
			<div class="card text-center text-[var(--color-text-muted)] py-8">
				<p>No foods found.</p>
				<button onclick={() => showAddModal = true} class="text-[var(--color-primary)] mt-2">Create your first food →</button>
			</div>
		{/if}
	</div>
</div>

<!-- Add Food Modal -->
{#if showAddModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Add Custom Food</h3>
				<button onclick={() => showAddModal = false} class="text-2xl">×</button>
			</div>
			<form
				method="POST"
				action="?/addFood"
				use:enhance={() => {
					return async ({ update, result }) => {
						await update();
						if (result.type === 'success') showAddModal = false;
					};
				}}
				class="p-4 space-y-4"
			>
				<div>
					<label for="add-name" class="block text-sm mb-1">Name *</label>
					<input id="add-name" type="text" name="name" required class="input" placeholder="e.g., Chicken breast" />
				</div>
				<div>
					<label for="add-brand" class="block text-sm mb-1">Brand</label>
					<input id="add-brand" type="text" name="brand" class="input" placeholder="Optional" />
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label for="add-cal" class="block text-sm mb-1">Calories/100g *</label>
						<input id="add-cal" type="number" name="calories" required min="0" step="0.1" class="input" />
					</div>
					<div>
						<label for="add-prot" class="block text-sm mb-1">Protein (g)</label>
						<input id="add-prot" type="number" name="protein" min="0" step="0.1" class="input" />
					</div>
					<div>
						<label for="add-carbs" class="block text-sm mb-1">Carbs (g)</label>
						<input id="add-carbs" type="number" name="carbs" min="0" step="0.1" class="input" />
					</div>
					<div>
						<label for="add-fat" class="block text-sm mb-1">Fat (g)</label>
						<input id="add-fat" type="number" name="fat" min="0" step="0.1" class="input" />
					</div>
				</div>
				<p class="text-xs text-[var(--color-text-muted)]">All values per 100g.</p>
				<button type="submit" class="btn btn-primary w-full">Create Food</button>
			</form>
		</div>
	</div>
{/if}
