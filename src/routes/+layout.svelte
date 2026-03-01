<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import ToastHost from '$lib/components/ToastHost.svelte';

	let { children } = $props();

	// Theme handling — apply stored theme on mount
	$effect(() => {
		if (browser) {
			const stored = localStorage.getItem('bb-theme') ?? 'dark';
			document.documentElement.setAttribute('data-theme', stored);
		}
	});

	const navItems = [
		{ href: '/', label: 'Home', icon: '🏠' },
		{ href: '/calories', label: 'Calories', icon: '🍎' },
		{ href: '/training', label: 'Training', icon: '💪' },
		{ href: '/supplements', label: 'Supps', icon: '💊' },
		{ href: '/body', label: 'Body', icon: '📏' },
		{ href: '/foods', label: 'Foods', icon: '📚' },
		{ href: '/settings', label: 'Settings', icon: '⚙️' }
	];
</script>

<svelte:head>
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
	<meta name="theme-color" content="#0f172a" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<link rel="manifest" href="/manifest.json" />
	<title>BB Tracker</title>
</svelte:head>

<ToastHost />

<div class="min-h-screen flex flex-col">
	<!-- Main content area -->
	<main class="flex-1 px-4 py-6 max-w-2xl mx-auto w-full">
		{@render children()}
	</main>

	<!-- Bottom navigation (mobile-first) -->
	<nav class="fixed bottom-0 left-0 right-0 h-[var(--nav-height)] bg-[var(--color-surface)] border-t border-[var(--color-surface-hover)] safe-area-inset-bottom">
		<div class="flex items-center justify-around h-full max-w-lg mx-auto">
			{#each navItems as item}
				{@const isActive = item.href === '/' ? $page.url.pathname === '/' : $page.url.pathname.startsWith(item.href)}
				<a
					href={item.href}
					class="flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors duration-200 {isActive
						? 'text-[var(--color-primary)]'
						: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'}"
				>
					<span class="text-xl">{item.icon}</span>
					<span class="text-xs font-medium">{item.label}</span>
				</a>
			{/each}
		</div>
	</nav>
</div>

<style>
	/* Safe area padding for iOS notch/home indicator */
	.safe-area-inset-bottom {
		padding-bottom: env(safe-area-inset-bottom, 0);
	}
</style>
