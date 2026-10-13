// Task 21 — the store's refusals, proved (task.md benchmarks 4 and 5).
//
//   (4) a car stored with two lines of the same kind, or a state with no section, or two states
//       sharing a name  → the database refuses the row.
//   (5) a state deleted while a car sits in it → the store refuses, and the refusal names itself,
//       so the office can say why.
//
// Nothing here runs against the owner's store. The whole chain and the seed run on their own
// scratch database, every attempt happens inside a savepoint, and the lot is rolled back and the
// database dropped. Each refusal is judged on four things, not one:
//
//   · it was refused            (an error came back)
//   · the right rule refused it (the SQLSTATE and the constraint name say which)
//   · it changed nothing        (the row is not there afterwards — "refused" is not "quietly taken")
//   · the parent survived       (a refused delete left the state and its car exactly as they were)
//
// Run:  node --env-file=.env.local developer-workspace/scripts/task-003/refusals.mjs

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

const DB = "truespec_scratch_003d";
const PROJECT = process.cwd();
const WORK = "/tmp/opencode/mig-003d";
const RUNS = join(PROJECT, "developer-workspace/scripts/task-003/runs/task-21");

const base = new URL(process.env.DATABASE_URL);
const scratchUrl = new URL(base);
scratchUrl.pathname = `/${DB}`;
const scratch = scratchUrl.toString();

mkdirSync(RUNS, { recursive: true });

const admin = new Client({ connectionString: base.toString() });
await admin.connect();
await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
await admin.query(`CREATE DATABASE ${DB}`);
console.log(`scratch database: ${DB}`);

// --- the chain, then the seed, on the scratch store --------------------------
// The migration runner reads `migrations/` from the working directory, and `--import tsx` resolves
// the loader from there too, so the run happens in a prepared temp directory.
rmSync(WORK, { recursive: true, force: true });
mkdirSync(join(WORK, "migrations"), { recursive: true });
for (const file of readdirSync(join(PROJECT, "migrations")).sort()) {
  if (file.endsWith(".sql")) symlinkSync(join(PROJECT, "migrations", file), join(WORK, "migrations", file));
}
if (!existsSync(join(WORK, ".env.local"))) symlinkSync(join(PROJECT, ".env.local"), join(WORK, ".env.local"));
symlinkSync(join(PROJECT, "node_modules"), join(WORK, "node_modules"));

execFileSync("node", ["--import", "tsx", join(PROJECT, "scripts/migrate.ts")], {
  cwd: WORK,
  env: { ...process.env, DATABASE_URL: scratch, DATABASE_URL_UNPOOLED: scratch },
  stdio: ["ignore", "inherit", "inherit"],
});

// The seed runs from the project root (it reads its own manifest) with the scratch store in env.
// dotenv never overrides what is already set, so the child's DATABASE_URL wins.
execFileSync("node", ["--import", "tsx", join(PROJECT, "scripts/seed.ts")], {
  cwd: PROJECT,
  env: { ...process.env, DATABASE_URL: scratch, DATABASE_URL_UNPOOLED: scratch },
  stdio: ["ignore", "inherit", "inherit"],
});

const c = new Client({ connectionString: scratch });
await c.connect();

const one = async (sql, params) => (await c.query(sql, params)).rows[0];
const count = async (sql, params) => Number((await one(sql, params)).n);

const seeded = {
  cars: await count("SELECT count(*)::int n FROM car"),
  states: await count("SELECT count(*)::int n FROM car_state"),
  costLines: await count("SELECT count(*)::int n FROM cost_line"),
  enquiries: await count("SELECT count(*)::int n FROM enquiry"),
  enquiryStates: await count("SELECT count(*)::int n FROM enquiry_state"),
};
console.log(
  `seeded: ${seeded.cars} cars · ${seeded.states} car states · ${seeded.costLines} cost lines · ` +
    `${seeded.enquiries} enquiries · ${seeded.enquiryStates} enquiry states\n`,
);

