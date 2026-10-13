// Proof that 0015 refuses to drop `office_car` while it still holds a car the one table does not.
//
// The guard is the point of the migration: the drop must not be the thing that loses a record the
// owner never agreed to lose. This runs the whole chain on its own scratch database, leaves the
// chain at 0001…0014, and then tries to apply 0015 twice:
//
//   with a row in `office_car` whose ref no car carries   → must REFUSE, and change nothing
//   with that row gone                                    → must drop the table
//
// Run:  node --env-file=.env.local developer-workspace/scripts/task-003/refusal-0015.mjs

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const DB = "truespec_scratch_003c";
const PROJECT = process.cwd();
const WORK = "/tmp/opencode/mig-003c";
const MIGRATION = "0015_retire_office_car.sql";

const base = new URL(process.env.DATABASE_URL);
const scratchUrl = new URL(base);
scratchUrl.pathname = `/${DB}`;
const scratch = scratchUrl.toString();

const admin = new Client({ connectionString: base.toString() });
const run = (client, sql) => client.query(sql);

console.log(`scratch database: ${DB}`);
await admin.connect();
await run(admin, `DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
await run(admin, `CREATE DATABASE ${DB}`);

// A working directory whose `migrations/` holds the chain up to 0014 only, so the runner stops
// exactly where 0015 must decide.
rmSync(WORK, { recursive: true, force: true });
mkdirSync(join(WORK, "migrations"), { recursive: true });
for (const file of readdirSync(join(PROJECT, "migrations")).sort()) {
  if (file.endsWith(".sql") && file < MIGRATION) {
    symlinkSync(join(PROJECT, "migrations", file), join(WORK, "migrations", file));
  }
}
if (!existsSync(join(WORK, ".env.local"))) symlinkSync(join(PROJECT, ".env.local"), join(WORK, ".env.local"));
// `--import tsx` resolves from the working directory, so the loader has to be reachable there.
symlinkSync(join(PROJECT, "node_modules"), join(WORK, "node_modules"));

execFileSync("node", ["--import", "tsx", join(PROJECT, "scripts/migrate.ts")], {
  cwd: WORK,
  env: { ...process.env, DATABASE_URL: scratch, DATABASE_URL_UNPOOLED: scratch },
  stdio: ["ignore", "inherit", "inherit"],
});

const sql0015 = readFileSync(join(PROJECT, "migrations", MIGRATION), "utf8");
const client = new Client({ connectionString: scratch });
await client.connect();

const applied = await run(client, "SELECT count(*)::int n FROM schema_migrations");
const officeCars = await run(client, "SELECT count(*)::int n FROM office_car");
console.log(`\nchain applied: ${applied.rows[0].n} migrations · office_car holds ${officeCars.rows[0].n} row(s)`);

// --- 1. a row the one table has no ref for ----------------------------------
await run(client, "INSERT INTO office_car (ref, brand, model, state) VALUES ('TS-9999', 'Test', 'Car', 'Available')");
console.log("\ninserted office_car(ref = 'TS-9999') — no car carries that ref");

let refused = false;
let message = "";
await run(client, "BEGIN");
try {
  await run(client, sql0015);
  await run(client, "COMMIT");
} catch (err) {
  await run(client, "ROLLBACK");
  refused = true;
  message = err.message;
}
const stillThere = await run(client, "SELECT to_regclass('office_car') IS NOT NULL AS there");
console.log(`  applying 0015 … ${refused ? "REFUSED" : "did not refuse"}`);
console.log(`  message: ${message.split("\n")[0]}`);
console.log(`  office_car still present after the refusal: ${stillThere.rows[0].there}`);

// --- 2. the row removed ------------------------------------------------------
await run(client, "DELETE FROM office_car WHERE ref = 'TS-9999'");
const remaining = await run(client, "SELECT count(*)::int n FROM office_car");
console.log(`\nremoved the row — office_car now holds ${remaining.rows[0].n} row(s), every ref present in \`car\``);

await run(client, "BEGIN");
await run(client, sql0015);
await run(client, "COMMIT");
const gone = await run(client, "SELECT to_regclass('office_car') IS NULL AS gone");
console.log(`  applying 0015 … applied`);
console.log(`  office_car absent: ${gone.rows[0].gone}`);

const ok =
  refused &&
  message.includes("0015 refuses") &&
  stillThere.rows[0].there === true &&
  gone.rows[0].gone === true;
console.log(
  `\nverdict: ${ok ? "the guard holds and the drop lands" : "THE PROOF FAILED — read the lines above"}`,
);

await client.end();
await run(admin, `DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
console.log(`dropped ${DB}`);
await admin.end();
rmSync(WORK, { recursive: true, force: true });
process.exit(ok ? 0 : 1);
