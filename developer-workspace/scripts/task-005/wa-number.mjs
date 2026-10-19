// TASK-005 plan Task 29 — the saved showroom number, read / cleared / restored for the live witness.
//
// This is the only store write in Task 29 and it is net-zero: `clear` first writes the exact row
// (key, value, updated_at) to `runs/task29/saved-number.json`, then deletes the one row; `restore`
// puts the same row back, timestamp included, so the store afterwards is byte-for-byte the one it
// was. Nothing else in the store is touched.
//
// usage: node wa-number.mjs read|clear|restore [run-label]   (default run label: task29)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (expected in .env.local).");
  process.exit(2);
}
const sql = neon(url);

const RUN_LABEL = process.argv[3] ?? "task29";
if (!/^[a-z0-9-]+$/.test(RUN_LABEL)) {
  console.error(`bad run label: ${RUN_LABEL}`);
  process.exit(2);
}
const RUNS = new URL(`./runs/${RUN_LABEL}/`, import.meta.url).pathname;
mkdirSync(RUNS, { recursive: true });
const BACKUP = `${RUNS}saved-number.json`;
const KEY = "whatsapp_number";

async function current() {
  const rows = await sql.query("SELECT key, value, updated_at FROM setting WHERE key = $1", [KEY]);
  return rows[0] ?? null;
}

const command = process.argv[2];

if (command === "read") {
  console.log(JSON.stringify({ row: await current() }));
} else if (command === "clear") {
  if (existsSync(BACKUP)) {
    console.error(`refusing: ${BACKUP} already exists — restore it before clearing again.`);
    process.exit(1);
  }
  const row = await current();
  if (!row) {
    console.log(JSON.stringify({ cleared: false, reason: "no row was saved" }));
    process.exit(0);
  }
  writeFileSync(BACKUP, JSON.stringify(row, null, 2) + "\n");
  await sql.query("DELETE FROM setting WHERE key = $1", [KEY]);
  const after = await current();
  console.log(JSON.stringify({ cleared: after === null, saved: row }));
} else if (command === "restore") {
  if (!existsSync(BACKUP)) {
    console.error(`refusing: no backup at ${BACKUP}`);
    process.exit(1);
  }
  const saved = JSON.parse(readFileSync(BACKUP, "utf8"));
  await sql.query(
    `INSERT INTO setting (key, value, updated_at) VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at`,
    [saved.key, saved.value, saved.updated_at],
  );
  const after = await current();
  const same =
    after !== null &&
    after.key === saved.key &&
    after.value === saved.value &&
    new Date(after.updated_at).toISOString() === new Date(saved.updated_at).toISOString();
  console.log(JSON.stringify({ restored: same, after }));
  if (!same) process.exitCode = 1;
} else {
  console.error("usage: node wa-number.mjs read|clear|restore [run-label]");
  process.exit(2);
}