// The rows the attempts lean on — drawn from the seeded store, so nothing about a column is guessed.
const theCar = await one("SELECT id, ref, state_id FROM car WHERE ref = 'TS-1001'");
const oneLine = await one("SELECT * FROM cost_line WHERE car_id = $1 LIMIT 1", [theCar.id]);
const aState = await one("SELECT id, label FROM car_state WHERE id = $1", [theCar.state_id]);
const anEnquiry = await one("SELECT id, enquiry_state_id FROM enquiry ORDER BY created_at LIMIT 1");
const anEnquiryState = await one("SELECT id, label FROM enquiry_state WHERE id = $1", [
  anEnquiry.enquiry_state_id,
]);

// --- the battery -------------------------------------------------------------
// Each attempt is its own savepoint. An error inside a transaction poisons it until the savepoint
// is rolled back, so every case ends by rolling back to its own mark — which is also what proves
// the attempt changed nothing.
let caseNo = 0;
const results = [];

async function attempt({ benchmark, claim, expected, sql, params, verifyUnchanged }) {
  caseNo += 1;
  const mark = `s${caseNo}`;
  const before = await verifyUnchanged();
  await c.query(`SAVEPOINT ${mark}`);
  let refused = false;
  let code = "";
  let constraint = "";
  let message = "";
  let acceptedWith = null;
  try {
    const r = await c.query(sql, params);
    acceptedWith = r.rowCount;
  } catch (err) {
    refused = true;
    code = err.code ?? "";
    constraint = err.constraint ?? "";
    message = (err.message ?? "").split("\n")[0];
  } finally {
    await c.query(`ROLLBACK TO SAVEPOINT ${mark}`);
  }
  const after = await verifyUnchanged();
  const unchanged = after === before;
  const right = refused && (!expected.code || code === expected.code) && (!expected.constraint || constraint === expected.constraint);

  results.push({
    benchmark,
    claim,
    refused,
    code,
    constraint,
    message,
    acceptedWith,
    changedSomething: !unchanged,
    before,
    after,
    expected,
    verdict: right && unchanged ? "REFUSED, as it must be" : "NOT PROVEN",
  });

  console.log(`[${benchmark}] ${claim}`);
  console.log(`    ${right && unchanged ? "refused" : "NOT refused as expected"}` +
    (refused ? ` — SQLSTATE ${code || "(none)"}${constraint ? ` · constraint ${constraint}` : ""}` : ""));
  if (message) console.log(`    the store's words: ${message}`);
  console.log(`    nothing changed: ${unchanged} (before ${before}, after ${after})`);
  if (acceptedWith !== null) console.log(`    !! the store ACCEPTED it (rowCount ${acceptedWith})`);
  console.log();
}

await c.query("BEGIN");

// (4a) a second cost line of a kind the car already has
const lineCols = Object.keys(oneLine).filter((k) => k !== "id");
await attempt({
  benchmark: 4,
  claim: `a car gets a second cost line of kind '${oneLine.kind}'`,
  expected: { code: "23505", constraint: "cost_line_car_kind_unique" },
  sql: `INSERT INTO cost_line (${lineCols.join(", ")}) VALUES (${lineCols.map((_, i) => `$${i + 1}`).join(", ")})`,
  params: lineCols.map((k) => oneLine[k]),
  verifyUnchanged: () => count("SELECT count(*)::int n FROM cost_line WHERE car_id = $1 AND kind = $2", [theCar.id, oneLine.kind]),
});

// (4b) a state with no section
await attempt({
  benchmark: 4,
  claim: "a car state is stored with no section",
  expected: { code: "23502" },
  sql: "INSERT INTO car_state (label, section, colour, is_new_arrival) VALUES ($1, NULL, $2, false)",
  params: ["Refusal probe — no section", "#123456"],
  verifyUnchanged: () => count("SELECT count(*)::int n FROM car_state WHERE label = $1", ["Refusal probe — no section"]),
});

// (4c) a state whose section is not one of the three
await attempt({
  benchmark: 4,
  claim: "a car state is stored with a section that is not one of the three",
  expected: { code: "23514" },
  sql: "INSERT INTO car_state (label, section, colour, is_new_arrival) VALUES ($1, $2, $3, false)",
  params: ["Refusal probe — bad section", "waiting", "#123456"],
  verifyUnchanged: () => count("SELECT count(*)::int n FROM car_state WHERE label = $1", ["Refusal probe — bad section"]),
});

