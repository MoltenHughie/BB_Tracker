export class ApiError extends Error {
	status: number;
	body: unknown;

	constructor(status: number, message: string, body?: unknown) {
		super(message);
		this.status = status;
		this.body = body;
	}
}

export async function fetchJson<T>(
	input: RequestInfo | URL,
	init?: RequestInit
): Promise<T> {
	const res = await fetch(input, {
		...init,
		headers: {
			Accept: 'application/json',
			...(init?.body ? { 'Content-Type': 'application/json' } : {}),
			...(init?.headers ?? {})
		}
	});

	const text = await res.text();
	const body = text ? safeJsonParse(text) : undefined;

	if (!res.ok) {
		throw new ApiError(res.status, `API error ${res.status}`, body);
	}
	return body as T;
}

function safeJsonParse(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}
