// Bundle report: reports the size of each chunk in .next/static/chunks and flags any chunk
// above the per-chunk budget (~220 KB). Run after `npm run build`.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const CHUNKS_DIR = join(process.cwd(), '.next', 'static', 'chunks');
const BUDGET_BYTES = 220 * 1024; // ~220 KB per chunk budget

const entries = readdirSync(CHUNKS_DIR)
  .filter((f) => f.endsWith('.js'))
  .map((f) => ({ name: f, path: join(CHUNKS_DIR, f), size: statSync(join(CHUNKS_DIR, f)).size }))
  .sort((a, b) => b.size - a.size);

let breached = 0;
let total = 0;
for (const entry of entries) {
  total += entry.size;
  if (entry.size > BUDGET_BYTES) {
    breached += 1;
    console.log(
      `BREACH: ${entry.name} = ${(entry.size / 1024).toFixed(1)} KB (> ${BUDGET_BYTES / 1024} KB budget)`
    );
  } else {
    console.log(`OK: ${entry.name} = ${(entry.size / 1024).toFixed(1)} KB`);
  }
}

console.log(`\nTotal chunks: ${entries.length}`);
console.log(`Total size: ${(total / 1024 / 1024).toFixed(2)} MB`);
console.log(`Breaches: ${breached}`);
if (breached > 0) {
  console.log(
    `\nBUNDLE BUDGET BREACH: ${breached} chunk(s) exceed the ${BUDGET_BYTES / 1024} KB budget.`
  );
  process.exitCode = 1;
} else {
  console.log('\nNo bundle budget breach.');
}