// (4d) two states sharing a name
await attempt({
  benchmark: 4,
  claim: `a second car state is stored with the name '${aState.label}', which one already carries`,
  expected: { code: "23505", constraint: "car_state_label_unique" },
  sql: "INSERT INTO car_state (label, section, colour, is_new_arrival) VALUES ($1, 'available', $2, false)",
  params: [aState.label, "#654321"],
  verifyUnchanged: () => count("SELECT count(*)::int n FROM car_state WHERE label = $1", [aState.label]),
});

// (4e) the same again for the office's own state list, so the rule is not one registry's habit
await attempt({
  benchmark: 4,
  claim: `a second enquiry state is stored with the name '${anEnquiryState.label}'`,
  expected: { code: "23505" },
  sql: "INSERT INTO enquiry_state (label, colour) VALUES ($1, $2)",
  params: [anEnquiryState.label, "#abcdef"],
  verifyUnchanged: () => count("SELECT count(*)::int n FROM enquiry_state"),
});

// (5a) deleting the state a car sits in
// `ON DELETE RESTRICT` refuses with SQLSTATE 23001 (restrict_violation). 23503 is the code for a
// NO ACTION constraint checked at the end of the statement — measured here on 2026-10-13, after
// the expectation was written the other way round and the store was right.
const carsInThatState = await count("SELECT count(*)::int n FROM car WHERE state_id = $1", [aState.id]);
await attempt({
  benchmark: 5,
  claim: `the state '${aState.label}' is deleted while ${carsInThatState} car(s) sit in it`,
  expected: { code: "23001", constraint: "car_state_id_fkey" },
  sql: "DELETE FROM car_state WHERE id = $1",
  params: [aState.id],
  verifyUnchanged: () => count("SELECT count(*)::int n FROM car_state WHERE id = $1", [aState.id]),
});

// (5b) the same for an enquiry's state
const enquiriesInThatState = await count(
  "SELECT count(*)::int n FROM enquiry WHERE enquiry_state_id = $1",
  [anEnquiryState.id],
);
await attempt({
  benchmark: 5,
  claim: `the enquiry state '${anEnquiryState.label}' is deleted while ${enquiriesInThatState} enquiry(ies) sit in it`,
  expected: { code: "23001", constraint: "enquiry_enquiry_state_id_fkey" },
  sql: "DELETE FROM enquiry_state WHERE id = $1",
  params: [anEnquiryState.id],
  verifyUnchanged: () => count("SELECT count(*)::int n FROM enquiry_state WHERE id = $1", [anEnquiryState.id]),
});

await c.query("ROLLBACK");

// --- nothing was left behind -------------------------------------------------
const after = {
  cars: await count("SELECT count(*)::int n FROM car"),
  states: await count("SELECT count(*)::int n FROM car_state"),
  costLines: await count("SELECT count(*)::int n FROM cost_line"),
  enquiries: await count("SELECT count(*)::int n FROM enquiry"),
  enquiryStates: await count("SELECT count(*)::int n FROM enquiry_state"),
};
const untouched = JSON.stringify(seeded) === JSON.stringify(after);
console.log(`the scratch store after every attempt, rolled back: ${JSON.stringify(after)}`);
console.log(`untouched by the whole battery: ${untouched}`);

const allRefused = results.every((r) => r.verdict === "REFUSED, as it must be");
const ok = allRefused && untouched;

writeFileSync(
  join(RUNS, "refusals.json"),
  JSON.stringify(
    { ranAt: new Date().toISOString(), database: DB, seeded, after, untouched, results, allRefused, ok },
    null,
    2,
  ) + "\n",
);
console.log(`\nverdict: ${ok ? "every refusal held, and nothing moved" : "THE PROOF FAILED — read the lines above"}`);

await c.end();
await admin.query(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);
console.log(`dropped ${DB}`);
await admin.end();
rmSync(WORK, { recursive: true, force: true });
process.exit(ok ? 0 : 1);
