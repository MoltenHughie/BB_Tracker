<script lang="ts">
	import { enhance } from '$app/forms';

	let { data, form } = $props();

	// Handle export download
	$effect(() => {
		if (form?.exportJson) {
			const blob = new Blob([form.exportJson], { type: 'application/json' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `bb-tracker-export-${new Date().toISOString().split('T')[0]}.json`;
			a.click();
			URL.revokeObjectURL(url);
		}
	});

	const alert = $derived(
		form?.error
			? { kind: 'error' as const, text: form.error as string }
			: form?.success
				? { kind: 'success' as const, text: 'Import complete. Refresh to see updated stats.' }
				: null
	);

	const statItems = $derived([
		{ label: 'Foods in library', value: data.stats.foods, icon: '🍎' },
		{ label: 'Food log entries', value: data.stats.foodEntries, icon: '📝' },
		{ label: 'Workouts', value: data.stats.workouts, icon: '💪' },
		{ label: 'Sets logged', value: data.stats.sets, icon: '🏋️' },
		{ label: 'Exercises', value: data.stats.exercises, icon: '📋' },
		{ label: 'Supplements', value: data.stats.supplements, icon: '💊' },
		{ label: 'Supplement logs', value: data.stats.supplementLogs, icon: '✅' },
		{ label: 'Weight entries', value: data.stats.weights, icon: '⚖️' },
		{ label: 'Measurements', value: data.stats.measurements, icon: '📏' },
	]);
</script>

<div class="space-y-6">
	<header class="text-center">
		<h1 class="text-2xl font-bold">Settings</h1>
	</header>

	{#if alert}
		<div class={alert.kind === 'error' ? 'card border border-red-500/30 bg-red-500/10 text-red-200' : 'card border border-emerald-500/30 bg-emerald-500/10 text-emerald-200'}>
			{alert.text}
		</div>
	{/if}

	<!-- Database Stats -->
	<section class="card">
		<h2 class="text-lg font-semibold mb-4">📊 Database Stats</h2>
		<div class="grid grid-cols-2 gap-3">
			{#each statItems as item}
				<div class="flex items-center gap-2">
					<span>{item.icon}</span>
					<div>
						<div class="text-lg font-bold">{item.value}</div>
						<div class="text-xs text-[var(--color-text-muted)]">{item.label}</div>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- Data Management -->
	<section class="card">
		<h2 class="text-lg font-semibold mb-4">💾 Data Management</h2>

		<div class="space-y-6">
			<div class="space-y-3">
				<form method="POST" action="?/exportData" use:enhance>
					<button type="submit" class="btn-primary w-full">
						📥 Export All Data (JSON)
					</button>
				</form>
				<p class="text-xs text-[var(--color-text-muted)]">
					Downloads a complete backup of all your data as a JSON file.
				</p>
			</div>

			<div class="border-t border-[var(--color-border)] pt-5 space-y-3">
				<h3 class="font-semibold">Restore from backup</h3>
				<form method="POST" action="?/importData" enctype="multipart/form-data" use:enhance>
					<input
						type="file"
						name="backup"
						accept="application/json"
						required
						class="block w-full text-sm"
					/>
					<button type="submit" class="btn-secondary w-full mt-3">
						📤 Import (overwrite)
					</button>
				</form>
				<p class="text-xs text-[var(--color-text-muted)]">
					<strong>Warning:</strong> this overwrites your current database contents.
				</p>
			</div>
		</div>
	</section>

	<!-- About -->
	<section class="card">
		<h2 class="text-lg font-semibold mb-4">ℹ️ About</h2>
		<div class="space-y-2 text-sm text-[var(--color-text-muted)]">
			<p><strong>BB Tracker</strong> — Bodybuilding & nutrition tracker</p>
			<p>SvelteKit + Drizzle ORM + SQLite</p>
			<p>All data stored locally on your device.</p>
		</div>
	</section>
</div>
