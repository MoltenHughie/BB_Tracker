<script lang="ts">
	/**
	 * ExerciseCatalogImport — prototype UI to import/refresh the free-exercise-db catalog.
	 *
	 * Local-first: writes into SQLite via server endpoint.
	 */

	type ImportResponse = {
		success: boolean;
		fetched: number;
		processed: number;
		attemptedInserts: number;
		url: string;
	};

	let { limit = null }: { limit?: number | null } = $props();

	let loading = $state(false);
	let errorMsg = $state<string | null>(null);
	let result = $state<ImportResponse | null>(null);

	import { buildExerciseCatalogImportUrl } from './exerciseCatalogImportLogic';

	async function runImport() {
		loading = true;
		errorMsg = null;
		result = null;

		try {
			const res = await fetch(buildExerciseCatalogImportUrl(limit), { method: 'POST' });
			if (!res.ok) {
				const txt = await res.text().catch(() => '');
				throw new Error(txt || `Import failed (${res.status})`);
			}
			result = (await res.json()) as ImportResponse;
		} catch (e) {
			errorMsg = e instanceof Error ? e.message : String(e);
		} finally {
			loading = false;
		}
	}
</script>

<section class="card" aria-label="Exercise catalog import">
	<div class="header">
		<h3>🏋️ Exercise Catalog</h3>
		<p class="sub">Import exercises from free-exercise-db into your local catalog.</p>
	</div>

	<div class="actions">
		<button type="button" class="btn" onclick={runImport} disabled={loading}>
			{loading ? 'Importing…' : 'Import / Refresh'}
		</button>
		{#if limit}
			<span class="hint">Limit: {limit}</span>
		{/if}
	</div>

	{#if errorMsg}
		<p class="err" role="alert">{errorMsg}</p>
	{/if}

	{#if result}
		<div class="result">
			<div class="row"><span class="k">Fetched</span><span class="v">{result.fetched}</span></div>
			<div class="row"><span class="k">Processed</span><span class="v">{result.processed}</span></div>
			<div class="row"><span class="k">Inserted (attempted)</span><span class="v">{result.attemptedInserts}</span></div>
			<a class="link" href={result.url} target="_blank" rel="noreferrer">Source dataset</a>
		</div>
	{/if}
</section>

<style>
	.card {
		border: 1px solid var(--color-border);
		border-radius: 14px;
		padding: 14px;
		background: var(--color-surface);
	}

	.header h3 {
		margin: 0;
		font-size: 1rem;
	}

	.sub {
		margin: 6px 0 0;
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}

	.actions {
		margin-top: 10px;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.btn {
		background: #111827;
		color: white;
		border: none;
		border-radius: 10px;
		padding: 10px 12px;
		font-weight: 700;
		cursor: pointer;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.hint {
		font-size: 0.8rem;
		color: var(--color-text-muted);
	}

	.err {
		margin-top: 10px;
		color: #b91c1c;
		font-size: 0.85rem;
	}

	.result {
		margin-top: 10px;
		padding: 10px;
		border-radius: 12px;
		background: #f8fafc;
		border: 1px solid var(--color-border);
		display: grid;
		gap: 6px;
	}

	.row {
		display: flex;
		justify-content: space-between;
		gap: 10px;
		font-size: 0.85rem;
	}

	.k {
		color: var(--color-text-muted);
	}

	.v {
		font-weight: 800;
		color: #0f172a;
	}

	.link {
		font-size: 0.8rem;
		color: #1d4ed8;
		text-decoration: none;
	}
	.link:hover { text-decoration: underline; }
</style>
