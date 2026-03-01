import { writable } from 'svelte/store';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
	id: string;
	kind: ToastKind;
	message: string;
	details?: string;
	createdAt: number;
	autoCloseMs?: number;
}

function uid() {
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const toasts = writable<Toast[]>([]);

export function pushToast(input: Omit<Toast, 'id' | 'createdAt'>) {
	const toast: Toast = { id: uid(), createdAt: Date.now(), autoCloseMs: 4500, ...input };
	toasts.update((xs) => [toast, ...xs].slice(0, 5));
	if (toast.autoCloseMs && toast.autoCloseMs > 0) {
		setTimeout(() => {
			toasts.update((xs) => xs.filter((t) => t.id !== toast.id));
		}, toast.autoCloseMs);
	}
	return toast.id;
}

export function dismissToast(id: string) {
	toasts.update((xs) => xs.filter((t) => t.id !== id));
}
