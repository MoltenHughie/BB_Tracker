<script lang="ts">
	import { enhance } from '$app/forms';
	import { browser } from '$app/environment';
	import ExerciseCatalogImport from '$lib/components/ExerciseCatalogImport.svelte';

	let { data, form } = $props();
	
	let currentTheme = $state(browser ? (localStorage.getItem('bb-theme') ?? 'dark') : 'dark');

	// Handle export downloads
	$effect(() => {
		if (form?.exportJson) {
			downloadFile(form.exportJson, `bb-tracker-export-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
		}
		if (form?.csvData && form?.csvName) {
			downloadFile(form.csvData, form.csvName, 'text/csv');
		}
	});

	function downloadFile(content: string, filename: string, type: string) {
		const blob = new Blob([content], { type });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}

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

	<!-- Theme -->
	<section class="card">
		<div class="flex items-center justify-between">
			<div>
				<h2 class="text-lg font-semibold">🎨 Theme</h2>
				<p class="text-sm text-[var(--color-text-muted)]">Switch between dark and light mode</p>
			</div>
			<button
				onclick={() => {
					const html = document.documentElement;
					const current = html.getAttribute('data-theme') ?? 'dark';
					const next = current === 'dark' ? 'light' : 'dark';
					html.setAttribute('data-theme', next);
					localStorage.setItem('bb-theme', next);
					currentTheme = next;
				}}
				class="btn btn-secondary text-sm"
			>
				{currentTheme === 'light' ? '🌙 Dark' : '☀️ Light'}
			</button>
		</div>
	</section>

	<!-- Units -->
	<section class="card">
		<div class="flex items-center justify-between gap-4">
			<div>
				<h2 class="text-lg font-semibold">📏 Units</h2>
				<p class="text-sm text-[var(--color-text-muted)]">Choose metric or imperial</p>
			</div>
			<form method="POST" action="?/setUnitSystem" use:enhance class="flex items-center gap-2">
				<select name="unitSystem" class="input text-sm" onchange={(e) => (e.currentTarget.form as HTMLFormElement)?.requestSubmit()}>
					<option value="metric" selected={data.unitSystem !== 'imperial'}>Metric (kg, cm)</option>
					<option value="imperial" selected={data.unitSystem === 'imperial'}>Imperial (lbs, inches)</option>
				</select>
			</form>
		</div>
		<p class="text-xs text-[var(--color-text-muted)] mt-2">This updates unit labels across Training and Body pages.</p>
	</section>

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

	<!-- Meal Types removed (deprecated in favor of per-day meals on Calories tab) -->

	<!-- Exercise catalog (admin) -->
	<section class="card">
		<h2 class="text-lg font-semibold mb-2">🏋️ Exercise Catalog</h2>
		<p class="text-xs text-[var(--color-text-muted)] mb-3">
			Imports the free-exercise-db dataset into your local catalog. Safe to rerun (duplicates are ignored).
		</p>
		<ExerciseCatalogImport limit={50} />
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
				<h3 class="font-semibold">CSV Exports (for spreadsheets)</h3>
				<div class="flex gap-2">
					<form method="POST" action="?/exportCaloriesCSV" use:enhance class="flex-1">
						<button type="submit" class="btn-secondary w-full text-sm">
							🍎 Calories CSV
						</button>
					</form>
					<form method="POST" action="?/exportTrainingCSV" use:enhance class="flex-1">
						<button type="submit" class="btn-secondary w-full text-sm">
							💪 Training CSV
						</button>
					</form>
				</div>
				<p class="text-xs text-[var(--color-text-muted)]">
					Export calorie entries or training sets as CSV for analysis in Excel/Sheets.
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
