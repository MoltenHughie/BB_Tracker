<script lang="ts">
	import { toasts, dismissToast } from '$lib/stores/toast';
</script>

<div class="fixed top-4 right-4 z-[100] space-y-2 max-w-sm">
	{#each $toasts as t (t.id)}
		{@const borderClass =
			t.kind === 'success'
				? 'border-green-500/40'
				: t.kind === 'error'
					? 'border-red-500/40'
					: 'border-slate-500/30'}
		<div class={`rounded-xl shadow-lg border px-4 py-3 text-sm bg-[var(--color-surface)] ${borderClass}`}>
			<div class="flex items-start gap-3">
				<div class="mt-0.5">
					{#if t.kind === 'success'}✅{:else if t.kind === 'error'}⚠️{:else}ℹ️{/if}
				</div>
				<div class="flex-1 min-w-0">
					<div class="font-medium break-words">{t.message}</div>
					{#if t.details}
						<div class="text-xs text-[var(--color-text-muted)] mt-1 break-words">{t.details}</div>
					{/if}
				</div>
				<button
					class="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
					onclick={() => dismissToast(t.id)}
					title="Dismiss"
				>
					×
				</button>
			</div>
		</div>
	{/each}
</div>
