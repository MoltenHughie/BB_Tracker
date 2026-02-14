import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest';
import { fetchOFFSearch, saveOFFByBarcode, shouldSearchOFF } from './foodSearchLogic';

describe('foodSearchLogic (component logic)', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	test('shouldSearchOFF enforces >=2 chars after trim', () => {
		expect(shouldSearchOFF('')).toBe(false);
		expect(shouldSearchOFF(' a ')).toBe(false);
		expect(shouldSearchOFF('ab')).toBe(true);
	});

	test('fetchOFFSearch returns [] for short query without calling fetch', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

		const res = await fetchOFFSearch(' a ');
		expect(res).toEqual([]);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	test('fetchOFFSearch calls API and returns results', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: true,
				status: 200,
				json: async () => ({ results: [{ name: 'X', calories: 1, protein: 0, carbs: 0, fat: 0 }] })
			})) as unknown as typeof fetch
		);

		const res = await fetchOFFSearch('ab');
		expect(res.length).toBe(1);
		expect(res[0].name).toBe('X');
	});

	test('fetchOFFSearch throws on non-ok response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: false,
				status: 500,
				json: async () => ({})
			})) as unknown as typeof fetch
		);

		await expect(fetchOFFSearch('ab')).rejects.toThrow(/OFF search failed/);
	});

	test('saveOFFByBarcode POSTs and returns parsed JSON', async () => {
		const fetchMock = vi.fn(async (_input: any, init?: RequestInit) => {
			expect(init?.method).toBe('POST');
			return { ok: true, status: 200, json: async () => ({ id: 1 }) } as Response;
		});
		vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

		const res = await saveOFFByBarcode('999');
		expect(res).toEqual({ id: 1 });
	});

	test('saveOFFByBarcode throws on non-ok response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: false,
				status: 404,
				json: async () => ({})
			})) as unknown as typeof fetch
		);

		await expect(saveOFFByBarcode('999')).rejects.toThrow(/OFF save failed/);
	});
});
