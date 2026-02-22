import fs from 'node:fs/promises';
import path from 'node:path';

const url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const outPath = path.resolve('static/datasets/free-exercise-db.exercises.json');

const res = await fetch(url);
if (!res.ok) {
	throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
}
const text = await res.text();
await fs.mkdir(path.dirname(outPath), { recursive: true });
await fs.writeFile(outPath, text, 'utf8');

console.log(`Wrote ${outPath} (${text.length} chars)`);
